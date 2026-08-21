from django.conf import settings
from django.db import models
from common.models import BaseModel, OwnedModel


class Notification(OwnedModel):
    """
    Internal in-app notification for users.
    """
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name="Destinataire"
    )
    title = models.CharField(
        max_length=255,
        verbose_name="Titre"
    )
    message = models.TextField(
        verbose_name="Contenu de la notification"
    )
    is_read = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Lue"
    )
    read_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Date de lecture"
    )
    link = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Lien d'action / Redirection"
    )

    class Meta(OwnedModel.Meta):
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} -> {self.recipient.email} ({'Lue' if self.is_read else 'Non lue'})"


class EmailTemplate(BaseModel):
    """
    Reusable email template for automated communications (receipts, notices, reminders).
    """
    name = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="Identifiant unique template"
    )
    subject = models.CharField(
        max_length=255,
        verbose_name="Objet de l'email"
    )
    body_html = models.TextField(
        verbose_name="Corps HTML"
    )
    body_text = models.TextField(
        blank=True,
        verbose_name="Corps texte brut"
    )

    class Meta(BaseModel.Meta):
        verbose_name = "Modèle d'email"
        verbose_name_plural = "Modèles d'email"

    def __str__(self):
        return self.name
