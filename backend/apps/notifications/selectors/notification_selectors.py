from django.db.models import QuerySet
from ..models import Notification


def get_notifications_for_user(user) -> QuerySet[Notification]:
    return Notification.objects.filter(recipient=user, is_active=True).order_by('-created_at')


def get_unread_count(user) -> int:
    return Notification.objects.filter(recipient=user, is_read=False, is_active=True).count()
