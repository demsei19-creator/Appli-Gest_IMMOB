import builtins
import uuid
from decimal import Decimal
from django.db import models
from django.utils import timezone
from common.models import BaseModel, OwnedModel
from common.utils.financial import quantize_amount
from apps.tenants.models import Tenant
from apps.billing.models import RentInvoice
from .constants import PaymentMethod, PaymentStatus


class Payment(OwnedModel):
    """
    Financial payment record received from a tenant (Rule 20, 21, 22).
    Owned by a specific landlord (Rule 8 & 26).
    """
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.PROTECT,
        related_name='payments',
        verbose_name="Locataire émetteur"
    )
    payment_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        verbose_name="Numéro de reçu / Référence paiement"
    )
    receipt_number = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        unique=True,
        db_index=True,
        verbose_name="Numéro de quittance officielle"
    )
    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name="Montant total perçu (Decimal)"
    )
    payment_date = models.DateField(
        db_index=True,
        verbose_name="Date d'encaissement"
    )
    payment_method = models.CharField(
        max_length=30,
        choices=PaymentMethod.choices,
        default=PaymentMethod.BANK_TRANSFER,
        verbose_name="Mode de règlement"
    )
    reference_number = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Référence transaction / Chèque"
    )
    status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.COMPLETED,
        db_index=True,
        verbose_name="Statut du paiement"
    )
    notes = models.TextField(
        blank=True,
        verbose_name="Remarques et annotations"
    )

    class Meta(OwnedModel.Meta):
        verbose_name = "Paiement"
        verbose_name_plural = "Paiements"
        ordering = ['-payment_date', '-created_at']

    def __str__(self):
        return f"{self.payment_number} - {self.tenant.full_name} ({self.amount} FCFA - {self.get_payment_method_display()})"

    def save(self, *args, **kwargs):
        date_prefix = self.payment_date.strftime('%Y%m') if self.payment_date else timezone.now().strftime('%Y%m')
        unique_suffix = uuid.uuid4().hex[:6].upper()
        if not self.payment_number:
            self.payment_number = f"PAI-{date_prefix}-{unique_suffix}"
        if not self.receipt_number:
            self.receipt_number = f"QUIT-{date_prefix}-{unique_suffix}"
        super().save(*args, **kwargs)

    @builtins.property
    def total_allocated_amount(self) -> Decimal:
        allocations = self.allocations.filter(is_active=True)
        return sum((alloc.allocated_amount for alloc in allocations), Decimal('0.00'))

    @builtins.property
    def unallocated_amount(self) -> Decimal:
        return quantize_amount((self.amount or Decimal('0.00')) - self.total_allocated_amount)


class PaymentAllocation(BaseModel):
    """
    Explicit allocation of a payment towards a specific Rent Invoice (Rule 20).
    Enables precise multi-invoice and partial payments tracking.
    """
    payment = models.ForeignKey(
        Payment,
        on_delete=models.PROTECT,
        related_name='allocations',
        verbose_name="Paiement source"
    )
    invoice = models.ForeignKey(
        RentInvoice,
        on_delete=models.PROTECT,
        related_name='allocations',
        verbose_name="Facture d'échéance imputée"
    )
    allocated_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Montant alloué"
    )

    class Meta(BaseModel.Meta):
        verbose_name = "Allocation de paiement"
        verbose_name_plural = "Allocations de paiement"

    def __str__(self):
        return f"Allocation {self.allocated_amount} sur {self.invoice.invoice_number} (Paiement {self.payment.payment_number})"
