from django.db import transaction
from common.services import BaseService
from common.exceptions import BusinessException, ResourceNotFoundException
from apps.audit.services.audit_service import AuditService
from ..models import Property, Unit
from ..constants import UnitStatus


class PropertyService(BaseService):
    """
    Business operations for Properties / Immeubles.
    Enforces multi-tenant owner isolation, data integrity, and audit trail.
    """

    @classmethod
    @transaction.atomic
    def create_property(cls, owner, validated_data: dict, ip_address: str = None) -> Property:
        effective_owner = owner.get_effective_owner()
        property_obj = Property.objects.create(
            owner=effective_owner,
            **validated_data
        )

        AuditService.log_action(
            user=owner,
            action='CREATE',
            resource_type='Property',
            resource_id=str(property_obj.id),
            changes={'name': property_obj.name, 'code': property_obj.code, 'city': property_obj.city},
            ip_address=ip_address
        )

        return property_obj

    @classmethod
    @transaction.atomic
    def update_property(cls, owner, property_id: str, validated_data: dict, ip_address: str = None) -> Property:
        effective_owner = owner.get_effective_owner()
        try:
            property_obj = Property.objects.get(id=property_id, owner=effective_owner, is_active=True)
        except Property.DoesNotExist:
            raise ResourceNotFoundException("Immeuble ou bien introuvable.", code="PROPERTY_NOT_FOUND")

        for key, value in validated_data.items():
            setattr(property_obj, key, value)
        property_obj.save()

        AuditService.log_action(
            user=owner,
            action='UPDATE',
            resource_type='Property',
            resource_id=str(property_obj.id),
            changes=validated_data,
            ip_address=ip_address
        )

        return property_obj

    @classmethod
    @transaction.atomic
    def delete_property(cls, owner, property_id: str, ip_address: str = None) -> None:
        effective_owner = owner.get_effective_owner()
        try:
            property_obj = Property.objects.get(id=property_id, owner=effective_owner, is_active=True)
        except Property.DoesNotExist:
            raise ResourceNotFoundException("Immeuble ou bien introuvable.", code="PROPERTY_NOT_FOUND")

        # Check if any unit in this property has an active lease (Rule 7 & 28)
        has_active_leases = Unit.objects.filter(
            property=property_obj,
            is_active=True,
            leases__status='ACTIVE',
            leases__is_active=True
        ).exists()

        if has_active_leases:
            raise BusinessException(
                "Impossible de supprimer cet ensemble immobilier car un ou plusieurs lots possèdent un contrat de bail actif.",
                code="PROPERTY_HAS_ACTIVE_LEASES"
            )

        # Soft delete all units and the property
        property_obj.units.filter(is_active=True).update(is_active=False)
        property_obj.soft_delete()

        AuditService.log_action(
            user=owner,
            action='DELETE',
            resource_type='Property',
            resource_id=str(property_obj.id),
            changes={'soft_deleted': True},
            ip_address=ip_address
        )
