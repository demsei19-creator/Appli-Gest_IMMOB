from decimal import Decimal
from rest_framework import serializers
from .models import Tenant, EmergencyContact, Guarantor
from .constants import TenantType, IdCardType


class EmergencyContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyContact
        fields = ['id', 'name', 'relationship', 'phone_number', 'created_at']
        read_only_fields = ['id', 'created_at']


class GuarantorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guarantor
        fields = [
            'id',
            'full_name',
            'relationship',
            'phone_number',
            'email',
            'id_card_number',
            'profession',
            'monthly_income',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class TenantSerializer(serializers.ModelSerializer):
    """List serializer for tenants with active lease summary & balance."""
    full_name = serializers.CharField(read_only=True)
    tenant_type_display = serializers.CharField(source='get_tenant_type_display', read_only=True)
    is_active_occupant = serializers.BooleanField(read_only=True)
    active_lease_summary = serializers.SerializerMethodField()
    total_unpaid_balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Tenant
        fields = [
            'id',
            'tenant_type',
            'tenant_type_display',
            'first_name',
            'last_name',
            'company_name',
            'full_name',
            'email',
            'phone_number',
            'secondary_phone',
            'id_card_type',
            'id_card_number',
            'tax_id',
            'profession',
            'employer',
            'monthly_income',
            'city',
            'country',
            'is_active_occupant',
            'active_lease_summary',
            'total_unpaid_balance',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'full_name', 'is_active_occupant', 'total_unpaid_balance', 'created_at', 'updated_at']

    def get_active_lease_summary(self, obj):
        active_lease = obj.get_active_lease()
        if not active_lease:
            return None
        return {
            'lease_id': str(active_lease.id),
            'property_name': active_lease.unit.property.name,
            'unit_number': active_lease.unit.unit_number,
            'start_date': str(active_lease.start_date),
            'monthly_amount': str(active_lease.total_monthly_amount),
        }


class TenantDetailSerializer(TenantSerializer):
    """360° Detail serializer for a single tenant."""
    emergency_contacts = EmergencyContactSerializer(many=True, read_only=True)
    guarantors = GuarantorSerializer(many=True, read_only=True)
    active_lease = serializers.SerializerMethodField()
    lease_history = serializers.SerializerMethodField()

    class Meta(TenantSerializer.Meta):
        fields = TenantSerializer.Meta.fields + [
            'address',
            'postal_code',
            'date_of_birth',
            'notes',
            'emergency_contacts',
            'guarantors',
            'active_lease',
            'lease_history',
        ]

    def get_active_lease(self, obj):
        active_lease = obj.get_active_lease()
        if not active_lease:
            return None
        return {
            'id': str(active_lease.id),
            'property_id': str(active_lease.unit.property.id),
            'property_name': active_lease.unit.property.name,
            'unit_id': str(active_lease.unit.id),
            'unit_number': active_lease.unit.unit_number,
            'unit_type': active_lease.unit.get_unit_type_display(),
            'start_date': str(active_lease.start_date),
            'end_date': str(active_lease.end_date) if active_lease.end_date else None,
            'rent_amount': str(active_lease.rent_amount),
            'charges_amount': str(active_lease.charges_amount),
            'total_monthly_amount': str(active_lease.total_monthly_amount),
            'deposit_amount': str(active_lease.deposit_amount),
            'payment_day_of_month': active_lease.payment_day_of_month,
            'status': active_lease.status,
        }

    def get_lease_history(self, obj):
        past_leases = obj.leases.filter(is_active=True).exclude(status='ACTIVE').select_related('unit__property').order_by('-start_date')[:10]
        return [
            {
                'id': str(l.id),
                'property_name': l.unit.property.name,
                'unit_number': l.unit.unit_number,
                'start_date': str(l.start_date),
                'end_date': str(l.end_date) if l.end_date else None,
                'status': l.status,
                'status_display': l.get_status_display(),
                'total_monthly_amount': str(l.total_monthly_amount),
            }
            for l in past_leases
        ]


class TenantCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for validating tenant creation & update."""
    emergency_contacts = EmergencyContactSerializer(many=True, required=False)

    class Meta:
        model = Tenant
        fields = [
            'tenant_type',
            'first_name',
            'last_name',
            'company_name',
            'email',
            'phone_number',
            'secondary_phone',
            'id_card_type',
            'id_card_number',
            'tax_id',
            'date_of_birth',
            'profession',
            'employer',
            'monthly_income',
            'address',
            'city',
            'postal_code',
            'country',
            'notes',
            'emergency_contacts',
        ]

    def validate(self, attrs):
        tenant_type = attrs.get('tenant_type', TenantType.INDIVIDUAL)
        if tenant_type == TenantType.COMPANY:
            if not attrs.get('company_name'):
                raise serializers.ValidationError({"company_name": "La raison sociale est requise pour une entreprise."})
        else:
            if not attrs.get('last_name') and not attrs.get('first_name'):
                raise serializers.ValidationError({"last_name": "Le nom du locataire est obligatoire."})

        phone = attrs.get('phone_number', '').strip()
        if not phone:
            raise serializers.ValidationError({"phone_number": "Le numéro de téléphone principal est obligatoire."})

        return attrs
