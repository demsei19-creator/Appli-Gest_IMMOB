import calendar
from datetime import date
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from common.services import BaseService
from common.exceptions import BusinessException, ResourceNotFoundException
from common.utils.financial import calculate_invoice_status, quantize_amount
from apps.audit.services.audit_service import AuditService
from apps.leases.models import Lease
from apps.leases.constants import LeaseStatus
from ..constants import InvoiceStatus
from ..models import RentInvoice


class BillingService(BaseService):
    """
    Business operations for Rent Invoices generation, batch processing, and status management.
    Strictly follows financial Decimal precision, atomic transactions, and multi-tenant isolation.
    """

    @classmethod
    @transaction.atomic
    def generate_single_invoice(cls, owner, validated_data: dict, ip_address: str = None) -> RentInvoice:
        effective_owner = owner.get_effective_owner()
        lease = validated_data.get('lease')

        # Multi-tenant check
        if lease.owner != effective_owner:
            raise ResourceNotFoundException("Contrat de bail introuvable pour ce propriétaire.", code="LEASE_NOT_FOUND")

        if lease.status != LeaseStatus.ACTIVE:
            raise BusinessException(
                "Impossible d'émettre un avis d'échéance pour un bail qui n'est pas actif.",
                code="LEASE_NOT_ACTIVE"
            )

        period_start = validated_data.get('period_start')
        period_end = validated_data.get('period_end')
        due_date = validated_data.get('due_date')

        # If period not provided, default to current month
        if not period_start or not period_end:
            today = timezone.now().date()
            period_start = today.replace(day=1)
            _, last_day = calendar.monthrange(today.year, today.month)
            period_end = today.replace(day=last_day)

        if not due_date:
            due_day = min(lease.payment_day_of_month, 28)
            due_date = period_start.replace(day=due_day)

        # Duplicate check: check if an active invoice exists for this lease and period
        existing = RentInvoice.objects.filter(
            owner=effective_owner,
            lease=lease,
            is_active=True,
            period_start=period_start,
            period_end=period_end
        ).exclude(status=InvoiceStatus.CANCELLED).exists()

        if existing:
            raise BusinessException(
                f"Un avis d'échéance a déjà été généré pour ce contrat sur la période du {period_start} au {period_end}.",
                code="INVOICE_ALREADY_EXISTS"
            )

        rent_amount = validated_data.get('rent_amount') or lease.rent_amount
        charges_amount = validated_data.get('charges_amount') if validated_data.get('charges_amount') is not None else lease.charges_amount
        total_expected = quantize_amount(rent_amount + (charges_amount or Decimal('0.00')))

        initial_status = calculate_invoice_status(
            expected_amount=total_expected,
            paid_amount=Decimal('0.00'),
            due_date=due_date
        )

        invoice = RentInvoice.objects.create(
            owner=effective_owner,
            lease=lease,
            period_start=period_start,
            period_end=period_end,
            due_date=due_date,
            rent_amount=rent_amount,
            charges_amount=charges_amount,
            total_expected=total_expected,
            total_paid=Decimal('0.00'),
            remaining_balance=total_expected,
            status=initial_status,
            notes=validated_data.get('notes', '')
        )

        AuditService.log_action(
            user=owner,
            action='CREATE',
            resource_type='RentInvoice',
            resource_id=str(invoice.id),
            changes={
                'invoice_number': invoice.invoice_number,
                'lease': lease.lease_number,
                'tenant': lease.tenant.full_name,
                'total_expected': str(total_expected),
                'due_date': str(due_date)
            },
            ip_address=ip_address
        )

        return invoice

    @classmethod
    @transaction.atomic
    def generate_bulk_invoices(
        cls,
        owner,
        month: int,
        year: int,
        property_id: str = None,
        ip_address: str = None
    ) -> dict:
        """
        1-Click automated batch generator for all active leases of the landlord.
        Includes intelligent deduplication.
        """
        effective_owner = owner.get_effective_owner()

        # Date range for target month
        _, last_day = calendar.monthrange(year, month)
        period_start = date(year, month, 1)
        period_end = date(year, month, last_day)

        leases_qs = Lease.objects.filter(
            owner=effective_owner,
            status=LeaseStatus.ACTIVE,
            is_active=True
        ).select_related('tenant', 'unit__property')

        if property_id:
            leases_qs = leases_qs.filter(unit__property_id=property_id)

        created_invoices = []
        skipped_leases = []

        for lease in leases_qs:
            # Check for existing invoice for this period
            already_exists = RentInvoice.objects.filter(
                owner=effective_owner,
                lease=lease,
                is_active=True,
                period_start=period_start,
                period_end=period_end
            ).exclude(status=InvoiceStatus.CANCELLED).exists()

            if already_exists:
                skipped_leases.append({
                    'lease_id': str(lease.id),
                    'lease_number': lease.lease_number,
                    'tenant_name': lease.tenant.full_name,
                    'reason': "Avis d'échéance déjà existant pour ce mois"
                })
                continue

            due_day = min(lease.payment_day_of_month, last_day)
            due_date = date(year, month, due_day)

            total_expected = quantize_amount(lease.rent_amount + (lease.charges_amount or Decimal('0.00')))
            initial_status = calculate_invoice_status(
                expected_amount=total_expected,
                paid_amount=Decimal('0.00'),
                due_date=due_date
            )

            invoice = RentInvoice.objects.create(
                owner=effective_owner,
                lease=lease,
                period_start=period_start,
                period_end=period_end,
                due_date=due_date,
                rent_amount=lease.rent_amount,
                charges_amount=lease.charges_amount,
                total_expected=total_expected,
                total_paid=Decimal('0.00'),
                remaining_balance=total_expected,
                status=initial_status
            )
            created_invoices.append(invoice)

        AuditService.log_action(
            user=owner,
            action='CREATE',
            resource_type='RentInvoice',
            resource_id=f"BULK-{year}{month:02d}",
            changes={
                'month': month,
                'year': year,
                'generated_count': len(created_invoices),
                'skipped_count': len(skipped_leases)
            },
            ip_address=ip_address
        )

        return {
            'generated_count': len(created_invoices),
            'skipped_count': len(skipped_leases),
            'created_invoices': created_invoices,
            'skipped_leases': skipped_leases,
        }

    @classmethod
    @transaction.atomic
    def cancel_invoice(cls, owner, invoice_id: str, reason: str = None, ip_address: str = None) -> RentInvoice:
        effective_owner = owner.get_effective_owner()
        try:
            invoice = RentInvoice.objects.get(id=invoice_id, owner=effective_owner, is_active=True)
        except RentInvoice.DoesNotExist:
            raise ResourceNotFoundException("Avis d'échéance introuvable.", code="INVOICE_NOT_FOUND")

        if invoice.total_paid > 0:
            raise BusinessException(
                "Impossible d'annuler un avis d'échéance sur lequel des règlements ont déjà été imputés.",
                code="INVOICE_HAS_PAYMENTS"
            )

        invoice.status = InvoiceStatus.CANCELLED
        if reason:
            invoice.notes = f"{invoice.notes}\n[Annulation]: {reason}".strip()
        invoice.save(update_fields=['status', 'notes', 'updated_at'])

        AuditService.log_action(
            user=owner,
            action='UPDATE',
            resource_type='RentInvoice',
            resource_id=str(invoice.id),
            changes={'status': InvoiceStatus.CANCELLED, 'reason': reason},
            ip_address=ip_address
        )

        return invoice

    @classmethod
    @transaction.atomic
    def delete_invoice(cls, owner, invoice_id: str, ip_address: str = None) -> None:
        effective_owner = owner.get_effective_owner()
        try:
            invoice = RentInvoice.objects.get(id=invoice_id, owner=effective_owner, is_active=True)
        except RentInvoice.DoesNotExist:
            raise ResourceNotFoundException("Avis d'échéance introuvable.", code="INVOICE_NOT_FOUND")

        if invoice.total_paid > 0:
            raise BusinessException(
                "Impossible de supprimer un avis d'échéance sur lequel des paiements ont été enregistrés.",
                code="INVOICE_HAS_PAYMENTS"
            )

        invoice.soft_delete()

        AuditService.log_action(
            user=owner,
            action='DELETE',
            resource_type='RentInvoice',
            resource_id=str(invoice.id),
            changes={'soft_deleted': True},
            ip_address=ip_address
        )

    @classmethod
    def refresh_overdue_statuses(cls, owner=None) -> int:
        """
        Scans all UNPAID or PARTIAL invoices past due_date and marks them as OVERDUE.
        """
        today = timezone.now().date()
        qs = RentInvoice.objects.filter(
            is_active=True,
            status__in=[InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL],
            due_date__lt=today,
            remaining_balance__gt=0
        )
        if owner:
            effective_owner = owner.get_effective_owner()
            qs = qs.filter(owner=effective_owner)

        updated_count = 0
        for inv in qs:
            inv.status = InvoiceStatus.OVERDUE
            inv.save(update_fields=['status', 'updated_at'])
            updated_count += 1

        return updated_count
