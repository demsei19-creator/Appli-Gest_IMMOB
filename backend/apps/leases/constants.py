from django.db import models


class LeaseStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Brouillon'
    ACTIVE = 'ACTIVE', 'Actif / En cours'
    TERMINATED = 'TERMINATED', 'Résilié'
    EXPIRED = 'EXPIRED', 'Expiré'
    CANCELLED = 'CANCELLED', 'Annulé'


class DepositStatus(models.TextChoices):
    PENDING = 'PENDING', 'En attente d’encaissement'
    PAID = 'PAID', 'Encaissée / Déposée'
    REFUNDED = 'REFUNDED', 'Restituée intégralement'
    PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED', 'Restituée partiellement'
    RETAINED = 'RETAINED', 'Retenue pour dégradations / impayés'


class PaymentFrequency(models.TextChoices):
    MONTHLY = 'MONTHLY', 'Mensuelle'
    QUARTERLY = 'QUARTERLY', 'Trimestrielle'
    SEMI_ANNUAL = 'SEMI_ANNUAL', 'Semestrielle'
    ANNUAL = 'ANNUAL', 'Annuelle'
