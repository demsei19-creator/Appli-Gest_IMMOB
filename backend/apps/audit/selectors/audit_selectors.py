from django.db.models import QuerySet
from ..models import AuditLog


def get_audit_logs_for_admin(user) -> QuerySet[AuditLog]:
    """Retrieve audit logs for administration view."""
    return AuditLog.objects.filter(is_active=True).select_related('user')
