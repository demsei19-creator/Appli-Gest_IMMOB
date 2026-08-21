from decimal import Decimal
from django.db.models import QuerySet, Sum, Q
from django.utils import timezone
from common.exceptions import ResourceNotFoundException
from common.utils.financial import quantize_amount
from ..models import RentInvoice
from ..constants import InvoiceStatus


def get_invoices_for_user(
    user,
    status: str = None,
    property_id: str = None,
    tenant_id: str = None,
    month: int = None,
    year: int = None,
    search: str = None
) -> QuerySet[RentInvoice]:
    """
    Retrieve all rent invoices for the user's owner context with prefetched relationships.
    """
    effective_owner = user.get_effective_owner() if hasattr(user, 'get_effective_owner') else user

    qs = RentInvoice.objects.filter(
        owner=effective_owner,
        is_active=True
    ).select_related(
        'lease__tenant',
        'lease__unit__property'
    )

    if status:
        qs = qs.filter(status=status)

    if property_id:
        qs = qs.filter(lease__unit__property_id=property_id)

    if tenant_id:
        qs = qs.filter(lease__tenant_id=tenant_id)

    if month:
        qs = qs.filter(period_start__month=month)

    if year:
        qs = qs.filter(period_start__year=year)

    if search:
        search = search.strip()
        qs = qs.filter(
            Q(invoice_number__icontains=search) |
            Q(lease__lease_number__icontains=search) |
            Q(lease__tenant__first_name__icontains=search) |
            Q(lease__tenant__last_name__icontains=search) |
            Q(lease__tenant__company_name__icontains=search) |
            Q(lease__unit__unit_number__icontains=search) |
            Q(lease__unit__property__name__icontains=search)
        )

    return qs.order_by('-due_date', '-created_at')


def get_unpaid_invoices_for_user(user) -> QuerySet[RentInvoice]:
    """Retrieve invoices that are unpaid, partially paid or overdue."""
    return get_invoices_for_user(user).filter(status__in=[InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE])


def get_total_expected_revenue(user) -> Decimal:
    """Calculates total expected rent revenue."""
    qs = get_invoices_for_user(user).exclude(status=InvoiceStatus.CANCELLED)
    result = qs.aggregate(total=Sum('total_expected'))['total']
    return result or Decimal('0.00')


def get_total_collected_revenue(user) -> Decimal:
    """Calculates total collected revenue."""
    qs = get_invoices_for_user(user).exclude(status=InvoiceStatus.CANCELLED)
    result = qs.aggregate(total=Sum('total_paid'))['total']
    return result or Decimal('0.00')


def get_invoice_detail(user, invoice_id: str) -> RentInvoice:
    """Retrieve 360° detail of a single rent invoice."""
    effective_owner = user.get_effective_owner() if hasattr(user, 'get_effective_owner') else user
    try:
        return RentInvoice.objects.select_related(
            'lease__tenant',
            'lease__unit__property'
        ).prefetch_related(
            'allocations__payment'
        ).get(
            id=invoice_id,
            owner=effective_owner,
            is_active=True
        )
    except RentInvoice.DoesNotExist:
        raise ResourceNotFoundException("Avis d'échéance introuvable.", code="INVOICE_NOT_FOUND")


def get_billing_stats_for_user(user, month: int = None, year: int = None) -> dict:
    """
    Returns global billing & recovery KPIs (total invoiced, collected, unpaid/overdue, recovery rate %).
    """
    qs = get_invoices_for_user(user, month=month, year=year).exclude(status=InvoiceStatus.CANCELLED)

    total_expected = Decimal('0.00')
    total_paid = Decimal('0.00')
    total_unpaid = Decimal('0.00')
    paid_count = 0
    unpaid_count = 0
    overdue_count = 0

    for inv in qs:
        total_expected += inv.total_expected
        total_paid += inv.total_paid
        total_unpaid += inv.remaining_balance

        if inv.status == InvoiceStatus.PAID:
            paid_count += 1
        elif inv.status == InvoiceStatus.OVERDUE:
            overdue_count += 1
        elif inv.status in [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL]:
            unpaid_count += 1

    recovery_rate = (total_paid / total_expected * 100) if total_expected > 0 else Decimal('0.00')

    return {
        'total_invoices_count': qs.count(),
        'paid_invoices_count': paid_count,
        'unpaid_invoices_count': unpaid_count,
        'overdue_invoices_count': overdue_count,
        'total_expected_amount': str(quantize_amount(total_expected)),
        'total_paid_amount': str(quantize_amount(total_paid)),
        'total_unpaid_amount': str(quantize_amount(total_unpaid)),
        'recovery_rate': round(float(recovery_rate), 1),
    }
