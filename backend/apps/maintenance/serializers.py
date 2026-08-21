from decimal import Decimal
from rest_framework import serializers
from .models import Supplier, MaintenanceRequest
from .constants import MaintenancePriority, MaintenanceStatus, SupplierCategory
from apps.properties.serializers import PropertySerializer, UnitDetailSerializer
from apps.tenants.serializers import TenantDetailSerializer


class SupplierSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    total_interventions_count = serializers.IntegerField(read_only=True)
    total_spent = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Supplier
        fields = [
            'id',
            'name',
            'category',
            'category_display',
            'contact_name',
            'phone_number',
            'email',
            'address',
            'tax_id',
            'notes',
            'total_interventions_count',
            'total_spent',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'total_interventions_count', 'total_spent', 'created_at', 'updated_at']


class MaintenanceRequestSerializer(serializers.ModelSerializer):
    """List serializer for maintenance tickets."""
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    property_id = serializers.CharField(source='property.id', read_only=True)
    property_name = serializers.CharField(source='property.name', read_only=True)
    property_city = serializers.CharField(source='property.city', read_only=True)
    unit_id = serializers.CharField(source='unit.id', read_only=True)
    unit_number = serializers.CharField(source='unit.unit_number', read_only=True)
    tenant_id = serializers.CharField(source='reported_by_tenant.id', read_only=True)
    tenant_name = serializers.CharField(source='reported_by_tenant.full_name', read_only=True)
    tenant_phone = serializers.CharField(source='reported_by_tenant.phone_number', read_only=True)
    supplier_id = serializers.CharField(source='supplier.id', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    supplier_phone = serializers.CharField(source='supplier.phone_number', read_only=True)
    supplier_category = serializers.CharField(source='supplier.get_category_display', read_only=True)

    class Meta:
        model = MaintenanceRequest
        fields = [
            'id',
            'ticket_number',
            'property',
            'property_id',
            'property_name',
            'property_city',
            'unit',
            'unit_id',
            'unit_number',
            'reported_by_tenant',
            'tenant_id',
            'tenant_name',
            'tenant_phone',
            'supplier',
            'supplier_id',
            'supplier_name',
            'supplier_phone',
            'supplier_category',
            'title',
            'description',
            'priority',
            'priority_display',
            'status',
            'status_display',
            'estimated_cost',
            'actual_cost',
            'reported_date',
            'completed_date',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'ticket_number', 'reported_date', 'created_at', 'updated_at']


class MaintenanceRequestDetailSerializer(MaintenanceRequestSerializer):
    """360° Detail serializer with full related objects."""
    property_detail = PropertySerializer(source='property', read_only=True)
    unit_detail = UnitDetailSerializer(source='unit', read_only=True)
    tenant_detail = TenantDetailSerializer(source='reported_by_tenant', read_only=True)
    supplier_detail = SupplierSerializer(source='supplier', read_only=True)

    class Meta(MaintenanceRequestSerializer.Meta):
        fields = MaintenanceRequestSerializer.Meta.fields + [
            'property_detail',
            'unit_detail',
            'tenant_detail',
            'supplier_detail',
        ]


class SupplierDetailSerializer(SupplierSerializer):
    """360° Detail serializer with interventions history."""
    interventions = MaintenanceRequestSerializer(many=True, read_only=True)

    class Meta(SupplierSerializer.Meta):
        fields = SupplierSerializer.Meta.fields + ['interventions']


class MaintenanceRequestCreateUpdateSerializer(serializers.ModelSerializer):
    """Validation serializer for creating and updating maintenance requests."""
    estimated_cost = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.00'), required=False, allow_null=True)
    actual_cost = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.00'), required=False, allow_null=True)

    class Meta:
        model = MaintenanceRequest
        fields = [
            'property',
            'unit',
            'reported_by_tenant',
            'supplier',
            'title',
            'description',
            'priority',
            'status',
            'estimated_cost',
            'actual_cost',
            'completed_date',
        ]


class MaintenanceAssignSupplierSerializer(serializers.Serializer):
    """Payload for assigning a craftsperson to a ticket."""
    supplier_id = serializers.UUIDField(required=True)
    estimated_cost = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.00'), required=False, allow_null=True)


class MaintenanceStatusUpdateSerializer(serializers.Serializer):
    """Payload for updating ticket lifecycle status and recording final cost."""
    status = serializers.ChoiceField(choices=MaintenanceStatus.choices)
    actual_cost = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.00'), required=False, allow_null=True)
    completed_date = serializers.DateField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)
