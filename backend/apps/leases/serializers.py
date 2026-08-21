from decimal import Decimal
from rest_framework import serializers
from .models import Lease, Deposit
from .constants import LeaseStatus, DepositStatus, PaymentFrequency
from apps.properties.models import Unit
from apps.tenants.models import Tenant
from apps.properties.serializers import UnitDetailSerializer
from apps.tenants.serializers import TenantDetailSerializer


class DepositSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Deposit
        fields = [
            'id',
            'lease',
            'amount',
            'received_date',
            'status',
            'status_display',
            'refunded_amount',
            'refunded_date',
            'deduction_amount',
            'deduction_reason',
            'payment_method',
            'receipt_reference',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DepositActionSerializer(serializers.Serializer):
    """Payload for deposit encashment, deduction, or refund."""
    action = serializers.ChoiceField(choices=['PAY', 'REFUND', 'RETAIN'])
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, min_value=Decimal('0.00'))
    payment_method = serializers.CharField(required=False, allow_blank=True)
    receipt_reference = serializers.CharField(required=False, allow_blank=True)
    reason = serializers.CharField(required=False, allow_blank=True)
    date = serializers.DateField(required=False)


class LeaseSerializer(serializers.ModelSerializer):
    """List serializer for leases."""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_frequency_display = serializers.CharField(source='get_payment_frequency_display', read_only=True)
    tenant_name = serializers.CharField(source='tenant.full_name', read_only=True)
    tenant_phone = serializers.CharField(source='tenant.phone_number', read_only=True)
    unit_number = serializers.CharField(source='unit.unit_number', read_only=True)
    property_id = serializers.CharField(source='unit.property.id', read_only=True)
    property_name = serializers.CharField(source='unit.property.name', read_only=True)
    property_city = serializers.CharField(source='unit.property.city', read_only=True)
    total_monthly_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    deposit = DepositSerializer(read_only=True)

    class Meta:
        model = Lease
        fields = [
            'id',
            'lease_number',
            'unit',
            'unit_number',
            'property_id',
            'property_name',
            'property_city',
            'tenant',
            'tenant_name',
            'tenant_phone',
            'start_date',
            'end_date',
            'rent_amount',
            'charges_amount',
            'total_monthly_amount',
            'deposit_amount',
            'payment_day_of_month',
            'payment_frequency',
            'payment_frequency_display',
            'status',
            'status_display',
            'termination_date',
            'termination_reason',
            'deposit',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'lease_number', 'total_monthly_amount', 'created_at', 'updated_at']


class LeaseDetailSerializer(LeaseSerializer):
    """360° Detail serializer with full unit and tenant sub-objects."""
    unit_detail = UnitDetailSerializer(source='unit', read_only=True)
    tenant_detail = TenantDetailSerializer(source='tenant', read_only=True)

    class Meta(LeaseSerializer.Meta):
        fields = LeaseSerializer.Meta.fields + ['terms_and_conditions', 'unit_detail', 'tenant_detail']


class LeaseCreateUpdateSerializer(serializers.ModelSerializer):
    """Validation serializer for creating and updating leases."""
    rent_amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.00'))
    charges_amount = serializers.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), min_value=Decimal('0.00'))
    deposit_amount = serializers.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), min_value=Decimal('0.00'))
    payment_day_of_month = serializers.IntegerField(min_value=1, max_value=31, default=5)

    class Meta:
        model = Lease
        fields = [
            'unit',
            'tenant',
            'lease_number',
            'start_date',
            'end_date',
            'rent_amount',
            'charges_amount',
            'deposit_amount',
            'payment_day_of_month',
            'payment_frequency',
            'status',
            'terms_and_conditions',
        ]

    def validate(self, attrs):
        start_date = attrs.get('start_date')
        end_date = attrs.get('end_date')
        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({"end_date": "La date de fin de bail doit être postérieure à la date de début."})
        return attrs


class LeaseTerminateSerializer(serializers.Serializer):
    """Validation serializer for terminating a lease."""
    termination_date = serializers.DateField(required=True)
    reason = serializers.CharField(required=False, allow_blank=True)
    next_unit_status = serializers.ChoiceField(
        choices=['VACANT', 'MAINTENANCE'],
        default='VACANT'
    )
