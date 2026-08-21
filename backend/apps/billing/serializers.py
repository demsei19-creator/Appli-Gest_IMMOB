from decimal import Decimal
from django.utils import timezone
from rest_framework import serializers
from .models import RentInvoice
from .constants import InvoiceStatus
from apps.leases.serializers import LeaseDetailSerializer


class RentInvoiceSerializer(serializers.ModelSerializer):
    """List serializer for rent invoices."""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    lease_number = serializers.CharField(source='lease.lease_number', read_only=True)
    tenant_id = serializers.CharField(source='lease.tenant.id', read_only=True)
    tenant_name = serializers.CharField(source='lease.tenant.full_name', read_only=True)
    tenant_phone = serializers.CharField(source='lease.tenant.phone_number', read_only=True)
    unit_id = serializers.CharField(source='lease.unit.id', read_only=True)
    unit_number = serializers.CharField(source='lease.unit.unit_number', read_only=True)
    property_id = serializers.CharField(source='lease.unit.property.id', read_only=True)
    property_name = serializers.CharField(source='lease.unit.property.name', read_only=True)
    property_city = serializers.CharField(source='lease.unit.property.city', read_only=True)

    class Meta:
        model = RentInvoice
        fields = [
            'id',
            'lease',
            'lease_number',
            'tenant_id',
            'tenant_name',
            'tenant_phone',
            'unit_id',
            'unit_number',
            'property_id',
            'property_name',
            'property_city',
            'invoice_number',
            'period_start',
            'period_end',
            'due_date',
            'rent_amount',
            'charges_amount',
            'total_expected',
            'total_paid',
            'remaining_balance',
            'status',
            'status_display',
            'notes',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'invoice_number',
            'total_expected',
            'total_paid',
            'remaining_balance',
            'status',
            'status_display',
            'created_at',
            'updated_at',
        ]


class RentInvoiceDetailSerializer(RentInvoiceSerializer):
    """360° Detail serializer with full lease and payment allocation history."""
    lease_detail = LeaseDetailSerializer(source='lease', read_only=True)
    payments_allocations = serializers.SerializerMethodField()

    class Meta(RentInvoiceSerializer.Meta):
        fields = RentInvoiceSerializer.Meta.fields + ['lease_detail', 'payments_allocations']

    def get_payments_allocations(self, obj):
        return [
            {
                'id': str(alloc.id),
                'payment_id': str(alloc.payment.id),
                'payment_number': alloc.payment.payment_number,
                'payment_date': str(alloc.payment.payment_date),
                'payment_method': alloc.payment.payment_method,
                'allocated_amount': str(alloc.allocated_amount),
                'created_at': str(alloc.created_at),
            }
            for alloc in obj.allocations.filter(is_active=True).select_related('payment')
        ]


class RentInvoiceCreateSerializer(serializers.ModelSerializer):
    """Validation serializer for manual single rent invoice issuance."""
    rent_amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.00'), required=False)
    charges_amount = serializers.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), min_value=Decimal('0.00'), required=False)
    due_date = serializers.DateField(required=False)

    class Meta:
        model = RentInvoice
        fields = [
            'lease',
            'period_start',
            'period_end',
            'due_date',
            'rent_amount',
            'charges_amount',
            'notes',
        ]

    def validate(self, attrs):
        period_start = attrs.get('period_start')
        period_end = attrs.get('period_end')
        if period_start and period_end and period_end < period_start:
            raise serializers.ValidationError({"period_end": "La date de fin de période doit être postérieure au début."})
        return attrs


class BulkInvoiceGenerateSerializer(serializers.Serializer):
    """Payload for 1-click batch generation of monthly invoices."""
    month = serializers.IntegerField(min_value=1, max_value=12, default=timezone.now().month)
    year = serializers.IntegerField(min_value=2020, max_value=2050, default=timezone.now().year)
    property_id = serializers.UUIDField(required=False, allow_null=True)


class InvoiceCancelSerializer(serializers.Serializer):
    """Payload for cancelling an unpaid invoice."""
    reason = serializers.CharField(required=False, allow_blank=True)
