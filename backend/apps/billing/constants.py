from django.db import models


class InvoiceStatus(models.TextChoices):
    UNPAID = 'UNPAID', 'Impayé / Non réglé'
    PARTIAL = 'PARTIAL', 'Partiellement payé'
    PAID = 'PAID', 'Payé intégralement'
    OVERDUE = 'OVERDUE', 'En retard d’échéance'
    CANCELLED = 'CANCELLED', 'Annulée'
