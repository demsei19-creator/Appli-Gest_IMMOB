import builtins
import uuid
from decimal import Decimal
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from common.models import BaseModel, OwnedModel
from apps.properties.models import Unit
from apps.tenants.models import Tenant
from .constants import LeaseStatus, DepositStatus, PaymentFrequency


class Lease(OwnedModel):
    """
    Rental contract between a Property Owner and a Tenant for a specific Unit.
    Owned by a specific user / landlord (Rule 8 & 26).
    """
    unit = models.ForeignKey(
        Unit,
        on_delete=models.PROTECT,
        related_name='leases',
        verbose_name="Logement concerné"
    )
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.PROTECT,
        related_name='leases',
        verbose_name="Locataire titulaire"
    )
    lease_number = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Numéro de contrat"
    )
    start_date = models.DateField(
        verbose_name="Date d'entrée / Prise d'effet"
    )
    end_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Date de fin de bail (si déterminée)"
    )
    rent_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Loyer mensuel hors charges"
    )
    charges_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Provisions de charges mensuelles"
    )
    deposit_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Montant du dépôt de garantie (Caution)"
    )
    payment_day_of_month = models.PositiveSmallIntegerField(
        default=5,
        validators=[MinValueValidator(1), MaxValueValidator(31)],
        verbose_name="Jour d'exigibilité du loyer dans le mois (1 à 31)"
    )
    payment_frequency = models.CharField(
        max_length=20,
        choices=PaymentFrequency.choices,
        default=PaymentFrequency.MONTHLY,
        verbose_name="Périodicité des paiements"
    )
    status = models.CharField(
        max_length=20,
        choices=LeaseStatus.choices,
        default=LeaseStatus.DRAFT,
        db_index=True,
        verbose_name="Statut du contrat"
    )
    terms_and_conditions = models.TextField(
        blank=True,
        verbose_name="Clauses particulières et conditions"
    )
    termination_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Date de résiliation effective"
    )
    termination_reason = models.TextField(
        blank=True,
        verbose_name="Motif de résiliation"
    )

    class Meta(OwnedModel.Meta):
        verbose_name = "Contrat de bail"
        verbose_name_plural = "Contrats de bail"
        ordering = ['-start_date']

    def __str__(self):
        ref = self.lease_number or self.id.hex[:8]
        return f"Bail {ref} - {self.tenant.full_name} ({self.unit.unit_number})"

    def save(self, *args, **kwargs):
        if not self.lease_number:
            year = self.start_date.year if self.start_date else timezone.now().year
            self.lease_number = f"BAIL-{year}-{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)

    @builtins.property
    def total_monthly_amount(self) -> Decimal:
        return (self.rent_amount or Decimal('0.00')) + (self.charges_amount or Decimal('0.00'))


class Deposit(BaseModel):
    """
    Security deposit linked to a Lease.
    """
    lease = models.OneToOneField(
        Lease,
        on_delete=models.CASCADE,
        related_name='deposit',
        verbose_name="Contrat de bail"
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Montant de la caution exigé"
    )
    received_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Date d'encaissement"
    )
    status = models.CharField(
        max_length=30,
        choices=DepositStatus.choices,
        default=DepositStatus.PENDING,
        db_index=True,
        verbose_name="Statut de la caution"
    )
    refunded_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Montant restitué au locataire"
    )
    refunded_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Date de restitution"
    )
    deduction_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Montant retenu (dégradations/charges)"
    )
    deduction_reason = models.TextField(
        blank=True,
        verbose_name="Motif des retenues sur caution"
    )
    payment_method = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Moyen de règlement"
    )
    receipt_reference = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Référence du reçu"
    )

    class Meta(BaseModel.Meta):
        verbose_name = "Caution / Dépôt de garantie"
        verbose_name_plural = "Cautions & Dépôts de garantie"

    def __str__(self):
        ref = self.lease.lease_number or self.lease.id.hex[:8]
        return f"Caution de {self.amount} - Bail {ref} ({self.get_status_display()})"
