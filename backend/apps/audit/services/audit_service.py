from common.services import BaseService
from ..models import AuditLog


class AuditService(BaseService):
    """Logs sensitive events into immutable AuditLog table (Rule 30)."""

    @classmethod
    def log_action(cls, user, action: str, resource_type: str, resource_id: str, changes: dict = None, ip_address: str = None) -> AuditLog:
        return AuditLog.objects.create(
            user=user,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id),
            changes=changes or {},
            ip_address=ip_address
        )
