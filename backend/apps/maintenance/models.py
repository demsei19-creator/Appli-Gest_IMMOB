import builtins
import uuid
from decimal import Decimal
from django.db import models
from django.utils import timezone
from common.models import OwnedModel
from apps.properties.models import Property, Unit
from apps.tenants.models import Tenant
from .constants import MaintenancePriority, MaintenanceStatus, SupplierCategory


class Supplier(OwnedModel):
    """
    Contractor / Craftsperson / Supplier for property maintenance.
    Owned by a specific landlord (Rule 8 & 26).
    """
    name = models.CharField(
        max_length=200,
        verbose_name="Nom de l'entreprise / artisan"
    )
    category = models.CharField(
        max_length=30,
        choices=SupplierCategory.choices,
        default=SupplierCategory.PLUMBING,
        verbose_name="Corps d'état / Spécialité"
    )
    contact_name = models.CharField(
        max_length=150,
        blank=True,
        verbose_name="Interlocuteur principal"
    )
    phone_number = models.CharField(
        max_length=30,
        verbose_name="Téléphone"
    )
    email = models.EmailField(
        blank=True,
        verbose_name="Email"
    )
    address = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Adresse"
    )
    tax_id = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Numéro SIRET / Registre de commerce"
    )
    notes = models.TextField(
        blank=True,
        verbose_name="Notes et tarifs indicatifs"
    )

    class Meta(OwnedModel.Meta):
        verbose_name = "Fournisseur / Prestataire"
        verbose_name_plural = "Fournisseurs & Prestataires"
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"

    @builtins.property
    def total_interventions_count(self) -> int:
        return self.interventions.filter(is_active=True).count()

    @builtins.property
    def total_spent(self) -> Decimal:
        interventions = self.interventions.filter(is_active=True, status=MaintenanceStatus.COMPLETED)
        return sum((i.actual_cost or Decimal('0.00') for i in interventions), Decimal('0.00'))


class MaintenanceRequest(OwnedModel):
    """
    Repair or maintenance intervention on a property/unit.
    Owned by a specific landlord (Rule 8 & 26).
    """
    ticket_number = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        unique=True,
        db_index=True,
        verbose_name="Numéro de ticket / Dossier"
    )
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name='maintenance_requests',
        verbose_name="Immeuble concerné"
    )
    unit = models.ForeignKey(
        Unit,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='maintenance_requests',
        verbose_name="Logement concerné (vide si parties communes)"
    )
    reported_by_tenant = models.ForeignKey(
        Tenant,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='maintenance_requests',
        verbose_name="Locataire signalant"
    )
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='interventions',
        verbose_name="Prestataire assigné"
    )
    title = models.CharField(
        max_length=255,
        verbose_name="Objet de l'intervention"
    )
    description = models.TextField(
        verbose_name="Description détaillée du problème"
    )
    priority = models.CharField(
        max_length=20,
        choices=MaintenancePriority.choices,
        default=MaintenancePriority.MEDIUM,
        db_index=True,
        verbose_name="Degré d'urgence"
    )
    status = models.CharField(
        max_length=20,
        choices=MaintenanceStatus.choices,
        default=MaintenanceStatus.REPORTED,
        db_index=True,
        verbose_name="État d'avancement"
    )
    estimated_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Devis estimatif"
    )
    actual_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Coût réel final"
    )
    reported_date = models.DateField(
        auto_now_add=True,
        verbose_name="Date de signalement"
    )
    completed_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Date de fin des travaux"
    )

    class Meta(OwnedModel.Meta):
        verbose_name = "Intervention de maintenance"
        verbose_name_plural = "Interventions de maintenance"
        ordering = ['-reported_date', '-created_at']

    def __str__(self):
        ref = self.ticket_number or self.id.hex[:8]
        return f"[{self.get_priority_display()}] {ref} - {self.title} ({self.get_status_display()})"

    def save(self, *args, **kwargs):
        if not self.ticket_number:
            date_prefix = timezone.now().strftime('%Y%m')
            self.ticket_number = f"TICK-{date_prefix}-{uuid.uuid4().hex[:6].upper()}"
        if self.status == MaintenanceStatus.COMPLETED and not self.completed_date:
            self.completed_date = timezone.now().date()
        super().save(*args, **kwargs)
