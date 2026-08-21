from decimal import Decimal
from rest_framework import serializers
from .models import Property, Unit
from .constants import PropertyType, UnitStatus, UnitType


class UnitSerializer(serializers.ModelSerializer):
    """List serializer for units."""
    unit_type_display = serializers.CharField(source='get_unit_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    property_name = serializers.CharField(source='property.name', read_only=True)
    total_rent_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Unit
        fields = [
            'id',
            'property',
            'property_name',
            'unit_number',
            'floor',
            'unit_type',
            'unit_type_display',
            'surface_area_sqm',
            'rooms_count',
            'bathrooms_count',
            'base_rent_amount',
            'service_charges_amount',
            'total_rent_amount',
            'status',
            'status_display',
            'water_meter_number',
            'electricity_meter_number',
            'description',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class UnitDetailSerializer(UnitSerializer):
    """Detail serializer for a unit, with current tenant & active lease info."""
    current_lease = serializers.SerializerMethodField()

    class Meta(UnitSerializer.Meta):
        fields = UnitSerializer.Meta.fields + ['current_lease']

    def get_current_lease(self, obj):
        active_lease = obj.get_active_lease()
        if not active_lease:
            return None
        return {
            'id': str(active_lease.id),
            'tenant_id': str(active_lease.tenant.id),
            'tenant_name': active_lease.tenant.full_name,
            'tenant_phone': active_lease.tenant.phone_number,
            'tenant_email': active_lease.tenant.email,
            'start_date': str(active_lease.start_date),
            'end_date': str(active_lease.end_date) if active_lease.end_date else None,
            'total_monthly_amount': str(active_lease.total_monthly_amount),
            'payment_day_of_month': active_lease.payment_day_of_month,
        }


class UnitCreateUpdateSerializer(serializers.ModelSerializer):
    """Validation serializer for creating and updating units."""
    base_rent_amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.00'))
    service_charges_amount = serializers.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), min_value=Decimal('0.00'))
    surface_area_sqm = serializers.DecimalField(max_digits=8, decimal_places=2, required=False, allow_null=True, min_value=Decimal('0.00'))

    class Meta:
        model = Unit
        fields = [
            'unit_number',
            'floor',
            'unit_type',
            'surface_area_sqm',
            'rooms_count',
            'bathrooms_count',
            'base_rent_amount',
            'service_charges_amount',
            'water_meter_number',
            'electricity_meter_number',
            'description',
            'status',
        ]

    def validate_unit_number(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError("Le numéro ou identifiant du lot est obligatoire.")
        return val


class UnitStatusUpdateSerializer(serializers.Serializer):
    """Validation serializer for transitioning unit status."""
    status = serializers.ChoiceField(choices=UnitStatus.choices, required=True)
    reason = serializers.CharField(required=False, allow_blank=True)


class PropertySerializer(serializers.ModelSerializer):
    """List serializer for properties."""
    property_type_display = serializers.CharField(source='get_property_type_display', read_only=True)
    units_count = serializers.IntegerField(read_only=True)
    occupied_units_count = serializers.IntegerField(read_only=True)
    vacant_units_count = serializers.IntegerField(read_only=True)
    occupancy_rate = serializers.FloatField(read_only=True)
    total_monthly_revenue_potential = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    actual_monthly_revenue = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = Property
        fields = [
            'id',
            'name',
            'code',
            'property_type',
            'property_type_display',
            'address',
            'city',
            'postal_code',
            'country',
            'description',
            'notes',
            'purchase_price',
            'estimated_value',
            'cover_image',
            'units_count',
            'occupied_units_count',
            'vacant_units_count',
            'occupancy_rate',
            'total_monthly_revenue_potential',
            'actual_monthly_revenue',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id', 'units_count', 'occupied_units_count', 'vacant_units_count',
            'occupancy_rate', 'total_monthly_revenue_potential', 'actual_monthly_revenue',
            'created_at', 'updated_at'
        ]


class PropertyDetailSerializer(PropertySerializer):
    """Detail serializer for property with embedded units."""
    units = UnitSerializer(many=True, read_only=True)

    class Meta(PropertySerializer.Meta):
        fields = PropertySerializer.Meta.fields + ['units']


class PropertyCreateUpdateSerializer(serializers.ModelSerializer):
    """Validation serializer for creating and updating properties."""
    purchase_price = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, allow_null=True, min_value=Decimal('0.00'))
    estimated_value = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, allow_null=True, min_value=Decimal('0.00'))

    class Meta:
        model = Property
        fields = [
            'name',
            'code',
            'property_type',
            'address',
            'city',
            'postal_code',
            'country',
            'description',
            'notes',
            'purchase_price',
            'estimated_value',
            'cover_image',
        ]

    def validate_name(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError("Le nom de l'immeuble / propriété est obligatoire.")
        return val
