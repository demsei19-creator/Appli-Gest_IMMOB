from decimal import Decimal
from django.db.models import Sum, Count, Q
from django.utils import timezone
from common.utils.financial import quantize_amount
from apps.properties.models import Property, Unit
from apps.billing.models import RentInvoice
from apps.payments.models import Payment
from apps.expenses.models import Expense
from apps.taxes.models import PropertyTax


def get_financial_report(user, year: int = None, property_id: str = None) -> dict:
    """
    Consolidates comprehensive annual or property-level financial statement.
    """
    effective_owner = user.get_effective_owner() if hasattr(user, 'get_effective_owner') else user
    target_year = year or timezone.now().year

    # 1. Base Querysets filtered by year & owner
    invoices_qs = RentInvoice.objects.filter(
        owner=effective_owner,
        period_start__year=target_year,
        is_active=True
    )
    payments_qs = Payment.objects.filter(
        owner=effective_owner,
        status='COMPLETED',
        payment_date__year=target_year,
        is_active=True
    )
    expenses_qs = Expense.objects.filter(
        owner=effective_owner,
        expense_date__year=target_year,
        is_active=True
    )
    taxes_qs = PropertyTax.objects.filter(
        owner=effective_owner,
        fiscal_year=target_year,
        is_active=True
    )
    properties_qs = Property.objects.filter(
        owner=effective_owner,
        is_active=True
    ).prefetch_related('units')

    if property_id:
        invoices_qs = invoices_qs.filter(lease__unit__property_id=property_id)
        expenses_qs = expenses_qs.filter(property_id=property_id)
        taxes_qs = taxes_qs.filter(property_id=property_id)
        properties_qs = properties_qs.filter(id=property_id)

    # 2. Financial Aggregations
    expected_rent = invoices_qs.aggregate(t=Sum('total_expected'))['t'] or Decimal('0.00')
    collected_rent = payments_qs.aggregate(t=Sum('amount'))['t'] or Decimal('0.00')
    unpaid_rent = invoices_qs.aggregate(t=Sum('remaining_balance'))['t'] or Decimal('0.00')
    collection_rate = round(float(collected_rent / expected_rent * 100), 1) if expected_rent > 0 else 0.0

    total_expenses = expenses_qs.aggregate(t=Sum('amount'))['t'] or Decimal('0.00')
    total_taxes_paid = taxes_qs.filter(is_paid=True).aggregate(t=Sum('amount'))['t'] or Decimal('0.00')
    net_operating_result = quantize_amount(collected_rent - total_expenses - total_taxes_paid)

    # 3. Expenses Breakdown
    expenses_breakdown = {}
    for exp in expenses_qs:
        cat_display = exp.get_category_display()
        expenses_breakdown[cat_display] = expenses_breakdown.get(cat_display, Decimal('0.00')) + exp.amount

    expenses_breakdown_formatted = [
        {"category": k, "amount": str(quantize_amount(v))}
        for k, v in sorted(expenses_breakdown.items(), key=lambda x: x[1], reverse=True)
    ]

    # 4. Property-by-Property Breakdown
    properties_breakdown = []
    for prop in properties_qs:
        p_units = prop.units.filter(is_active=True)
        p_total_units = p_units.count()
        p_occupied = p_units.filter(status='OCCUPIED').count()
        p_occupancy = round((p_occupied / p_total_units * 100), 1) if p_total_units > 0 else 0.0

        p_invoices = invoices_qs.filter(lease__unit__property=prop)
        p_expected = p_invoices.aggregate(t=Sum('total_expected'))['t'] or Decimal('0.00')
        p_paid = p_invoices.aggregate(t=Sum('total_paid'))['t'] or Decimal('0.00')
        p_unpaid = p_invoices.aggregate(t=Sum('remaining_balance'))['t'] or Decimal('0.00')

        p_expenses = expenses_qs.filter(property=prop).aggregate(t=Sum('amount'))['t'] or Decimal('0.00')
        p_net = quantize_amount(p_paid - p_expenses)

        properties_breakdown.append({
            "property_id": str(prop.id),
            "property_name": prop.name,
            "property_city": prop.city,
            "total_units": p_total_units,
            "occupied_units": p_occupied,
            "occupancy_rate_percent": p_occupancy,
            "expected_rent": str(quantize_amount(p_expected)),
            "collected_rent": str(quantize_amount(p_paid)),
            "unpaid_rent": str(quantize_amount(p_unpaid)),
            "expenses": str(quantize_amount(p_expenses)),
            "net_operating_result": str(p_net),
        })

    return {
        "report_year": target_year,
        "generated_at": timezone.now().strftime("%d/%m/%Y %H:%M"),
        "owner_name": effective_owner.get_full_name() or effective_owner.email,
        "company_name": effective_owner.company_name or "Gestion Patrimoniale Privée",
        "owner_email": effective_owner.email,
        "summary": {
            "expected_rent": str(quantize_amount(expected_rent)),
            "collected_rent": str(quantize_amount(collected_rent)),
            "unpaid_rent": str(quantize_amount(unpaid_rent)),
            "collection_rate_percent": collection_rate,
            "total_expenses": str(quantize_amount(total_expenses)),
            "total_taxes_paid": str(quantize_amount(total_taxes_paid)),
            "net_operating_result": str(net_operating_result),
        },
        "expenses_breakdown": expenses_breakdown_formatted,
        "properties_breakdown": properties_breakdown,
    }
