from django.db import models


class UserRole(models.TextChoices):
    OWNER = 'OWNER', 'Propriétaire'
    MANAGER = 'MANAGER', 'Gestionnaire'
    ACCOUNTANT = 'ACCOUNTANT', 'Comptable'
    TENANT = 'TENANT', 'Locataire (Futur portail)'
