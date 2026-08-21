from rest_framework import serializers
from .models import Notification, EmailTemplate


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id',
            'title',
            'message',
            'is_read',
            'read_at',
            'link',
            'created_at',
        ]
        read_only_fields = ['id', 'title', 'message', 'link', 'created_at']


class EmailTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailTemplate
        fields = [
            'id',
            'name',
            'subject',
            'body_html',
            'body_text',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
