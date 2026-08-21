from rest_framework import serializers
from .models import Document
from .constants import DocumentType
from apps.properties.serializers import PropertySerializer, UnitSerializer
from apps.tenants.serializers import TenantSerializer
from apps.leases.serializers import LeaseSerializer


class DocumentSerializer(serializers.ModelSerializer):
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)
    property_name = serializers.CharField(source='property.name', read_only=True)
    unit_number = serializers.CharField(source='unit.unit_number', read_only=True)
    tenant_name = serializers.CharField(source='tenant.full_name', read_only=True)
    lease_contract_number = serializers.CharField(source='lease.contract_number', read_only=True)
    formatted_file_size = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'id',
            'doc_number',
            'title',
            'document_type',
            'document_type_display',
            'file',
            'file_url',
            'file_size_bytes',
            'formatted_file_size',
            'mime_type',
            'property',
            'property_name',
            'unit',
            'unit_number',
            'tenant',
            'tenant_name',
            'lease',
            'lease_contract_number',
            'description',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'doc_number', 'file_size_bytes', 'mime_type', 'created_at', 'updated_at']

    def get_formatted_file_size(self, obj) -> str:
        if not obj.file_size_bytes:
            return "0 Ko"
        size = obj.file_size_bytes
        if size < 1024:
            return f"{size} o"
        elif size < 1024 * 1024:
            return f"{size / 1024:.1f} Ko"
        else:
            return f"{size / (1024 * 1024):.2f} Mo"

    def get_file_url(self, obj) -> str:
        if obj.file:
            return obj.file.url
        return ""


class DocumentDetailSerializer(DocumentSerializer):
    property_detail = PropertySerializer(source='property', read_only=True)
    unit_detail = UnitSerializer(source='unit', read_only=True)
    tenant_detail = TenantSerializer(source='tenant', read_only=True)
    lease_detail = LeaseSerializer(source='lease', read_only=True)

    class Meta(DocumentSerializer.Meta):
        fields = DocumentSerializer.Meta.fields + [
            'property_detail',
            'unit_detail',
            'tenant_detail',
            'lease_detail',
        ]


class DocumentUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = [
            'title',
            'document_type',
            'file',
            'property',
            'unit',
            'tenant',
            'lease',
            'description',
        ]
        extra_kwargs = {
            'file': {'required': True},
            'title': {'required': True},
        }
