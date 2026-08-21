from decimal import Decimal
from django.db.models import QuerySet, Q, Prefetch
from common.exceptions import ResourceNotFoundException
from ..models import Tenant, EmergencyContact, Guarantor
from apps.leases.models import Lease


def get_tenants_for_user(
    user,
    search: str = None,
    is_active_occupant: bool = None,
    tenant_type: str = None
) -> QuerySet[Tenant]:
    """
    Retrieve all tenants owned by the user's effective owner.
    Prefetches active leases to avoid N+1 queries.
    """
    effective_owner = user.get_effective_owner() if hasattr(user, 'get_effective_owner') else user

    qs = Tenant.objects.filter(
        owner=effective_owner,
        is_active=True
    ).prefetch_related(
        Prefetch(
            'leases',
            queryset=Lease.objects.filter(status='ACTIVE', is_active=True).select_related('unit__property')
        ),
        'emergency_contacts',
        'guarantors'
    )

    if search:
        search = search.strip()
        qs = qs.filter(
            Q(first_name__icontains=search) |
            Q(last_name__icontains=search) |
            Q(company_name__icontains=search) |
            Q(phone_number__icontains=search) |
            Q(secondary_phone__icontains=search) |
            Q(email__icontains=search) |
            Q(id_card_number__icontains=search) |
            Q(tax_id__icontains=search)
        )

    if tenant_type:
        qs = qs.filter(tenant_type=tenant_type)

    if is_active_occupant is not None:
        if is_active_occupant:
            qs = qs.filter(leases__status='ACTIVE', leases__is_active=True).distinct()
        else:
            qs = qs.exclude(leases__status='ACTIVE', leases__is_active=True).distinct()

    return qs.order_by('last_name', 'first_name', 'company_name')


def get_tenant_detail(user, tenant_id: str) -> Tenant:
    """
    Retrieve 360° detail of a tenant with leases, units, contacts, and guarantors.
    """
    effective_owner = user.get_effective_owner() if hasattr(user, 'get_effective_owner') else user
    try:
        return Tenant.objects.prefetch_related(
            Prefetch(
                'leases',
                queryset=Lease.objects.filter(is_active=True).select_related('unit__property')
            ),
            'emergency_contacts',
            'guarantors'
        ).get(
            id=tenant_id,
            owner=effective_owner,
            is_active=True
        )
    except Tenant.DoesNotExist:
        raise ResourceNotFoundException("Locataire introuvable.", code="TENANT_NOT_FOUND")


def get_tenants_stats_for_user(user) -> dict:
    """
    Aggregates global metrics across all tenants.
    """
    tenants = get_tenants_for_user(user)
    total_tenants = tenants.count()

    active_occupants_count = 0
    total_unpaid_sum = Decimal('0.00')

    for t in tenants:
        if t.is_active_occupant:
            active_occupants_count += 1
        total_unpaid_sum += t.total_unpaid_balance

    former_tenants_count = total_tenants - active_occupants_count

    return {
        'total_tenants': total_tenants,
        'active_occupants_count': active_occupants_count,
        'former_tenants_count': former_tenants_count,
        'total_unpaid_balance': str(total_unpaid_sum),
    }
