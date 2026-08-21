import uuid
from django.conf import settings
from django.db import models


class ActiveManager(models.Manager):
    """Custom manager filtering only active records by default."""
    def get_queryset(self):
        return super().get_queryset().filter(is_active=True)


class BaseModel(models.Model):
    """
    Abstract base model providing UUID primary key, timestamps, and soft deletion.
    All domain models should inherit from this model.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Identifiant unique universel (UUIDv4)"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Date de création"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Dernière modification"
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Actif",
        help_text="Indique si l'enregistrement est actif ou archivé (soft delete)"
    )

    objects = models.Manager()
    active_objects = ActiveManager()

    class Meta:
        abstract = True
        ordering = ['-created_at']

    def soft_delete(self):
        """Perform a logical deletion (preserves audit trail)."""
        self.is_active = False
        self.save(update_fields=['is_active', 'updated_at'])

    def restore(self):
        """Restore a logically deleted record."""
        self.is_active = True
        self.save(update_fields=['is_active', 'updated_at'])


class OwnedModel(BaseModel):
    """
    Abstract model for entities owned by a specific property owner.
    Enforces multi-tenant data isolation (Rule 8).
    """
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='%(class)s_owned',
        verbose_name="Propriétaire",
        help_text="Propriétaire gestionnaire de cette ressource"
    )

    class Meta:
        abstract = True
        ordering = ['-created_at']
