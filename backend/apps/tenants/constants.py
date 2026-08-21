from django.db import models


class TenantType(models.TextChoices):
    INDIVIDUAL = 'INDIVIDUAL', 'Particulier'
    COMPANY = 'COMPANY', 'Entreprise / Personne Morale'


class IdCardType(models.TextChoices):
    CNI = 'CNI', "Carte Nationale d'Identité"
    PASSPORT = 'PASSPORT', 'Passeport'
    RESIDENCE_PERMIT = 'RESIDENCE_PERMIT', 'Titre de Séjour / Carte Consulaire'
    RCCM = 'RCCM', 'Registre du Commerce (RCCM)'
    OTHER = 'OTHER', 'Autre pièce officielle'
