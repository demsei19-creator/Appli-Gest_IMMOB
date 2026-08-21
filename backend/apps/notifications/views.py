from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Notification
from .serializers import NotificationSerializer
from .selectors.notification_selectors import get_notifications_for_user, get_unread_count


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return get_notifications_for_user(self.request.user)

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save(update_fields=['is_read', 'read_at', 'updated_at'])
        return Response({"success": True, "data": NotificationSerializer(notification).data})

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        get_notifications_for_user(request.user).filter(is_read=False).update(
            is_read=True,
            read_at=timezone.now()
        )
        return Response({"success": True, "message": "Toutes les notifications ont été marquées comme lues."})

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        count = get_unread_count(request.user)
        return Response({"success": True, "data": {"unread_count": count}})
