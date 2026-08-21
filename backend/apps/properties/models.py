import builtins
import uuid
from decimal import Decimal
from django.db import models
from common.models import BaseModel, OwnedModel
from .constants import PropertyType, UnitStatus, UnitType


class Property(OwnedModel):
    """
    Represents a real estate asset / building / property complex.
    Owned by a specific user (Rule 8 & 26).
    """
    name = models.CharField(
        max_length=255,
        verbose_name="Nom de l'immeuble / propriété"
    )
    code = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Code référence"
    )
    property_type = models.CharField(
        max_length=30,
        choices=PropertyType.choices,
        default=PropertyType.BUILDING,
        verbose_name="Type de bien"
    )
    address = models.CharField(
        max_length=255,
        verbose_name="Adresse"
    )
    city = models.CharField(
        max_length=100,
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
    description = models.TextField(
        blank=True,
        verbose_name="Description détaillée"
    )
    notes = models.TextField(
        blank=True,
        verbose_name="Notes internes"
    )
    purchase_price = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Prix d'acquisition"
    )
    estimated_value = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Valeur estimée actuelle"
    )
    cover_image = models.ImageField(
        upload_to='properties/',
        null=True,
        blank=True,
        verbose_name="Photo principale"
    )

    class Meta(OwnedModel.Meta):
        verbose_name = "Immeuble / Propriété"
        verbose_name_plural = "Immeubles & Propriétés"
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.city})"

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = f"PROP-{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)

    @property
    def units_count(self) -> int:
        return self.units.filter(is_active=True).count()

    @property
    def occupied_units_count(self) -> int:
        return self.units.filter(is_active=True, status=UnitStatus.OCCUPIED).count()

    @property
    def vacant_units_count(self) -> int:
        return self.units.filter(is_active=True, status=UnitStatus.VACANT).count()

    @property
    def occupancy_rate(self) -> float:
        total = self.units_count
        if total == 0:
            return 0.0
        return round((self.occupied_units_count / total) * 100, 1)

    @property
    def total_monthly_revenue_potential(self) -> Decimal:
        """Sum of total rent amounts of all active units."""
        active_units = self.units.filter(is_active=True)
        return sum((u.total_rent_amount for u in active_units), Decimal('0.00'))

    @property
    def actual_monthly_revenue(self) -> Decimal:
        """Sum of total rent amounts of currently occupied units."""
        occupied_units = self.units.filter(is_active=True, status=UnitStatus.OCCUPIED)
        return sum((u.total_rent_amount for u in occupied_units), Decimal('0.00'))


class Unit(BaseModel):
    """
    Represents an individual rentable unit (apartment, studio, office, shop, parking).
    """
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name='units',
        verbose_name="Immeuble / Propriété"
    )
    unit_number = models.CharField(
        max_length=50,
        verbose_name="Numéro de porte / Référence lot"
    )
    floor = models.CharField(
        max_length=30,
        blank=True,
        verbose_name="Étage"
    )
    unit_type = models.CharField(
        max_length=30,
        choices=UnitType.choices,
        default=UnitType.APARTMENT_T2,
        verbose_name="Type de logement"
    )
    surface_area_sqm = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Surface (m²)"
    )
    rooms_count = models.PositiveIntegerField(
        default=1,
        verbose_name="Nombre de pièces"
    )
    bathrooms_count = models.PositiveIntegerField(
        default=1,
        verbose_name="Nombre de salles d'eau"
    )
    base_rent_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Loyer de base hors charges (FCFA / EUR)"
    )
    service_charges_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Provisions sur charges"
    )
    status = models.CharField(
        max_length=20,
        choices=UnitStatus.choices,
        default=UnitStatus.VACANT,
        db_index=True,
        verbose_name="Statut du logement"
    )
    water_meter_number = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="N° Compteur Eau"
    )
    electricity_meter_number = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="N° Compteur Électricité"
    )
    description = models.TextField(
        blank=True,
        verbose_name="Description du logement"
    )

    class Meta(BaseModel.Meta):
        verbose_name = "Logement / Lot"
        verbose_name_plural = "Logements & Lots"
        unique_together = ('property', 'unit_number')
        ordering = ['unit_number']

    def __str__(self):
        return f"{self.property.name} - Lot {self.unit_number} ({self.get_status_display()})"

    @builtins.property
    def total_rent_amount(self) -> Decimal:
        return (self.base_rent_amount or Decimal('0.00')) + (self.service_charges_amount or Decimal('0.00'))

    @builtins.property
    def is_occupied(self) -> bool:
        return self.status == UnitStatus.OCCUPIED

    def get_active_lease(self):
        """Returns the currently active lease for this unit if any."""
        return self.leases.filter(status='ACTIVE', is_active=True).select_related('tenant').first()
