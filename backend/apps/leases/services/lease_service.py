from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from common.services import BaseService
from common.exceptions import BusinessException, ResourceNotFoundException, ValidationException
from apps.audit.services.audit_service import AuditService
from apps.properties.constants import UnitStatus
from ..constants import LeaseStatus, DepositStatus
from ..models import Lease, Deposit


class LeaseService(BaseService):
    """
    Business operations for Lease contracts & Security deposits.
    Enforces multi-tenant isolation, unit occupancy synchronization, and audit logging.
    """

    @classmethod
    @transaction.atomic
    def create_lease(cls, owner, validated_data: dict, ip_address: str = None) -> Lease:
        effective_owner = owner.get_effective_owner()
        unit = validated_data.get('unit')
        status = validated_data.get('status', LeaseStatus.DRAFT)

        # Check unit owner
        if unit.property.owner != effective_owner:
            raise ResourceNotFoundException("Logement introuvable pour ce propriétaire.", code="UNIT_NOT_FOUND")

        # If lease is created as ACTIVE, verify unit is not already occupied
        if status == LeaseStatus.ACTIVE:
            has_active_lease = Lease.objects.filter(
                unit=unit,
                status=LeaseStatus.ACTIVE,
                is_active=True
            ).exists()

            if has_active_lease:
                raise BusinessException(
                    "Ce logement possède déjà un contrat de bail actif.",
                    code="UNIT_ALREADY_OCCUPIED"
                )

        lease = Lease.objects.create(
            owner=effective_owner,
            **validated_data
        )

        # Automatically create linked Deposit record
        deposit_amount = lease.deposit_amount or Decimal('0.00')
        Deposit.objects.create(
            lease=lease,
            amount=deposit_amount,
            status=DepositStatus.PENDING
        )

        # If created as ACTIVE, immediately switch unit status to OCCUPIED
        if status == LeaseStatus.ACTIVE:
            unit.status = UnitStatus.OCCUPIED
            unit.save(update_fields=['status', 'updated_at'])

        AuditService.log_action(
            user=owner,
            action='CREATE',
            resource_type='Lease',
            resource_id=str(lease.id),
            changes={
                'lease_number': lease.lease_number,
                'tenant': lease.tenant.full_name,
                'unit': lease.unit.unit_number,
                'rent': str(lease.total_monthly_amount),
                'status': lease.status
            },
            ip_address=ip_address
        )

        return lease

    @classmethod
    @transaction.atomic
    def activate_lease(cls, owner, lease_id: str, ip_address: str = None) -> Lease:
        effective_owner = owner.get_effective_owner()
        try:
            lease = Lease.objects.select_related('unit__property').get(
                id=lease_id,
                owner=effective_owner,
                is_active=True
            )
        except Lease.DoesNotExist:
            raise ResourceNotFoundException("Contrat de bail introuvable.", code="LEASE_NOT_FOUND")

        if lease.status == LeaseStatus.ACTIVE:
            return lease

        # Check if unit is already occupied by another active lease
        has_active_lease = Lease.objects.filter(
            unit=lease.unit,
            status=LeaseStatus.ACTIVE,
            is_active=True
        ).exclude(id=lease.id).exists()

        if has_active_lease:
            raise BusinessException(
                "Impossible d'activer ce bail : le logement est déjà occupé par un autre contrat actif.",
                code="UNIT_ALREADY_OCCUPIED"
            )

        lease.status = LeaseStatus.ACTIVE
        lease.save(update_fields=['status', 'updated_at'])

        lease.unit.status = UnitStatus.OCCUPIED
        lease.unit.save(update_fields=['status', 'updated_at'])

        AuditService.log_action(
            user=owner,
            action='UPDATE',
            resource_type='Lease',
            resource_id=str(lease.id),
            changes={'status': LeaseStatus.ACTIVE, 'action': 'ACTIVATE'},
            ip_address=ip_address
        )

        return lease

    @classmethod
    @transaction.atomic
    def update_lease(cls, owner, lease_id: str, validated_data: dict, ip_address: str = None) -> Lease:
        effective_owner = owner.get_effective_owner()
        try:
            lease = Lease.objects.get(id=lease_id, owner=effective_owner, is_active=True)
        except Lease.DoesNotExist:
            raise ResourceNotFoundException("Contrat de bail introuvable.", code="LEASE_NOT_FOUND")

        for key, value in validated_data.items():
            setattr(lease, key, value)
        lease.save()

        # If deposit amount was updated and deposit is still pending, update deposit amount
        if hasattr(lease, 'deposit') and lease.deposit.status == DepositStatus.PENDING:
            lease.deposit.amount = lease.deposit_amount
            lease.deposit.save(update_fields=['amount', 'updated_at'])

        AuditService.log_action(
            user=owner,
            action='UPDATE',
            resource_type='Lease',
            resource_id=str(lease.id),
            changes=validated_data,
            ip_address=ip_address
        )

        return lease

    @classmethod
    @transaction.atomic
    def terminate_lease(
        cls,
        owner,
        lease_id: str,
        termination_date,
        reason: str = None,
        next_unit_status: str = 'VACANT',
        ip_address: str = None
    ) -> Lease:
        effective_owner = owner.get_effective_owner()
        try:
            lease = Lease.objects.select_related('unit').get(
                id=lease_id,
                owner=effective_owner,
                is_active=True
            )
        except Lease.DoesNotExist:
            raise ResourceNotFoundException("Contrat de bail introuvable.", code="LEASE_NOT_FOUND")

        lease.status = LeaseStatus.TERMINATED
        lease.termination_date = termination_date
        lease.termination_reason = reason or ''
        lease.save(update_fields=['status', 'termination_date', 'termination_reason', 'updated_at'])

        # Free the unit
        unit = lease.unit
        unit.status = UnitStatus.MAINTENANCE if next_unit_status == 'MAINTENANCE' else UnitStatus.VACANT
        unit.save(update_fields=['status', 'updated_at'])

        AuditService.log_action(
            user=owner,
            action='UPDATE',
            resource_type='Lease',
            resource_id=str(lease.id),
            changes={
                'status': LeaseStatus.TERMINATED,
                'termination_date': str(termination_date),
                'reason': reason,
                'next_unit_status': unit.status
            },
            ip_address=ip_address
        )

        return lease

    @classmethod
    @transaction.atomic
    def manage_deposit(
        cls,
        owner,
        lease_id: str,
        action: str,
        amount: Decimal = None,
        payment_method: str = None,
        receipt_reference: str = None,
        reason: str = None,
        date=None,
        ip_address: str = None
    ) -> Deposit:
        effective_owner = owner.get_effective_owner()
        try:
            lease = Lease.objects.get(id=lease_id, owner=effective_owner, is_active=True)
            deposit = lease.deposit
        except (Lease.DoesNotExist, Deposit.DoesNotExist):
            raise ResourceNotFoundException("Caution ou bail introuvable.", code="DEPOSIT_NOT_FOUND")

        op_date = date or timezone.now().date()

        if action == 'PAY':
            deposit.status = DepositStatus.PAID
            deposit.received_date = op_date
            if payment_method:
                deposit.payment_method = payment_method
            if receipt_reference:
                deposit.receipt_reference = receipt_reference
            deposit.save()

        elif action == 'REFUND':
            refund_amt = amount or deposit.amount
            if refund_amt >= deposit.amount:
                deposit.status = DepositStatus.REFUNDED
            else:
                deposit.status = DepositStatus.PARTIALLY_REFUNDED
            deposit.refunded_amount = refund_amt
            deposit.refunded_date = op_date
            deposit.save()

        elif action == 'RETAIN':
            retain_amt = amount or deposit.amount
            deposit.status = DepositStatus.RETAINED
            deposit.deduction_amount = retain_amt
            deposit.deduction_reason = reason or ''
            deposit.save()

        AuditService.log_action(
            user=owner,
            action='UPDATE',
            resource_type='Deposit',
            resource_id=str(deposit.id),
            changes={'action': action, 'status': deposit.status, 'amount': str(amount)},
            ip_address=ip_address
        )

        return deposit

    @classmethod
    @transaction.atomic
    def delete_lease(cls, owner, lease_id: str, ip_address: str = None) -> None:
        effective_owner = owner.get_effective_owner()
        try:
            lease = Lease.objects.select_related('unit').get(
                id=lease_id,
                owner=effective_owner,
                is_active=True
            )
        except Lease.DoesNotExist:
            raise ResourceNotFoundException("Contrat de bail introuvable.", code="LEASE_NOT_FOUND")

        # Check if invoices exist (Rule 7 & 28)
        if lease.invoices.filter(is_active=True).exists():
            raise BusinessException(
                "Impossible de supprimer ce contrat de bail car des avis d'échéance / factures y sont rattachés.",
                code="LEASE_HAS_INVOICES"
            )

        # Free unit if active
        if lease.status == LeaseStatus.ACTIVE:
            lease.unit.status = UnitStatus.VACANT
            lease.unit.save(update_fields=['status', 'updated_at'])

        lease.soft_delete()

        AuditService.log_action(
            user=owner,
            action='DELETE',
            resource_type='Lease',
            resource_id=str(lease.id),
            changes={'soft_deleted': True},
            ip_address=ip_address
        )
