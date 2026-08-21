from decimal import Decimal
from django.db.models import QuerySet, Sum, Q, Count
from django.utils import timezone
from common.exceptions import ResourceNotFoundException
from common.utils.financial import quantize_amount
from apps.payments.models import Payment
from apps.payments.constants import PaymentStatus
from apps.expenses.models import Expense
from ..models import PropertyTax
from ..constants import TaxType


def get_taxes_for_user(
    user,
    property_id: str = None,
    tax_type: str = None,
    fiscal_year: int = None,
    is_paid: bool = None,
    search: str = None
) -> QuerySet[PropertyTax]:
    """
    Retrieve all property taxes for user's owner scope with prefetched relationships.
    """
    effective_owner = user.get_effective_owner() if hasattr(user, 'get_effective_owner') else user

    qs = PropertyTax.objects.filter(
        owner=effective_owner,
        is_active=True
    ).select_related('property')

    if property_id:
        qs = qs.filter(property_id=property_id)

    if tax_type:
        qs = qs.filter(tax_type=tax_type)

    if fiscal_year:
        qs = qs.filter(fiscal_year=fiscal_year)

    if is_paid is not None:
        qs = qs.filter(is_paid=is_paid)

    if search:
        search = search.strip()
        qs = qs.filter(
            Q(tax_number__icontains=search) |
            Q(reference_notice__icontains=search) |
            Q(notes__icontains=search) |
            Q(property__name__icontains=search)
        )

    return qs.order_by('-fiscal_year', 'due_date')


def get_tax_detail(user, tax_id: str) -> PropertyTax:
    """Retrieve 360° detail of a single tax notice."""
    effective_owner = user.get_effective_owner() if hasattr(user, 'get_effective_owner') else user
    try:
        return PropertyTax.objects.select_related('property').get(
            id=tax_id,
            owner=effective_owner,
            is_active=True
        )
    except PropertyTax.DoesNotExist:
        raise ResourceNotFoundException("Avis d'imposition introuvable.", code="TAX_NOT_FOUND")


def get_total_taxes_for_year(user, year: int) -> Decimal:
    """Sum of all property taxes for a specific year."""
    qs = get_taxes_for_user(user, fiscal_year=year)
    result = qs.aggregate(total=Sum('amount'))['total']
    return result or Decimal('0.00')


def get_tax_stats_for_user(user, fiscal_year: int = None) -> dict:
    """
    Returns tax amounts, payment status and overdue alerts.
    """
    qs = get_taxes_for_user(user, fiscal_year=fiscal_year)
    today = timezone.now().date()

    total_taxes = Decimal('0.00')
    paid_taxes = Decimal('0.00')
    pending_taxes = Decimal('0.00')
    overdue_count = 0

    for t in qs:
        total_taxes += t.amount
        if t.is_paid:
            paid_taxes += t.amount
        else:
            pending_taxes += t.amount
            if t.due_date < today:
                overdue_count += 1

    return {
        'taxes_count': qs.count(),
        'total_taxes_amount': str(quantize_amount(total_taxes)),
        'paid_taxes_amount': str(quantize_amount(paid_taxes)),
        'pending_taxes_amount': str(quantize_amount(pending_taxes)),
        'overdue_taxes_count': overdue_count,
    }


def get_tax_simulation_for_year(user, fiscal_year: int) -> dict:
    """
    Generates dynamic annual property tax declaration simulation:
    Gross Rental Income - Deductible Expenses = Net Taxable Real Estate Income.
    """
    effective_owner = user.get_effective_owner() if hasattr(user, 'get_effective_owner') else user

    # 1. Gross Rental Income collected in fiscal_year
    payments_qs = Payment.objects.filter(
        owner=effective_owner,
        status=PaymentStatus.COMPLETED,
        payment_date__year=fiscal_year,
        is_active=True
    )
    gross_income = payments_qs.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    # 2. Deductible Expenses in fiscal_year
    expenses_qs = Expense.objects.filter(
        owner=effective_owner,
        is_deductible=True,
        expense_date__year=fiscal_year,
        is_active=True
    )

    total_deductible = Decimal('0.00')
    breakdown = {
        'repairs_maintenance': Decimal('0.00'),
        'insurance': Decimal('0.00'),
        'mortgage_interest': Decimal('0.00'),
        'management_fees': Decimal('0.00'),
        'utilities_security': Decimal('0.00'),
        'other': Decimal('0.00'),
    }

    for exp in expenses_qs:
        total_deductible += exp.amount
        cat = exp.category
        if cat in ['REPAIRS', 'MAINTENANCE']:
            breakdown['repairs_maintenance'] += exp.amount
        elif cat == 'INSURANCE':
            breakdown['insurance'] += exp.amount
        elif cat == 'MORTGAGE':
            breakdown['mortgage_interest'] += exp.amount
        elif cat == 'MANAGEMENT':
            breakdown['management_fees'] += exp.amount
        elif cat in ['UTILITIES', 'SECURITY']:
            breakdown['utilities_security'] += exp.amount
        else:
            breakdown['other'] += exp.amount

    # 3. Net Taxable Income Calculation
    net_taxable_income = max(Decimal('0.00'), gross_income - total_deductible)

    # 4. Estimated income tax (indicative 15% flat rate)
    estimated_tax = quantize_amount(net_taxable_income * Decimal('0.15'))
    net_after_tax = quantize_amount(gross_income - total_deductible - estimated_tax)

    return {
        'fiscal_year': fiscal_year,
        'gross_rental_income': str(quantize_amount(gross_income)),
        'total_deductible_expenses': str(quantize_amount(total_deductible)),
        'repairs_maintenance_deductible': str(quantize_amount(breakdown['repairs_maintenance'])),
        'insurance_deductible': str(quantize_amount(breakdown['insurance'])),
        'mortgage_interest_deductible': str(quantize_amount(breakdown['mortgage_interest'])),
        'management_fees_deductible': str(quantize_amount(breakdown['management_fees'])),
        'utilities_security_deductible': str(quantize_amount(breakdown['utilities_security'])),
        'other_deductible': str(quantize_amount(breakdown['other'])),
        'net_taxable_income': str(quantize_amount(net_taxable_income)),
        'estimated_tax_rate': '15.0%',
        'estimated_tax_amount': str(estimated_tax),
        'net_cashflow_after_tax': str(net_after_tax),
    }
