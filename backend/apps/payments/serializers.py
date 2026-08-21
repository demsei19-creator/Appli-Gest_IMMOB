from decimal import Decimal
from rest_framework import serializers
from .models import Payment, PaymentAllocation
from .constants import PaymentMethod, PaymentStatus
from apps.tenants.serializers import TenantDetailSerializer


class PaymentAllocationSerializer(serializers.ModelSerializer):
    invoice_id = serializers.CharField(source='invoice.id', read_only=True)
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    period_start = serializers.DateField(source='invoice.period_start', read_only=True)
    period_end = serializers.DateField(source='invoice.period_end', read_only=True)
    property_name = serializers.CharField(source='invoice.lease.unit.property.name', read_only=True)
    unit_number = serializers.CharField(source='invoice.lease.unit.unit_number', read_only=True)

    class Meta:
        model = PaymentAllocation
        fields = [
            'id',
            'invoice_id',
            'invoice_number',
            'period_start',
            'period_end',
            'property_name',
            'unit_number',
            'allocated_amount',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class PaymentSerializer(serializers.ModelSerializer):
    """List serializer for payments."""
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    tenant_name = serializers.CharField(source='tenant.full_name', read_only=True)
    tenant_phone = serializers.CharField(source='tenant.phone_number', read_only=True)
    allocations_count = serializers.IntegerField(source='allocations.count', read_only=True)
    total_allocated = serializers.DecimalField(source='total_allocated_amount', max_digits=14, decimal_places=2, read_only=True)
    unallocated = serializers.DecimalField(source='unallocated_amount', max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id',
            'tenant',
            'tenant_name',
            'tenant_phone',
            'payment_number',
            'receipt_number',
            'amount',
            'payment_date',
            'payment_method',
            'payment_method_display',
            'reference_number',
            'status',
            'status_display',
            'allocations_count',
            'total_allocated',
            'unallocated',
            'notes',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'payment_number',
            'receipt_number',
            'status',
            'status_display',
            'total_allocated',
            'unallocated',
            'created_at',
            'updated_at',
        ]


class PaymentDetailSerializer(PaymentSerializer):
    """360° Detail serializer with embedded tenant detail and allocations list."""
    tenant_detail = TenantDetailSerializer(source='tenant', read_only=True)
    allocations = PaymentAllocationSerializer(many=True, read_only=True)

    class Meta(PaymentSerializer.Meta):
        fields = PaymentSerializer.Meta.fields + ['tenant_detail', 'allocations']


class ManualAllocationItemSerializer(serializers.Serializer):
    invoice_id = serializers.UUIDField(required=True)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))


class PaymentCreateSerializer(serializers.Serializer):
    """Validation serializer for recording a payment with auto FIFO or manual allocations."""
    tenant = serializers.UUIDField(required=True)
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal('0.01'))
    payment_date = serializers.DateField(required=True)
    payment_method = serializers.ChoiceField(choices=PaymentMethod.choices, default=PaymentMethod.BANK_TRANSFER)
    reference_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    auto_allocate_fifo = serializers.BooleanField(default=True)
    manual_allocations = ManualAllocationItemSerializer(many=True, required=False, default=list)


class PaymentCancelSerializer(serializers.Serializer):
    """Payload for cancelling a payment."""
    reason = serializers.CharField(required=False, allow_blank=True)
