from decimal import Decimal
from django.db.models import QuerySet, Q
from common.exceptions import ResourceNotFoundException
from ..models import Lease, Deposit
from ..constants import LeaseStatus, DepositStatus


def get_leases_for_user(
    user,
    status: str = None,
    property_id: str = None,
    tenant_id: str = None,
    search: str = None
) -> QuerySet[Lease]:
    """
    Retrieve all leases for the user's owner context.
    Prefetches unit, property, tenant and deposit to prevent N+1 queries.
    """
    effective_owner = user.get_effective_owner() if hasattr(user, 'get_effective_owner') else user

    qs = Lease.objects.filter(
        owner=effective_owner,
        is_active=True
    ).select_related(
        'unit__property',
        'tenant',
        'deposit'
    )

    if status:
        qs = qs.filter(status=status)

    if property_id:
        qs = qs.filter(unit__property_id=property_id)

    if tenant_id:
        qs = qs.filter(tenant_id=tenant_id)

    if search:
        search = search.strip()
        qs = qs.filter(
            Q(lease_number__icontains=search) |
            Q(tenant__first_name__icontains=search) |
            Q(tenant__last_name__icontains=search) |
            Q(tenant__company_name__icontains=search) |
            Q(unit__unit_number__icontains=search) |
            Q(unit__property__name__icontains=search)
        )

    return qs.order_by('-start_date')


def get_active_leases_for_user(user) -> QuerySet[Lease]:
    """Retrieve currently active leases."""
    return get_leases_for_user(user, status=LeaseStatus.ACTIVE)


def get_lease_detail(user, lease_id: str) -> Lease:
    """Retrieve 360° detail of a single lease."""
    effective_owner = user.get_effective_owner() if hasattr(user, 'get_effective_owner') else user
    try:
        return Lease.objects.select_related(
            'unit__property',
            'tenant',
            'deposit'
        ).get(
            id=lease_id,
            owner=effective_owner,
            is_active=True
        )
    except Lease.DoesNotExist:
        raise ResourceNotFoundException("Contrat de bail introuvable.", code="LEASE_NOT_FOUND")


def get_leases_stats_for_user(user) -> dict:
    """
    Returns global lease statistics (active, draft, terminated, active monthly rent, total deposits collected).
    """
    leases = get_leases_for_user(user)

    active_count = 0
    draft_count = 0
    terminated_count = 0
    total_active_rent = Decimal('0.00')
    total_deposits_collected = Decimal('0.00')

    for l in leases:
        if l.status == LeaseStatus.ACTIVE:
            active_count += 1
            total_active_rent += l.total_monthly_amount
        elif l.status == LeaseStatus.DRAFT:
            draft_count += 1
        elif l.status == LeaseStatus.TERMINATED:
            terminated_count += 1

        if hasattr(l, 'deposit') and l.deposit.status == DepositStatus.PAID:
            total_deposits_collected += l.deposit.amount

    return {
        'total_leases': leases.count(),
        'active_leases_count': active_count,
        'draft_leases_count': draft_count,
        'terminated_leases_count': terminated_count,
        'total_active_monthly_rent': str(total_active_rent),
        'total_deposits_collected': str(total_deposits_collected),
    }
