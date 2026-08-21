from django.db import transaction
from common.services import BaseService
from common.exceptions import BusinessException, ResourceNotFoundException, ValidationException
from apps.audit.services.audit_service import AuditService
from ..models import Tenant, EmergencyContact, Guarantor


class TenantService(BaseService):
    """
    Business logic for tenants management.
    Enforces multi-tenant isolation, data integrity with leases, and audit logging.
    """

    @classmethod
    @transaction.atomic
    def create_tenant(
        cls,
        owner,
        validated_data: dict,
        emergency_contacts_data: list = None,
        ip_address: str = None
    ) -> Tenant:
        effective_owner = owner.get_effective_owner()
        emergency_contacts = emergency_contacts_data or validated_data.pop('emergency_contacts', None)

        tenant = Tenant.objects.create(
            owner=effective_owner,
            **validated_data
        )

        if emergency_contacts:
            for contact in emergency_contacts:
                EmergencyContact.objects.create(tenant=tenant, **contact)

        AuditService.log_action(
            user=owner,
            action='CREATE',
            resource_type='Tenant',
            resource_id=str(tenant.id),
            changes={'name': tenant.full_name, 'phone': tenant.phone_number, 'type': tenant.tenant_type},
            ip_address=ip_address
        )

        return tenant

    @classmethod
    @transaction.atomic
    def update_tenant(
        cls,
        owner,
        tenant_id: str,
        validated_data: dict,
        ip_address: str = None
    ) -> Tenant:
        effective_owner = owner.get_effective_owner()
        try:
            tenant = Tenant.objects.get(id=tenant_id, owner=effective_owner, is_active=True)
        except Tenant.DoesNotExist:
            raise ResourceNotFoundException("Locataire introuvable.", code="TENANT_NOT_FOUND")

        validated_data.pop('emergency_contacts', None)
        for key, value in validated_data.items():
            setattr(tenant, key, value)
        tenant.save()

        AuditService.log_action(
            user=owner,
            action='UPDATE',
            resource_type='Tenant',
            resource_id=str(tenant.id),
            changes=validated_data,
            ip_address=ip_address
        )

        return tenant

    @classmethod
    @transaction.atomic
    def add_emergency_contact(
        cls,
        owner,
        tenant_id: str,
        contact_data: dict,
        ip_address: str = None
    ) -> EmergencyContact:
        effective_owner = owner.get_effective_owner()
        try:
            tenant = Tenant.objects.get(id=tenant_id, owner=effective_owner, is_active=True)
        except Tenant.DoesNotExist:
            raise ResourceNotFoundException("Locataire introuvable.", code="TENANT_NOT_FOUND")

        contact = EmergencyContact.objects.create(
            tenant=tenant,
            name=contact_data.get('name'),
            relationship=contact_data.get('relationship', ''),
            phone_number=contact_data.get('phone_number')
        )

        AuditService.log_action(
            user=owner,
            action='CREATE',
            resource_type='EmergencyContact',
            resource_id=str(contact.id),
            changes={'tenant_id': str(tenant.id), 'name': contact.name},
            ip_address=ip_address
        )

        return contact

    @classmethod
    @transaction.atomic
    def delete_tenant(cls, owner, tenant_id: str, ip_address: str = None) -> None:
        effective_owner = owner.get_effective_owner()
        try:
            tenant = Tenant.objects.get(id=tenant_id, owner=effective_owner, is_active=True)
        except Tenant.DoesNotExist:
            raise ResourceNotFoundException("Locataire introuvable.", code="TENANT_NOT_FOUND")

        # Check if tenant has an active lease
        has_active_lease = tenant.leases.filter(status='ACTIVE', is_active=True).exists()
        if has_active_lease:
            raise BusinessException(
                "Impossible de supprimer ce locataire car un contrat de bail est actuellement en cours. Veuillez d'abord résilier le bail.",
                code="TENANT_HAS_ACTIVE_LEASE"
            )

        tenant.soft_delete()

        AuditService.log_action(
            user=owner,
            action='DELETE',
            resource_type='Tenant',
            resource_id=str(tenant.id),
            changes={'soft_deleted': True},
            ip_address=ip_address
        )
