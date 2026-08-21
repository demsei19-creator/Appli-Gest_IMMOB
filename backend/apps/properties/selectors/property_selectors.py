from decimal import Decimal
from django.db.models import QuerySet, Q, Count, Prefetch
from common.exceptions import ResourceNotFoundException
from ..models import Property, Unit
from ..constants import UnitStatus
from .unit_selectors import get_units_for_user



def get_properties_for_user(user, search: str = None, property_type: str = None, city: str = None) -> QuerySet[Property]:
    """
    Retrieve all properties owned by or accessible to the user (Rule 8 & 32).
    Prefetches units for lightning-fast KPI computations without N+1 queries.
    """
    effective_owner = user.get_effective_owner() if hasattr(user, 'get_effective_owner') else user
    
    qs = Property.objects.filter(
        owner=effective_owner,
        is_active=True
    ).prefetch_related(
        Prefetch('units', queryset=Unit.objects.filter(is_active=True))
    )

    if search:
        search = search.strip()
        qs = qs.filter(
            Q(name__icontains=search) |
            Q(code__icontains=search) |
            Q(address__icontains=search) |
            Q(city__icontains=search)
        )

    if property_type:
        qs = qs.filter(property_type=property_type)

    if city:
        qs = qs.filter(city__icontains=city)

    return qs.order_by('name')


def get_property_detail(user, property_id: str) -> Property:
    """
    Retrieves full detail of a property with its units and tenant leases.
    """
    effective_owner = user.get_effective_owner() if hasattr(user, 'get_effective_owner') else user
    try:
        return Property.objects.prefetch_related(
            Prefetch(
                'units',
                queryset=Unit.objects.filter(is_active=True).prefetch_related(
                    Prefetch('leases', queryset=Unit.objects.none()) # will be prefetched dynamically
                )
            )
        ).get(
            id=property_id,
            owner=effective_owner,
            is_active=True
        )
    except Property.DoesNotExist:
        raise ResourceNotFoundException("Immeuble ou bien introuvable.", code="PROPERTY_NOT_FOUND")


def get_portfolio_kpis_for_user(user) -> dict:
    """
    Returns global portfolio overview KPIs across all owner properties.
    """
    properties = get_properties_for_user(user)
    total_properties = properties.count()

    total_units = 0
    occupied_units = 0
    vacant_units = 0
    total_potential = Decimal('0.00')
    actual_revenue = Decimal('0.00')

    for prop in properties:
        total_units += prop.units_count
        occupied_units += prop.occupied_units_count
        vacant_units += prop.vacant_units_count
        total_potential += prop.total_monthly_revenue_potential
        actual_revenue += prop.actual_monthly_revenue

    occupancy_rate = round((occupied_units / total_units * 100), 1) if total_units > 0 else 0.0

    return {
        'total_properties': total_properties,
        'total_units': total_units,
        'occupied_units': occupied_units,
        'vacant_units': vacant_units,
        'occupancy_rate_percent': occupancy_rate,
        'total_monthly_revenue_potential': str(total_potential),
        'actual_monthly_revenue': str(actual_revenue),
    }
