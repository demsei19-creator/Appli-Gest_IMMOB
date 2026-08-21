from decimal import Decimal
from django.db.models import QuerySet, Sum, Q
from common.exceptions import ResourceNotFoundException
from common.utils.financial import quantize_amount
from ..models import Payment, PaymentAllocation
from ..constants import PaymentStatus, PaymentMethod


def get_payments_for_user(
    user,
    tenant_id: str = None,
    method: str = None,
    month: int = None,
    year: int = None,
    search: str = None
) -> QuerySet[Payment]:
    """
    Retrieve all payment records for the user's owner scope with prefetched relationships.
    """
    effective_owner = user.get_effective_owner() if hasattr(user, 'get_effective_owner') else user

    qs = Payment.objects.filter(
        owner=effective_owner,
        is_active=True
    ).select_related(
        'tenant'
    ).prefetch_related(
        'allocations__invoice__lease__unit__property'
    )

    if tenant_id:
        qs = qs.filter(tenant_id=tenant_id)

    if method:
        qs = qs.filter(payment_method=method)

    if month:
        qs = qs.filter(payment_date__month=month)

    if year:
        qs = qs.filter(payment_date__year=year)

    if search:
        search = search.strip()
        qs = qs.filter(
            Q(payment_number__icontains=search) |
            Q(receipt_number__icontains=search) |
            Q(reference_number__icontains=search) |
            Q(tenant__first_name__icontains=search) |
            Q(tenant__last_name__icontains=search) |
            Q(tenant__company_name__icontains=search)
        )

    return qs.order_by('-payment_date', '-created_at')


def get_payment_detail(user, payment_id: str) -> Payment:
    """Retrieve 360° detail of a single payment."""
    effective_owner = user.get_effective_owner() if hasattr(user, 'get_effective_owner') else user
    try:
        return Payment.objects.select_related(
            'tenant'
        ).prefetch_related(
            'allocations__invoice__lease__unit__property'
        ).get(
            id=payment_id,
            owner=effective_owner,
            is_active=True
        )
    except Payment.DoesNotExist:
        raise ResourceNotFoundException("Paiement introuvable.", code="PAYMENT_NOT_FOUND")


def get_tenant_payment_history(tenant) -> QuerySet[Payment]:
    """Retrieve complete payment history for a specific tenant."""
    return Payment.objects.filter(tenant=tenant, is_active=True).order_by('-payment_date')


def get_total_payments_collected(user) -> Decimal:
    """Sum of all completed payments."""
    qs = get_payments_for_user(user).filter(status=PaymentStatus.COMPLETED)
    result = qs.aggregate(total=Sum('amount'))['total']
    return result or Decimal('0.00')


def get_payments_stats_for_user(user, month: int = None, year: int = None) -> dict:
    """
    Returns payment collection KPIs and breakdown by payment method.
    """
    qs = get_payments_for_user(user, month=month, year=year).filter(status=PaymentStatus.COMPLETED)

    total_collected = Decimal('0.00')
    method_breakdown = {
        'BANK_TRANSFER': Decimal('0.00'),
        'CASH': Decimal('0.00'),
        'CHECK': Decimal('0.00'),
        'CARD': Decimal('0.00'),
        'DIRECT_DEBIT': Decimal('0.00'),
        'OTHER': Decimal('0.00'),
    }

    for p in qs:
        total_collected += p.amount
        m = p.payment_method
        if m in method_breakdown:
            method_breakdown[m] += p.amount
        else:
            method_breakdown['OTHER'] += p.amount

    return {
        'total_payments_count': qs.count(),
        'total_collected_amount': str(quantize_amount(total_collected)),
        'bank_transfer_amount': str(quantize_amount(method_breakdown['BANK_TRANSFER'])),
        'cash_amount': str(quantize_amount(method_breakdown['CASH'])),
        'check_amount': str(quantize_amount(method_breakdown['CHECK'])),
        'card_amount': str(quantize_amount(method_breakdown['CARD'])),
        'other_amount': str(quantize_amount(method_breakdown['OTHER'])),
    }
