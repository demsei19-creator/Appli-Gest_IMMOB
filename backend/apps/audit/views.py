from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from common.permissions import IsOwner
from .models import AuditLog
from .serializers import AuditLogSerializer
from .selectors.audit_selectors import get_audit_logs_for_admin


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only view of security and financial audit events (Rule 30).
    """
    permission_classes = [IsAuthenticated, IsOwner]
    serializer_class = AuditLogSerializer
    filterset_fields = ['action', 'resource_type']
    search_fields = ['resource_id', 'user__email']

    def get_queryset(self):
        return get_audit_logs_for_admin(self.request.user)
