import uuid
from decimal import Decimal
from django.db import models
from django.utils import timezone
from common.models import OwnedModel
from apps.properties.models import Property
from .constants import TaxType


class PropertyTax(OwnedModel):
    """
    Property tax / fiscal declaration item for real estate assets (Rule 8 & 28).
    """
    tax_number = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        unique=True,
        db_index=True,
        verbose_name="Numéro fiscal de référence"
    )
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name='taxes',
        verbose_name="Immeuble concerné"
    )
    tax_type = models.CharField(
        max_length=30,
        choices=TaxType.choices,
        default=TaxType.PROPERTY_TAX,
        db_index=True,
        verbose_name="Type d'imposition"
    )
    fiscal_year = models.PositiveIntegerField(
        db_index=True,
        verbose_name="Année / Exercice fiscal"
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Montant de l'impôt (Decimal)"
    )
    due_date = models.DateField(
        db_index=True,
        verbose_name="Date limite de paiement"
    )
    paid_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Date effective de règlement"
    )
    is_paid = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Réglé / Acquitté"
    )
    reference_notice = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Numéro d'avis d'imposition / Référence fiscale"
    )
    notice_file = models.FileField(
        upload_to='taxes_notices/',
        null=True,
        blank=True,
        verbose_name="Avis d'imposition (PDF/Scan)"
    )
    notes = models.TextField(
        blank=True,
        verbose_name="Notes et détails"
    )

    class Meta(OwnedModel.Meta):
        verbose_name = "Impôt / Taxe foncière"
        verbose_name_plural = "Impôts & Taxes foncières"
        ordering = ['-fiscal_year', 'due_date']

    def __str__(self):
        ref = self.tax_number or self.id.hex[:8]
        return f"[{ref}] {self.get_tax_type_display()} {self.fiscal_year} - {self.property.name} ({self.amount} FCFA)"

    def save(self, *args, **kwargs):
        if not self.tax_number:
            year_val = self.fiscal_year or timezone.now().year
            self.tax_number = f"TAX-{year_val}-{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)
