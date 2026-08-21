from django.db.models import QuerySet, Q, Prefetch
from common.exceptions import ResourceNotFoundException
from ..models import Property, Unit
from apps.leases.models import Lease


def get_units_for_user(
    user,
    property_id: str = None,
    status: str = None,
    unit_type: str = None,
    search: str = None
) -> QuerySet[Unit]:
    """
    Retrieve all units across the user's properties with optional filters.
    """
    effective_owner = user.get_effective_owner() if hasattr(user, 'get_effective_owner') else user

    qs = Unit.objects.filter(
        property__owner=effective_owner,
        is_active=True,
        property__is_active=True
    ).select_related('property').prefetch_related(
        Prefetch(
            'leases',
            queryset=Lease.objects.filter(status='ACTIVE', is_active=True).select_related('tenant'),
            to_attr='prefetched_active_leases'
        )
    )

    if property_id:
        qs = qs.filter(property_id=property_id)

    if status:
        qs = qs.filter(status=status)

    if unit_type:
        qs = qs.filter(unit_type=unit_type)

    if search:
        search = search.strip()
        qs = qs.filter(
            Q(unit_number__icontains=search) |
            Q(property__name__icontains=search) |
            Q(property__city__icontains=search) |
            Q(water_meter_number__icontains=search) |
            Q(electricity_meter_number__icontains=search)
        )

    return qs.order_by('property__name', 'unit_number')


def get_unit_detail(user, unit_id: str) -> Unit:
    """
    Retrieves full detail of a unit with its active lease and tenant.
    """
    effective_owner = user.get_effective_owner() if hasattr(user, 'get_effective_owner') else user
    try:
        return Unit.objects.select_related('property').prefetch_related(
            Prefetch(
                'leases',
                queryset=Lease.objects.filter(status='ACTIVE', is_active=True).select_related('tenant')
            )
        ).get(
            id=unit_id,
            property__owner=effective_owner,
            is_active=True
        )
    except Unit.DoesNotExist:
        raise ResourceNotFoundException("Logement ou lot introuvable.", code="UNIT_NOT_FOUND")
