from django.conf import settings
from django.db import models
from common.models import BaseModel
from .constants import AuditAction


class AuditLog(BaseModel):
    """
    Immutable audit trail for tracking critical domain operations (Rule 30).
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
        verbose_name="Auteur de l'action"
    )
    action = models.CharField(
        max_length=30,
        choices=AuditAction.choices,
        db_index=True,
        verbose_name="Action"
    )
    resource_type = models.CharField(
        max_length=100,
        db_index=True,
        verbose_name="Type d'entité"
    )
    resource_id = models.CharField(
        max_length=100,
        db_index=True,
        verbose_name="Identifiant entité"
    )
    changes = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Détails des modifications (avant/après)"
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name="Adresse IP"
    )

    class Meta(BaseModel.Meta):
        verbose_name = "Trace d'audit"
        verbose_name_plural = "Traces d'audit"
        ordering = ['-created_at']

    def __str__(self):
        user_label = self.user.email if self.user else "Système"
        return f"{user_label} - {self.get_action_display()} {self.resource_type} #{self.resource_id} ({self.created_at})"
