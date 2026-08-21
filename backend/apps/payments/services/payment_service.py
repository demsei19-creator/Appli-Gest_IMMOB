from decimal import Decimal
import uuid
from datetime import date
from django.db import transaction
from django.utils import timezone
from common.exceptions import FinancialException, ResourceNotFoundException, BusinessException
from common.services import BaseService
from common.utils.financial import quantize_amount
from apps.audit.services.audit_service import AuditService
from apps.tenants.models import Tenant
from apps.billing.models import RentInvoice
from apps.billing.constants import InvoiceStatus
from ..models import Payment, PaymentAllocation
from ..constants import PaymentStatus, PaymentMethod


class PaymentService(BaseService):
    """
    Core Financial Service implementing payment processing and multi-invoice FIFO allocations (Rules 5, 6, 20, 21).
    """

    @classmethod
    @transaction.atomic
    def record_payment(
        cls,
        owner,
        tenant_id: str,
        amount: Decimal,
        payment_date: date,
        payment_method: str = PaymentMethod.BANK_TRANSFER,
        reference_number: str = "",
        notes: str = "",
        auto_allocate_fifo: bool = True,
        manual_allocations: list = None,
        ip_address: str = None,
    ) -> Payment:
        """
        Registers a payment with multi-tenant isolation, generates receipt number,
        allocates funds across invoices (via FIFO or manual lines), and recalculates invoice states.
        """
        effective_owner = owner.get_effective_owner()

        try:
            tenant = Tenant.objects.get(id=tenant_id, owner=effective_owner, is_active=True)
        except Tenant.DoesNotExist:
            raise ResourceNotFoundException("Locataire introuvable pour ce propriétaire.", code="TENANT_NOT_FOUND")

        payment_amount = quantize_amount(amount)
        if payment_amount <= Decimal('0.00'):
            raise FinancialException(
                code="INVALID_PAYMENT_AMOUNT",
                message="Le montant du paiement doit être strictement supérieur à zéro."
            )

        # 1. Create Payment Record
        payment = Payment.objects.create(
            owner=effective_owner,
            tenant=tenant,
            amount=payment_amount,
            payment_date=payment_date,
            payment_method=payment_method,
            reference_number=reference_number or '',
            status=PaymentStatus.COMPLETED,
            notes=notes or ''
        )

        # 2. Allocations
        if manual_allocations and len(manual_allocations) > 0 and not auto_allocate_fifo:
            total_allocated = Decimal('0.00')
            for item in manual_allocations:
                inv_id = item.get('invoice_id')
                alloc_val = quantize_amount(item.get('amount'))

                try:
                    invoice = RentInvoice.objects.select_for_update().get(id=inv_id, owner=effective_owner, is_active=True)
                except RentInvoice.DoesNotExist:
                    raise ResourceNotFoundException(f"Facture #{inv_id} introuvable.", code="INVOICE_NOT_FOUND")

                if alloc_val > invoice.remaining_balance:
                    raise FinancialException(
                        code="OVER_ALLOCATION_ERROR",
                        message=f"Le montant alloué ({alloc_val} FCFA) dépasse le solde restant de la facture ({invoice.remaining_balance} FCFA)."
                    )

                PaymentAllocation.objects.create(
                    payment=payment,
                    invoice=invoice,
                    allocated_amount=alloc_val
                )
                total_allocated += alloc_val
                invoice.recompute_financial_state()

            if total_allocated > payment_amount:
                raise FinancialException(
                    code="ALLOCATION_EXCEEDS_PAYMENT",
                    message="La somme des allocations dépasse le montant total du paiement perçu."
                )

        elif auto_allocate_fifo:
            # Automatic FIFO Allocation: Apply to oldest unpaid/partial/overdue invoices
            remaining_to_allocate = payment_amount
            unpaid_invoices = RentInvoice.objects.select_for_update().filter(
                owner=effective_owner,
                lease__tenant=tenant,
                status__in=[InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE],
                is_active=True
            ).order_by('due_date', 'period_start')

            for invoice in unpaid_invoices:
                if remaining_to_allocate <= Decimal('0.00'):
                    break

                needed = invoice.remaining_balance
                if needed <= Decimal('0.00'):
                    continue

                allocate_for_this = min(remaining_to_allocate, needed)

                PaymentAllocation.objects.create(
                    payment=payment,
                    invoice=invoice,
                    allocated_amount=allocate_for_this
                )
                remaining_to_allocate -= allocate_for_this
                invoice.recompute_financial_state()

        AuditService.log_action(
            user=owner,
            action='CREATE',
            resource_type='Payment',
            resource_id=str(payment.id),
            changes={
                'payment_number': payment.payment_number,
                'receipt_number': payment.receipt_number,
                'tenant': tenant.full_name,
                'amount': str(payment_amount),
                'method': payment_method,
                'allocations_count': payment.allocations.count()
            },
            ip_address=ip_address
        )

        return payment

    @classmethod
    @transaction.atomic
    def cancel_payment(cls, owner, payment_id: str, reason: str = "", ip_address: str = None) -> Payment:
        """
        Cancels a payment. Soft-deletes all related allocations and recalculates invoice states.
        """
        effective_owner = owner.get_effective_owner()
        try:
            payment = Payment.objects.get(id=payment_id, owner=effective_owner, is_active=True)
        except Payment.DoesNotExist:
            raise ResourceNotFoundException("Paiement introuvable.", code="PAYMENT_NOT_FOUND")

        payment.status = PaymentStatus.CANCELLED
        if reason:
            payment.notes = f"{payment.notes}\n[ANNULATION]: {reason}".strip()
        payment.save(update_fields=['status', 'notes', 'updated_at'])

        # Cancel and recompute affected invoices
        for allocation in payment.allocations.filter(is_active=True):
            invoice = allocation.invoice
            allocation.soft_delete()
            invoice.recompute_financial_state()

        AuditService.log_action(
            user=owner,
            action='UPDATE',
            resource_type='Payment',
            resource_id=str(payment.id),
            changes={'status': PaymentStatus.CANCELLED, 'reason': reason},
            ip_address=ip_address
        )

        return payment

    @classmethod
    def get_receipt_data(cls, owner, payment_id: str) -> dict:
        """
        Returns structured legal data for printing/generating the official Rent Receipt (Quittance).
        """
        effective_owner = owner.get_effective_owner()
        try:
            payment = Payment.objects.select_related('tenant').prefetch_related(
                'allocations__invoice__lease__unit__property'
            ).get(id=payment_id, owner=effective_owner, is_active=True)
        except Payment.DoesNotExist:
            raise ResourceNotFoundException("Paiement introuvable.", code="PAYMENT_NOT_FOUND")

        allocations_data = []
        for alloc in payment.allocations.filter(is_active=True):
            inv = alloc.invoice
            allocations_data.append({
                'invoice_number': inv.invoice_number,
                'period_start': str(inv.period_start),
                'period_end': str(inv.period_end),
                'property_name': inv.lease.unit.property.name,
                'unit_number': inv.lease.unit.unit_number,
                'allocated_amount': str(alloc.allocated_amount),
                'invoice_status': inv.status,
                'remaining_balance': str(inv.remaining_balance),
            })

        return {
            'receipt_number': payment.receipt_number,
            'payment_number': payment.payment_number,
            'payment_date': str(payment.payment_date),
            'payment_method': payment.get_payment_method_display(),
            'reference_number': payment.reference_number,
            'amount': str(payment.amount),
            'landlord': {
                'name': effective_owner.company_name or f"{effective_owner.first_name} {effective_owner.last_name}",
                'email': effective_owner.email,
                'phone': getattr(effective_owner, 'phone_number', ''),
            },
            'tenant': {
                'id': str(payment.tenant.id),
                'full_name': payment.tenant.full_name,
                'phone': payment.tenant.phone_number,
                'email': payment.tenant.email,
            },
            'allocations': allocations_data,
        }
