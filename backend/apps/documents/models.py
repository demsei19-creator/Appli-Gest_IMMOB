import uuid
from django.db import models
from django.utils import timezone
from common.models import OwnedModel
from apps.properties.models import Property, Unit
from apps.tenants.models import Tenant
from apps.leases.models import Lease
from .constants import DocumentType


class Document(OwnedModel):
    """
    Metadata and file tracking for uploaded and generated documents in GED (Rules 6, 7, 8).
    """
    doc_number = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        unique=True,
        db_index=True,
        verbose_name="Numéro de document de référence"
    )
    title = models.CharField(
        max_length=255,
        verbose_name="Titre du document"
    )
    document_type = models.CharField(
        max_length=30,
        choices=DocumentType.choices,
        default=DocumentType.OTHER,
        db_index=True,
        verbose_name="Catégorie de document"
    )
    file = models.FileField(
        upload_to='documents/%Y/%m/',
        verbose_name="Fichier"
    )
    file_size_bytes = models.PositiveBigIntegerField(
        null=True,
        blank=True,
        verbose_name="Taille en octets"
    )
    mime_type = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Type MIME"
    )
    property = models.ForeignKey(
        Property,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='documents',
        verbose_name="Immeuble rattaché"
    )
    unit = models.ForeignKey(
        Unit,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='documents',
        verbose_name="Logement rattaché"
    )
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='documents',
        verbose_name="Locataire rattaché"
    )
    lease = models.ForeignKey(
        Lease,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='documents',
        verbose_name="Bail rattaché"
    )
    description = models.TextField(
        blank=True,
        verbose_name="Description / Commentaires"
    )

    class Meta(OwnedModel.Meta):
        verbose_name = "Document"
        verbose_name_plural = "Documents & Fichiers"
        ordering = ['-created_at']

    def __str__(self):
        ref = self.doc_number or self.id.hex[:8]
        return f"[{ref}] {self.title} ({self.get_document_type_display()})"

    def save(self, *args, **kwargs):
        if not self.doc_number:
            now = timezone.now()
            self.doc_number = f"DOC-{now.strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)
