import uuid
from decimal import Decimal
from django.db import models
from django.utils import timezone
from common.models import OwnedModel
from common.utils.financial import calculate_invoice_status, calculate_remaining_balance, quantize_amount
from apps.leases.models import Lease
from .constants import InvoiceStatus


class RentInvoice(OwnedModel):
    """
    Monthly or periodic rent invoice / call for funds issued to a tenant.
    Owned by a specific landlord (Rule 8 & 26).
    """
    lease = models.ForeignKey(
        Lease,
        on_delete=models.PROTECT,
        related_name='invoices',
        verbose_name="Contrat de bail"
    )
    invoice_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        verbose_name="Numéro de facture / Avis d'échéance"
    )
    period_start = models.DateField(
        verbose_name="Début de période"
    )
    period_end = models.DateField(
        verbose_name="Fin de période"
    )
    due_date = models.DateField(
        db_index=True,
        verbose_name="Date d'exigibilité / Échéance"
    )
    rent_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Montant loyer net"
    )
    charges_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Montant charges"
    )
    total_expected = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Montant total attendu"
    )
    total_paid = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Montant total perçu / alloué"
    )
    remaining_balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Solde restant dû"
    )
    status = models.CharField(
        max_length=20,
        choices=InvoiceStatus.choices,
        default=InvoiceStatus.UNPAID,
        db_index=True,
        verbose_name="Statut de l'échéance"
    )
    notes = models.TextField(
        blank=True,
        verbose_name="Remarques et annotations"
    )

    class Meta(OwnedModel.Meta):
        verbose_name = "Avis d'échéance / Facture de loyer"
        verbose_name_plural = "Avis d'échéance & Factures de loyer"
        ordering = ['-due_date', '-created_at']

    def __str__(self):
        return f"{self.invoice_number} - {self.lease.tenant.full_name} ({self.remaining_balance} FCFA restant)"

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            date_prefix = self.period_start.strftime('%Y%m') if self.period_start else timezone.now().strftime('%Y%m')
            self.invoice_number = f"FACT-{date_prefix}-{uuid.uuid4().hex[:6].upper()}"
        if not self.total_expected:
            self.total_expected = quantize_amount(self.rent_amount + (self.charges_amount or Decimal('0.00')))
        if self.remaining_balance is None:
            self.remaining_balance = calculate_remaining_balance(self.total_expected, self.total_paid or Decimal('0.00'))
        super().save(*args, **kwargs)

    def recompute_financial_state(self, save=True):
        """
        Recomputes total_paid from related payment allocations and updates balance and status (Rule 21).
        """
        from apps.payments.models import PaymentAllocation
        allocations = PaymentAllocation.objects.filter(invoice=self, is_active=True)
        allocated_sum = sum((alloc.allocated_amount for alloc in allocations), Decimal('0.00'))
        
        self.total_paid = quantize_amount(allocated_sum)
        self.remaining_balance = calculate_remaining_balance(self.total_expected, self.total_paid)
        self.status = calculate_invoice_status(
            expected_amount=self.total_expected,
            paid_amount=self.total_paid,
            due_date=self.due_date
        )
        if save:
            self.save(update_fields=['total_paid', 'remaining_balance', 'status', 'updated_at'])
