from django.db import models


class AuditAction(models.TextChoices):
    CREATE = 'CREATE', 'Création'
    UPDATE = 'UPDATE', 'Modification'
    DELETE = 'DELETE', 'Suppression'
    CANCEL = 'CANCEL', 'Annulation'
    PAYMENT_ALLOCATION = 'ALLOCATE', 'Allocation de paiement'
    LOGIN = 'LOGIN', 'Connexion'
    LOGOUT = 'LOGOUT', 'Déconnexion'
