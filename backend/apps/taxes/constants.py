from django.db import models


class TaxType(models.TextChoices):
    PROPERTY_TAX = 'PROPERTY_TAX', 'Taxe Foncière'
    HOUSING_TAX = 'HOUSING_TAX', 'Taxe d’habitation'
    INCOME_TAX = 'INCOME_TAX', 'Impôt sur les revenus locatifs'
    LOCAL_DEVELOPMENT = 'LOCAL_DEV', 'Taxe d’aménagement locale'
    OTHER = 'OTHER', 'Autre taxe'
