from decimal import Decimal
from django.db.models import QuerySet, Sum, Q, Count
from django.utils import timezone
from common.exceptions import ResourceNotFoundException
from common.utils.financial import quantize_amount
from ..models import MaintenanceRequest, Supplier
from ..constants import MaintenanceStatus, MaintenancePriority


def get_maintenance_requests_for_user(
    user,
    status: str = None,
    priority: str = None,
    property_id: str = None,
    unit_id: str = None,
    supplier_id: str = None,
    search: str = None
) -> QuerySet[MaintenanceRequest]:
    """
    Retrieve all maintenance tickets for the user's owner scope with prefetched relationships.
    """
    effective_owner = user.get_effective_owner() if hasattr(user, 'get_effective_owner') else user

    qs = MaintenanceRequest.objects.filter(
        owner=effective_owner,
        is_active=True
    ).select_related(
        'property',
        'unit',
        'reported_by_tenant',
        'supplier'
    )

    if status:
        qs = qs.filter(status=status)

    if priority:
        qs = qs.filter(priority=priority)

    if property_id:
        qs = qs.filter(property_id=property_id)

    if unit_id:
        qs = qs.filter(unit_id=unit_id)

    if supplier_id:
        qs = qs.filter(supplier_id=supplier_id)

    if search:
        search = search.strip()
        qs = qs.filter(
            Q(ticket_number__icontains=search) |
            Q(title__icontains=search) |
            Q(description__icontains=search) |
            Q(property__name__icontains=search) |
            Q(unit__unit_number__icontains=search) |
            Q(supplier__name__icontains=search) |
            Q(reported_by_tenant__first_name__icontains=search) |
            Q(reported_by_tenant__last_name__icontains=search)
        )

    return qs.order_by('-reported_date', '-created_at')


def get_maintenance_request_detail(user, request_id: str) -> MaintenanceRequest:
    """Retrieve 360° detail of a single maintenance ticket."""
    effective_owner = user.get_effective_owner() if hasattr(user, 'get_effective_owner') else user
    try:
        return MaintenanceRequest.objects.select_related(
            'property',
            'unit',
            'reported_by_tenant',
            'supplier'
        ).get(
            id=request_id,
            owner=effective_owner,
            is_active=True
        )
    except MaintenanceRequest.DoesNotExist:
        raise ResourceNotFoundException("Ticket d'intervention introuvable.", code="MAINTENANCE_NOT_FOUND")


def get_maintenance_stats_for_user(user) -> dict:
    """
    Returns maintenance technical and financial KPIs.
    """
    effective_owner = user.get_effective_owner() if hasattr(user, 'get_effective_owner') else user
    qs = MaintenanceRequest.objects.filter(owner=effective_owner, is_active=True)

    today = timezone.now().date()
    open_statuses = [MaintenanceStatus.REPORTED, MaintenanceStatus.ASSIGNED, MaintenanceStatus.IN_PROGRESS]
    urgent_priorities = [MaintenancePriority.HIGH, MaintenancePriority.URGENT]

    total_requests = qs.count()
    open_requests = qs.filter(status__in=open_statuses).count()
    urgent_open_requests = qs.filter(status__in=open_statuses, priority__in=urgent_priorities).count()

    completed_this_month = qs.filter(
        status=MaintenanceStatus.COMPLETED,
        completed_date__year=today.year,
        completed_date__month=today.month
    ).count()

    total_cost_completed = qs.filter(
        status=MaintenanceStatus.COMPLETED
    ).aggregate(total=Sum('actual_cost'))['total'] or Decimal('0.00')

    return {
        'total_requests': total_requests,
        'open_requests': open_requests,
        'urgent_open_requests': urgent_open_requests,
        'completed_this_month': completed_this_month,
        'total_actual_cost': str(quantize_amount(total_cost_completed)),
    }


def get_suppliers_for_user(
    user,
    category: str = None,
    search: str = None
) -> QuerySet[Supplier]:
    """
    Retrieve suppliers and craftspersons with precalculated counts.
    """
    effective_owner = user.get_effective_owner() if hasattr(user, 'get_effective_owner') else user

    qs = Supplier.objects.filter(
        owner=effective_owner,
        is_active=True
    ).prefetch_related('interventions')

    if category:
        qs = qs.filter(category=category)

    if search:
        search = search.strip()
        qs = qs.filter(
            Q(name__icontains=search) |
            Q(contact_name__icontains=search) |
            Q(phone_number__icontains=search) |
            Q(email__icontains=search) |
            Q(notes__icontains=search)
        )

    return qs.order_by('name')


def get_supplier_detail(user, supplier_id: str) -> Supplier:
    """Retrieve single supplier detail with interventions history."""
    effective_owner = user.get_effective_owner() if hasattr(user, 'get_effective_owner') else user
    try:
        return Supplier.objects.prefetch_related(
            'interventions__property',
            'interventions__unit'
        ).get(
            id=supplier_id,
            owner=effective_owner,
            is_active=True
        )
    except Supplier.DoesNotExist:
        raise ResourceNotFoundException("Fournisseur introuvable.", code="SUPPLIER_NOT_FOUND")
