from django.db import models


class ExpenseCategory(models.TextChoices):
    REPAIRS = 'REPAIRS', 'Travaux & Réparations'
    MAINTENANCE = 'MAINTENANCE', 'Entretien courant'
    INSURANCE = 'INSURANCE', 'Assurance PNO / Immeuble'
    UTILITIES = 'UTILITIES', 'Eau & Électricité parties communes'
    MANAGEMENT_FEES = 'MANAGEMENT', 'Frais de gestion / Syndic'
    SECURITY = 'SECURITY', 'Gardiennage & Sécurité'
    MORTGAGE_INTEREST = 'MORTGAGE', 'Intérêts d’emprunt'
    OTHER = 'OTHER', 'Autres charges'
