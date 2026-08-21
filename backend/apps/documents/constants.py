from django.db import models


class DocumentType(models.TextChoices):
    LEASE_CONTRACT = 'LEASE_CONTRACT', 'Contrat de bail'
    ID_CARD = 'ID_CARD', 'Pièce d’identité'
    RENT_RECEIPT = 'RENT_RECEIPT', 'Quittance de loyer'
    INVOICE = 'INVOICE', 'Facture / Avis d’échéance'
    TAX_NOTICE = 'TAX_NOTICE', 'Avis fiscal'
    INSURANCE = 'INSURANCE', 'Contrat d’assurance'
    PROPERTY_DEED = 'PROPERTY_DEED', 'Titre de propriété'
    PHOTO = 'PHOTO', 'Photo / État des lieux'
    OTHER = 'OTHER', 'Autre document'
