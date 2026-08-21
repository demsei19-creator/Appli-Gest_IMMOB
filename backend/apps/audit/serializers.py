from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id',
            'user',
            'user_email',
            'action',
            'action_display',
            'resource_type',
            'resource_id',
            'changes',
            'ip_address',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']
