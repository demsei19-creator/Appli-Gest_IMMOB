from decimal import Decimal
from django.db import models
from common.models import BaseModel, OwnedModel
from .constants import TenantType, IdCardType


class Tenant(OwnedModel):
    """
    Represents a tenant (individual or company) renting one or more units.
    Owned by a specific user / landlord (Rule 8 & 26).
    """
    tenant_type = models.CharField(
        max_length=20,
        choices=TenantType.choices,
        default=TenantType.INDIVIDUAL,
        verbose_name="Type de locataire"
    )
    first_name = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Prénom"
    )
    last_name = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Nom de famille"
    )
    company_name = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Raison Sociale / Nom Entreprise"
    )
    email = models.EmailField(
        blank=True,
        verbose_name="Adresse Email"
    )
    phone_number = models.CharField(
        max_length=30,
        verbose_name="Numéro de téléphone principal"
    )
    secondary_phone = models.CharField(
        max_length=30,
        blank=True,
        verbose_name="Numéro de téléphone secondaire"
    )
    id_card_type = models.CharField(
        max_length=30,
        choices=IdCardType.choices,
        default=IdCardType.CNI,
        verbose_name="Type de pièce d'identité"
    )
    id_card_number = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Numéro de pièce / RCCM"
    )
    tax_id = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Compte Contribuable / NIF / Numéro Fiscal"
    )
    date_of_birth = models.DateField(
        null=True,
        blank=True,
        verbose_name="Date de naissance / Création"
    )
    profession = models.CharField(
        max_length=150,
        blank=True,
        verbose_name="Profession / Activité"
    )
    employer = models.CharField(
        max_length=150,
        blank=True,
        verbose_name="Employeur / Entreprise"
    )
    monthly_income = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Revenu mensuel net déclaré"
    )
    address = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Adresse de domiciliation"
    )
    city = models.CharField(
        max_length=100,
        default="Abidjan",
        verbose_name="Ville"
    )
    postal_code = models.CharField(
        max_length=20,
        blank=True,
        verbose_name="Code Postal"
    )
    country = models.CharField(
        max_length=100,
        default="Côte d'Ivoire",
        verbose_name="Pays"
    )
    notes = models.TextField(
        blank=True,
        verbose_name="Remarques et antécédents"
    )

    class Meta(OwnedModel.Meta):
        verbose_name = "Locataire"
        verbose_name_plural = "Locataires"
        ordering = ['last_name', 'first_name', 'company_name']

    def __str__(self):
        return f"{self.full_name} ({self.phone_number})"

    @property
    def full_name(self) -> str:
        if self.tenant_type == TenantType.COMPANY and self.company_name:
            return self.company_name
        name = f"{self.first_name} {self.last_name}".strip()
        return name if name else (self.company_name or "Locataire Anonyme")

    def get_active_lease(self):
        """Returns the currently active lease for this tenant if any."""
        return self.leases.filter(
            status='ACTIVE',
            is_active=True
        ).select_related('unit__property').first()

    @property
    def is_active_occupant(self) -> bool:
        return self.get_active_lease() is not None

    @property
    def total_unpaid_balance(self) -> Decimal:
        """Sum of remaining balance for unpaid / overdue invoices."""
        from apps.billing.models import RentInvoice
        unpaid_invoices = RentInvoice.objects.filter(
            lease__tenant=self,
            is_active=True,
            status__in=['UNPAID', 'PARTIAL', 'OVERDUE']
        )
        return sum((inv.remaining_balance for inv in unpaid_invoices), Decimal('0.00'))


class EmergencyContact(BaseModel):
    """
    Emergency contact for a tenant.
    """
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name='emergency_contacts',
        verbose_name="Locataire"
    )
    name = models.CharField(
        max_length=150,
        verbose_name="Nom complet du contact"
    )
    relationship = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Lien de parenté / Relation"
    )
    phone_number = models.CharField(
        max_length=30,
        verbose_name="Téléphone"
    )

    class Meta(BaseModel.Meta):
        verbose_name = "Contact d'urgence"
        verbose_name_plural = "Contacts d'urgence"

    def __str__(self):
        return f"{self.name} ({self.relationship}) - {self.phone_number}"


class Guarantor(BaseModel):
    """
    Guarantor / Caution solidaire for a tenant.
    """
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name='guarantors',
        verbose_name="Locataire"
    )
    full_name = models.CharField(
        max_length=150,
        verbose_name="Nom et prénom du garant"
    )
    relationship = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Lien avec le locataire"
    )
    phone_number = models.CharField(
        max_length=30,
        verbose_name="Téléphone"
    )
    email = models.EmailField(
        blank=True,
        verbose_name="Email"
    )
    id_card_number = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Numéro de pièce d'identité"
    )
    profession = models.CharField(
        max_length=150,
        blank=True,
        verbose_name="Profession"
    )
    monthly_income = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Revenus mensuels du garant"
    )

    class Meta(BaseModel.Meta):
        verbose_name = "Garant / Caution Solidaire"
        verbose_name_plural = "Garants & Cautions Solidaires"

    def __str__(self):
        return f"{self.full_name} ({self.relationship}) - {self.phone_number}"
