from django.db import transaction
from common.services import BaseService
from common.exceptions import BusinessException, ResourceNotFoundException, ValidationException
from apps.audit.services.audit_service import AuditService
from ..models import Property, Unit
from ..constants import UnitStatus


class UnitService(BaseService):
    """
    Business operations for Lots / Logements (Units).
    Enforces multi-tenant owner isolation and integrity with active leases.
    """

    @classmethod
    @transaction.atomic
    def create_unit(cls, owner, property_id: str, validated_data: dict, ip_address: str = None) -> Unit:
        effective_owner = owner.get_effective_owner()
        try:
            property_obj = Property.objects.get(id=property_id, owner=effective_owner, is_active=True)
        except Property.DoesNotExist:
            raise ResourceNotFoundException("Immeuble introuvable.", code="PROPERTY_NOT_FOUND")

        unit_number = validated_data.get('unit_number')
        if Unit.objects.filter(property=property_obj, unit_number__iexact=unit_number, is_active=True).exists():
            raise ValidationException(
                f"Le lot numéro '{unit_number}' existe déjà dans cet immeuble.",
                code="UNIT_NUMBER_ALREADY_EXISTS"
            )

        unit = Unit.objects.create(
            property=property_obj,
            **validated_data
        )

        AuditService.log_action(
            user=owner,
            action='CREATE',
            resource_type='Unit',
            resource_id=str(unit.id),
            changes={'property_id': str(property_obj.id), 'unit_number': unit.unit_number, 'rent': str(unit.total_rent_amount)},
            ip_address=ip_address
        )

        return unit

    @classmethod
    @transaction.atomic
    def update_unit(cls, owner, unit_id: str, validated_data: dict, ip_address: str = None) -> Unit:
        effective_owner = owner.get_effective_owner()
        try:
            unit = Unit.objects.select_related('property').get(
                id=unit_id,
                property__owner=effective_owner,
                is_active=True
            )
        except Unit.DoesNotExist:
            raise ResourceNotFoundException("Logement introuvable.", code="UNIT_NOT_FOUND")

        new_unit_number = validated_data.get('unit_number')
        if new_unit_number and new_unit_number.lower() != unit.unit_number.lower():
            if Unit.objects.filter(property=unit.property, unit_number__iexact=new_unit_number, is_active=True).exclude(id=unit.id).exists():
                raise ValidationException(
                    f"Le lot numéro '{new_unit_number}' existe déjà dans cet immeuble.",
                    code="UNIT_NUMBER_ALREADY_EXISTS"
                )

        for key, value in validated_data.items():
            setattr(unit, key, value)
        unit.save()

        AuditService.log_action(
            user=owner,
            action='UPDATE',
            resource_type='Unit',
            resource_id=str(unit.id),
            changes=validated_data,
            ip_address=ip_address
        )

        return unit

    @classmethod
    @transaction.atomic
    def update_unit_status(cls, owner, unit_id: str, new_status: str, reason: str = None, ip_address: str = None) -> Unit:
        effective_owner = owner.get_effective_owner()
        try:
            unit = Unit.objects.select_related('property').get(
                id=unit_id,
                property__owner=effective_owner,
                is_active=True
            )
        except Unit.DoesNotExist:
            raise ResourceNotFoundException("Logement introuvable.", code="UNIT_NOT_FOUND")

        has_active_lease = unit.leases.filter(status='ACTIVE', is_active=True).exists()

        if new_status == UnitStatus.VACANT and has_active_lease:
            raise BusinessException(
                "Impossible de marquer le lot comme 'Disponible' car un contrat de bail est toujours actif. Résiliez d'abord le bail en cours.",
                code="CANNOT_SET_VACANT_WITH_ACTIVE_LEASE"
            )

        old_status = unit.status
        unit.status = new_status
        unit.save(update_fields=['status', 'updated_at'])

        AuditService.log_action(
            user=owner,
            action='UPDATE',
            resource_type='Unit',
            resource_id=str(unit.id),
            changes={'old_status': old_status, 'new_status': new_status, 'reason': reason},
            ip_address=ip_address
        )

        return unit

    @classmethod
    @transaction.atomic
    def delete_unit(cls, owner, unit_id: str, ip_address: str = None) -> None:
        effective_owner = owner.get_effective_owner()
        try:
            unit = Unit.objects.select_related('property').get(
                id=unit_id,
                property__owner=effective_owner,
                is_active=True
            )
        except Unit.DoesNotExist:
            raise ResourceNotFoundException("Logement introuvable.", code="UNIT_NOT_FOUND")

        has_active_lease = unit.leases.filter(status='ACTIVE', is_active=True).exists()
        if has_active_lease:
            raise BusinessException(
                "Impossible de supprimer ce logement car un contrat de bail est actuellement en cours.",
                code="UNIT_HAS_ACTIVE_LEASE"
            )

        unit.soft_delete()

        AuditService.log_action(
            user=owner,
            action='DELETE',
            resource_type='Unit',
            resource_id=str(unit.id),
            changes={'soft_deleted': True},
            ip_address=ip_address
        )
