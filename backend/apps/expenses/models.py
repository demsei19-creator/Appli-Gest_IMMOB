import uuid
from decimal import Decimal
from django.db import models
from django.utils import timezone
from common.models import OwnedModel
from apps.properties.models import Property, Unit
from apps.maintenance.models import Supplier
from .constants import ExpenseCategory


class Expense(OwnedModel):
    """
    Expense / Outflow incurred by a property owner (Rule 8 & 27).
    Can be property-wide (common areas) or assigned to a specific unit.
    """
    expense_number = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        unique=True,
        db_index=True,
        verbose_name="Numéro de dépense"
    )
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name='expenses',
        verbose_name="Immeuble concerné"
    )
    unit = models.ForeignKey(
        Unit,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='expenses',
        verbose_name="Logement spécifique (facultatif)"
    )
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='expenses',
        verbose_name="Fournisseur / Prestataire payé"
    )
    category = models.CharField(
        max_length=30,
        choices=ExpenseCategory.choices,
        default=ExpenseCategory.MAINTENANCE,
        db_index=True,
        verbose_name="Catégorie de dépense"
    )
    title = models.CharField(
        max_length=255,
        verbose_name="Intitulé de la dépense"
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Montant TTC (Decimal)"
    )
    expense_date = models.DateField(
        db_index=True,
        verbose_name="Date de paiement"
    )
    paid_to = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Bénéficiaire / Fournisseur payé"
    )
    receipt_file = models.FileField(
        upload_to='expenses_receipts/',
        null=True,
        blank=True,
        verbose_name="Justificatif / Facture d'achat"
    )
    is_deductible = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Déductible fiscalement"
    )
    notes = models.TextField(
        blank=True,
        verbose_name="Notes et détails"
    )

    class Meta(OwnedModel.Meta):
        verbose_name = "Dépense"
        verbose_name_plural = "Dépenses"
        ordering = ['-expense_date', '-created_at']

    def __str__(self):
        ref = self.expense_number or self.id.hex[:8]
        return f"[{ref}] {self.title} - {self.amount} FCFA ({self.get_category_display()})"

    def save(self, *args, **kwargs):
        if not self.expense_number:
            date_prefix = timezone.now().strftime('%Y%m')
            self.expense_number = f"DEP-{date_prefix}-{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)
