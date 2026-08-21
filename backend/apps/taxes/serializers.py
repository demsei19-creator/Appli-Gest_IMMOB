from decimal import Decimal
from rest_framework import serializers
from .models import PropertyTax
from .constants import TaxType
from apps.properties.serializers import PropertySerializer


class PropertyTaxSerializer(serializers.ModelSerializer):
    tax_type_display = serializers.CharField(source='get_tax_type_display', read_only=True)
    property_id = serializers.CharField(source='property.id', read_only=True)
    property_name = serializers.CharField(source='property.name', read_only=True)
    property_city = serializers.CharField(source='property.city', read_only=True)

    class Meta:
        model = PropertyTax
        fields = [
            'id',
            'tax_number',
            'property',
            'property_id',
            'property_name',
            'property_city',
            'tax_type',
            'tax_type_display',
            'fiscal_year',
            'amount',
            'due_date',
            'paid_date',
            'is_paid',
            'reference_notice',
            'notice_file',
            'notes',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'tax_number', 'created_at', 'updated_at']


class PropertyTaxDetailSerializer(PropertyTaxSerializer):
    property_detail = PropertySerializer(source='property', read_only=True)

    class Meta(PropertyTaxSerializer.Meta):
        fields = PropertyTaxSerializer.Meta.fields + ['property_detail']


class PropertyTaxCreateUpdateSerializer(serializers.ModelSerializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'), required=True)

    class Meta:
        model = PropertyTax
        fields = [
            'property',
            'tax_type',
            'fiscal_year',
            'amount',
            'due_date',
            'paid_date',
            'is_paid',
            'reference_notice',
            'notice_file',
            'notes',
        ]


class PropertyTaxMarkPaidSerializer(serializers.Serializer):
    paid_date = serializers.DateField(required=False, allow_null=True)
