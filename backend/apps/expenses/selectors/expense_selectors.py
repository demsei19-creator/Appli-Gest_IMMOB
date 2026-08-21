from decimal import Decimal
from django.db.models import QuerySet, Sum, Q
from django.utils import timezone
from common.exceptions import ResourceNotFoundException
from common.utils.financial import quantize_amount
from ..models import Expense
from ..constants import ExpenseCategory


def get_expenses_for_user(
    user,
    property_id: str = None,
    unit_id: str = None,
    category: str = None,
    is_deductible: bool = None,
    month: int = None,
    year: int = None,
    search: str = None
) -> QuerySet[Expense]:
    """
    Retrieve all expenses for user's owner scope with prefetched relationships.
    """
    effective_owner = user.get_effective_owner() if hasattr(user, 'get_effective_owner') else user

    qs = Expense.objects.filter(
        owner=effective_owner,
        is_active=True
    ).select_related(
        'property',
        'unit',
        'supplier'
    )

    if property_id:
        qs = qs.filter(property_id=property_id)

    if unit_id:
        qs = qs.filter(unit_id=unit_id)

    if category:
        qs = qs.filter(category=category)

    if is_deductible is not None:
        qs = qs.filter(is_deductible=is_deductible)

    if month:
        qs = qs.filter(expense_date__month=month)

    if year:
        qs = qs.filter(expense_date__year=year)

    if search:
        search = search.strip()
        qs = qs.filter(
            Q(expense_number__icontains=search) |
            Q(title__icontains=search) |
            Q(paid_to__icontains=search) |
            Q(notes__icontains=search) |
            Q(property__name__icontains=search) |
            Q(unit__unit_number__icontains=search) |
            Q(supplier__name__icontains=search)
        )

    return qs.order_by('-expense_date', '-created_at')


def get_expense_detail(user, expense_id: str) -> Expense:
    """Retrieve 360° detail of a single expense."""
    effective_owner = user.get_effective_owner() if hasattr(user, 'get_effective_owner') else user
    try:
        return Expense.objects.select_related(
            'property',
            'unit',
            'supplier'
        ).get(
            id=expense_id,
            owner=effective_owner,
            is_active=True
        )
    except Expense.DoesNotExist:
        raise ResourceNotFoundException("Dépense introuvable.", code="EXPENSE_NOT_FOUND")


def get_total_expenses(user) -> Decimal:
    """Sum of all active expenses."""
    qs = get_expenses_for_user(user)
    result = qs.aggregate(total=Sum('amount'))['total']
    return result or Decimal('0.00')


def get_expense_stats_for_user(user, month: int = None, year: int = None) -> dict:
    """
    Returns total expenses, deductible breakdown and category distribution.
    """
    qs = get_expenses_for_user(user, month=month, year=year)

    total_amount = Decimal('0.00')
    deductible_amount = Decimal('0.00')
    non_deductible_amount = Decimal('0.00')

    category_breakdown = {
        'REPAIRS': Decimal('0.00'),
        'MAINTENANCE': Decimal('0.00'),
        'INSURANCE': Decimal('0.00'),
        'UTILITIES': Decimal('0.00'),
        'MANAGEMENT': Decimal('0.00'),
        'SECURITY': Decimal('0.00'),
        'MORTGAGE': Decimal('0.00'),
        'OTHER': Decimal('0.00'),
    }

    for exp in qs:
        total_amount += exp.amount
        if exp.is_deductible:
            deductible_amount += exp.amount
        else:
            non_deductible_amount += exp.amount

        cat = exp.category
        if cat in category_breakdown:
            category_breakdown[cat] += exp.amount
        else:
            category_breakdown['OTHER'] += exp.amount

    return {
        'expenses_count': qs.count(),
        'total_amount': str(quantize_amount(total_amount)),
        'deductible_amount': str(quantize_amount(deductible_amount)),
        'non_deductible_amount': str(quantize_amount(non_deductible_amount)),
        'repairs_amount': str(quantize_amount(category_breakdown['REPAIRS'])),
        'maintenance_amount': str(quantize_amount(category_breakdown['MAINTENANCE'])),
        'insurance_amount': str(quantize_amount(category_breakdown['INSURANCE'])),
        'utilities_amount': str(quantize_amount(category_breakdown['UTILITIES'])),
        'management_amount': str(quantize_amount(category_breakdown['MANAGEMENT'])),
        'security_amount': str(quantize_amount(category_breakdown['SECURITY'])),
        'mortgage_amount': str(quantize_amount(category_breakdown['MORTGAGE'])),
        'other_amount': str(quantize_amount(category_breakdown['OTHER'])),
    }
