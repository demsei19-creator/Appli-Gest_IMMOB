from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from common.services import BaseService
from common.exceptions import ResourceNotFoundException, BusinessException
from common.utils.financial import quantize_amount
from apps.audit.services.audit_service import AuditService
from apps.properties.models import Property, Unit
from ..models import MaintenanceRequest, Supplier
from ..constants import MaintenanceStatus, MaintenancePriority


class MaintenanceService(BaseService):
    """
    Business operations for Maintenance requests, craftsperson assignment and supplier directory.
    """

    @classmethod
    @transaction.atomic
    def create_maintenance_request(cls, owner, validated_data: dict, ip_address: str = None) -> MaintenanceRequest:
        effective_owner = owner.get_effective_owner()
        property_obj = validated_data.get('property')
        unit = validated_data.get('unit')
        supplier = validated_data.get('supplier')

        if property_obj.owner != effective_owner:
            raise ResourceNotFoundException("Immeuble introuvable pour ce propriétaire.", code="PROPERTY_NOT_FOUND")

        if unit and unit.property != property_obj:
            raise BusinessException("Le logement sélectionné n'appartient pas à cet immeuble.", code="INVALID_UNIT")

        if supplier and supplier.owner != effective_owner:
            raise ResourceNotFoundException("Fournisseur introuvable pour ce propriétaire.", code="SUPPLIER_NOT_FOUND")

        status_val = validated_data.get('status', MaintenanceStatus.REPORTED)
        if supplier and status_val == MaintenanceStatus.REPORTED:
            status_val = MaintenanceStatus.ASSIGNED

        validated_data['status'] = status_val

        req = MaintenanceRequest.objects.create(
            owner=effective_owner,
            **validated_data
        )

        AuditService.log_action(
            user=owner,
            action='CREATE',
            resource_type='MaintenanceRequest',
            resource_id=str(req.id),
            changes={
                'ticket_number': req.ticket_number,
                'title': req.title,
                'priority': req.priority,
                'property': property_obj.name,
                'status': req.status
            },
            ip_address=ip_address
        )

        return req

    @classmethod
    @transaction.atomic
    def update_maintenance_request(cls, owner, request_id: str, validated_data: dict, ip_address: str = None) -> MaintenanceRequest:
        effective_owner = owner.get_effective_owner()
        try:
            req = MaintenanceRequest.objects.get(id=request_id, owner=effective_owner, is_active=True)
        except MaintenanceRequest.DoesNotExist:
            raise ResourceNotFoundException("Ticket d'intervention introuvable.", code="MAINTENANCE_NOT_FOUND")

        for key, value in validated_data.items():
            setattr(req, key, value)
        req.save()

        AuditService.log_action(
            user=owner,
            action='UPDATE',
            resource_type='MaintenanceRequest',
            resource_id=str(req.id),
            changes=validated_data,
            ip_address=ip_address
        )

        return req

    @classmethod
    @transaction.atomic
    def assign_supplier(
        cls,
        owner,
        request_id: str,
        supplier_id: str,
        estimated_cost: Decimal = None,
        ip_address: str = None
    ) -> MaintenanceRequest:
        effective_owner = owner.get_effective_owner()
        try:
            req = MaintenanceRequest.objects.get(id=request_id, owner=effective_owner, is_active=True)
        except MaintenanceRequest.DoesNotExist:
            raise ResourceNotFoundException("Ticket d'intervention introuvable.", code="MAINTENANCE_NOT_FOUND")

        try:
            supplier = Supplier.objects.get(id=supplier_id, owner=effective_owner, is_active=True)
        except Supplier.DoesNotExist:
            raise ResourceNotFoundException("Fournisseur introuvable.", code="SUPPLIER_NOT_FOUND")

        req.supplier = supplier
        req.status = MaintenanceStatus.ASSIGNED
        if estimated_cost is not None:
            req.estimated_cost = quantize_amount(estimated_cost)
        req.save(update_fields=['supplier', 'status', 'estimated_cost', 'updated_at'])

        AuditService.log_action(
            user=owner,
            action='UPDATE',
            resource_type='MaintenanceRequest',
            resource_id=str(req.id),
            changes={
                'action': 'ASSIGN_SUPPLIER',
                'supplier': supplier.name,
                'estimated_cost': str(estimated_cost)
            },
            ip_address=ip_address
        )

        return req

    @classmethod
    @transaction.atomic
    def update_status(
        cls,
        owner,
        request_id: str,
        status: str,
        actual_cost: Decimal = None,
        completed_date=None,
        notes: str = None,
        ip_address: str = None
    ) -> MaintenanceRequest:
        effective_owner = owner.get_effective_owner()
        try:
            req = MaintenanceRequest.objects.get(id=request_id, owner=effective_owner, is_active=True)
        except MaintenanceRequest.DoesNotExist:
            raise ResourceNotFoundException("Ticket d'intervention introuvable.", code="MAINTENANCE_NOT_FOUND")

        req.status = status
        update_fields = ['status', 'updated_at']

        if actual_cost is not None:
            req.actual_cost = quantize_amount(actual_cost)
            update_fields.append('actual_cost')

        if status == MaintenanceStatus.COMPLETED:
            req.completed_date = completed_date or timezone.now().date()
            update_fields.append('completed_date')

        if notes:
            req.description = f"{req.description}\n[Note {timezone.now().date()}]: {notes}".strip()
            update_fields.append('description')

        req.save(update_fields=update_fields)

        AuditService.log_action(
            user=owner,
            action='UPDATE',
            resource_type='MaintenanceRequest',
            resource_id=str(req.id),
            changes={'status': status, 'actual_cost': str(actual_cost)},
            ip_address=ip_address
        )

        return req

    @classmethod
    @transaction.atomic
    def delete_maintenance_request(cls, owner, request_id: str, ip_address: str = None) -> None:
        effective_owner = owner.get_effective_owner()
        try:
            req = MaintenanceRequest.objects.get(id=request_id, owner=effective_owner, is_active=True)
        except MaintenanceRequest.DoesNotExist:
            raise ResourceNotFoundException("Ticket d'intervention introuvable.", code="MAINTENANCE_NOT_FOUND")

        req.soft_delete()

        AuditService.log_action(
            user=owner,
            action='DELETE',
            resource_type='MaintenanceRequest',
            resource_id=str(req.id),
            changes={'soft_deleted': True},
            ip_address=ip_address
        )

    # --------------------------------------------------------------------------
    # SUPPLIER CRUD
    # --------------------------------------------------------------------------

    @classmethod
    @transaction.atomic
    def create_supplier(cls, owner, validated_data: dict, ip_address: str = None) -> Supplier:
        effective_owner = owner.get_effective_owner()
        supplier = Supplier.objects.create(
            owner=effective_owner,
            **validated_data
        )

        AuditService.log_action(
            user=owner,
            action='CREATE',
            resource_type='Supplier',
            resource_id=str(supplier.id),
            changes={'name': supplier.name, 'category': supplier.category},
            ip_address=ip_address
        )

        return supplier

    @classmethod
    @transaction.atomic
    def update_supplier(cls, owner, supplier_id: str, validated_data: dict, ip_address: str = None) -> Supplier:
        effective_owner = owner.get_effective_owner()
        try:
            supplier = Supplier.objects.get(id=supplier_id, owner=effective_owner, is_active=True)
        except Supplier.DoesNotExist:
            raise ResourceNotFoundException("Fournisseur introuvable.", code="SUPPLIER_NOT_FOUND")

        for key, value in validated_data.items():
            setattr(supplier, key, value)
        supplier.save()

        AuditService.log_action(
            user=owner,
            action='UPDATE',
            resource_type='Supplier',
            resource_id=str(supplier.id),
            changes=validated_data,
            ip_address=ip_address
        )

        return supplier

    @classmethod
    @transaction.atomic
    def delete_supplier(cls, owner, supplier_id: str, ip_address: str = None) -> None:
        effective_owner = owner.get_effective_owner()
        try:
            supplier = Supplier.objects.get(id=supplier_id, owner=effective_owner, is_active=True)
        except Supplier.DoesNotExist:
            raise ResourceNotFoundException("Fournisseur introuvable.", code="SUPPLIER_NOT_FOUND")

        supplier.soft_delete()

        AuditService.log_action(
            user=owner,
            action='DELETE',
            resource_type='Supplier',
            resource_id=str(supplier.id),
            changes={'soft_deleted': True},
            ip_address=ip_address
        )
