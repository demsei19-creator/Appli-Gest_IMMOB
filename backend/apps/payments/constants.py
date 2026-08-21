from django.db import models


class PaymentMethod(models.TextChoices):
    BANK_TRANSFER = 'BANK_TRANSFER', 'Virement bancaire'
    CASH = 'CASH', 'Espèces'
    CHECK = 'CHECK', 'Chèque'
    CARD = 'CARD', 'Carte bancaire'
    DIRECT_DEBIT = 'DIRECT_DEBIT', 'Prélèvement automatique'
    OTHER = 'OTHER', 'Autre'


class PaymentStatus(models.TextChoices):
    COMPLETED = 'COMPLETED', 'Validé / Encaissé'
    PENDING = 'PENDING', 'En attente de compensation'
    CANCELLED = 'CANCELLED', 'Annulé / Rejeté'
