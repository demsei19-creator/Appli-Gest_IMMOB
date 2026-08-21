from decimal import Decimal
from rest_framework import serializers
from .models import Expense
from .constants import ExpenseCategory
from apps.properties.serializers import PropertySerializer, UnitDetailSerializer
from apps.maintenance.serializers import SupplierSerializer


class ExpenseSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    property_id = serializers.CharField(source='property.id', read_only=True)
    property_name = serializers.CharField(source='property.name', read_only=True)
    property_city = serializers.CharField(source='property.city', read_only=True)
    unit_id = serializers.CharField(source='unit.id', read_only=True)
    unit_number = serializers.CharField(source='unit.unit_number', read_only=True)
    supplier_id = serializers.CharField(source='supplier.id', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)

    class Meta:
        model = Expense
        fields = [
            'id',
            'expense_number',
            'property',
            'property_id',
            'property_name',
            'property_city',
            'unit',
            'unit_id',
            'unit_number',
            'supplier',
            'supplier_id',
            'supplier_name',
            'category',
            'category_display',
            'title',
            'amount',
            'expense_date',
            'paid_to',
            'receipt_file',
            'is_deductible',
            'notes',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'expense_number', 'created_at', 'updated_at']


class ExpenseDetailSerializer(ExpenseSerializer):
    property_detail = PropertySerializer(source='property', read_only=True)
    unit_detail = UnitDetailSerializer(source='unit', read_only=True)
    supplier_detail = SupplierSerializer(source='supplier', read_only=True)

    class Meta(ExpenseSerializer.Meta):
        fields = ExpenseSerializer.Meta.fields + [
            'property_detail',
            'unit_detail',
            'supplier_detail',
        ]


class ExpenseCreateUpdateSerializer(serializers.ModelSerializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'), required=True)

    class Meta:
        model = Expense
        fields = [
            'property',
            'unit',
            'supplier',
            'category',
            'title',
            'amount',
            'expense_date',
            'paid_to',
            'receipt_file',
            'is_deductible',
            'notes',
        ]
