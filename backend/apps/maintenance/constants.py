from django.db import models


class MaintenancePriority(models.TextChoices):
    LOW = 'LOW', 'Basse'
    MEDIUM = 'MEDIUM', 'Moyenne'
    HIGH = 'HIGH', 'Haute'
    URGENT = 'URGENT', 'Urgente / Critique'


class MaintenanceStatus(models.TextChoices):
    REPORTED = 'REPORTED', 'Signalée'
    ASSIGNED = 'ASSIGNED', 'Assignée au prestataire'
    IN_PROGRESS = 'IN_PROGRESS', 'En cours d’intervention'
    COMPLETED = 'COMPLETED', 'Terminée et validée'
    CANCELLED = 'CANCELLED', 'Annulée'


class SupplierCategory(models.TextChoices):
    PLUMBING = 'PLUMBING', 'Plomberie & Sanitaire'
    ELECTRICAL = 'ELECTRICAL', 'Électricité & Domotique'
    MASONRY = 'MASONRY', 'Maçonnerie & Gros œuvre'
    PAINTING = 'PAINTING', 'Peinture & Finitions'
    CLEANING = 'CLEANING', 'Nettoyage & Entretien'
    HVAC = 'HVAC', 'Climatisation & Chauffage'
    SECURITY = 'SECURITY', 'Gardiennage & Sécurité'
    OTHER = 'OTHER', 'Autre'
