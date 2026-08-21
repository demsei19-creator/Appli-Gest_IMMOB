from datetime import date, timedelta
from decimal import Decimal
from django.db.models import Sum, Count, Q
from django.utils import timezone
from common.utils.financial import quantize_amount
from apps.properties.models import Property, Unit
from apps.tenants.models import Tenant
from apps.leases.models import Lease
from apps.billing.models import RentInvoice
from apps.payments.models import Payment
from apps.expenses.models import Expense
from apps.maintenance.models import MaintenanceRequest
from apps.properties.selectors.property_selectors import get_properties_for_user, get_units_for_user
from apps.billing.selectors.billing_selectors import get_invoices_for_user
from apps.payments.selectors.payment_selectors import get_payments_for_user
from apps.expenses.selectors.expense_selectors import get_expenses_for_user
from apps.maintenance.selectors.maintenance_selectors import get_maintenance_requests_for_user


def get_dashboard_kpis(user) -> dict:
    """
    Computes real-time KPIs, 6-month financial timeline, alerts and activities (Section 33 & 34).
    """
    effective_owner = user.get_effective_owner() if hasattr(user, 'get_effective_owner') else user
    today = timezone.now().date()

    # 1. Properties & Units
    properties_qs = get_properties_for_user(user)
    units_qs = get_units_for_user(user)

    total_properties = properties_qs.count()
    total_units = units_qs.count()
    occupied_units = units_qs.filter(status='OCCUPIED').count()
    vacant_units = units_qs.filter(status='VACANT').count()
    occupancy_rate = round((occupied_units / total_units * 100), 1) if total_units > 0 else 0.0

    # 2. Financials (Rent, Payments, Invoices)
    invoices_qs = get_invoices_for_user(user)
    total_expected_rent = quantize_amount(invoices_qs.aggregate(t=Sum('total_expected'))['t'] or Decimal('0.00'))
    total_collected_rent = quantize_amount(invoices_qs.aggregate(t=Sum('total_paid'))['t'] or Decimal('0.00'))
    total_unpaid_rent = quantize_amount(invoices_qs.aggregate(t=Sum('remaining_balance'))['t'] or Decimal('0.00'))
    collection_rate = round(float(total_collected_rent / total_expected_rent * 100), 1) if total_expected_rent > 0 else 0.0

    # 3. Expenses & Maintenance
    expenses_qs = get_expenses_for_user(user)
    total_expenses = quantize_amount(expenses_qs.aggregate(t=Sum('amount'))['t'] or Decimal('0.00'))

    maintenance_qs = get_maintenance_requests_for_user(user)
    active_maintenance_count = maintenance_qs.filter(status__in=['REPORTED', 'ASSIGNED', 'IN_PROGRESS']).count()
    urgent_maintenance_count = maintenance_qs.filter(status__in=['REPORTED', 'ASSIGNED', 'IN_PROGRESS'], priority='URGENT').count()

    # 4. Net Operating Income (NOI / Cash-Flow)
    net_operating_income = quantize_amount(total_collected_rent - total_expenses)

    # 5. Monthly Cashflow Timeline (Last 6 months)
    month_names_fr = [
        "", "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
        "Juil", "Août", "Sep", "Oct", "Nov", "Déc"
    ]
    monthly_timeline = []
    
    for i in range(5, -1, -1):
        target_month = today.month - i
        target_year = today.year
        while target_month <= 0:
            target_month += 12
            target_year -= 1

        month_payments = Payment.objects.filter(
            owner=effective_owner,
            status='COMPLETED',
            payment_date__year=target_year,
            payment_date__month=target_month,
            is_active=True
        ).aggregate(t=Sum('amount'))['t'] or Decimal('0.00')

        month_expenses = Expense.objects.filter(
            owner=effective_owner,
            expense_date__year=target_year,
            expense_date__month=target_month,
            is_active=True
        ).aggregate(t=Sum('amount'))['t'] or Decimal('0.00')

        monthly_timeline.append({
            "month_key": f"{target_year}-{target_month:02d}",
            "month_label": f"{month_names_fr[target_month]} {target_year}",
            "collected_rent": str(quantize_amount(month_payments)),
            "expenses": str(quantize_amount(month_expenses)),
            "net_cashflow": str(quantize_amount(month_payments - month_expenses)),
        })

    # 6. Operational Alerts
    # 6a. Leases expiring in the next 60 days
    sixty_days_ahead = today + timedelta(days=60)
    expiring_leases_qs = Lease.objects.filter(
        owner=effective_owner,
        status='ACTIVE',
        end_date__isnull=False,
        end_date__gte=today,
        end_date__lte=sixty_days_ahead,
        is_active=True
    ).select_related('unit__property', 'tenant')[:5]

    expiring_leases = [
        {
            "id": str(l.id),
            "lease_number": l.lease_number,
            "tenant_name": l.tenant.full_name,
            "property_name": l.unit.property.name,
            "unit_number": l.unit.unit_number,
            "end_date": l.end_date.isoformat(),
            "days_remaining": (l.end_date - today).days,
        }
        for l in expiring_leases_qs
    ]

    # 6b. Overdue Invoices
    overdue_invoices_qs = RentInvoice.objects.filter(
        owner=effective_owner,
        status__in=['UNPAID', 'PARTIAL', 'OVERDUE'],
        remaining_balance__gt=Decimal('0.00'),
        due_date__lt=today,
        is_active=True
    ).select_related('lease__tenant', 'lease__unit__property').order_by('due_date')[:5]

    overdue_invoices = [
        {
            "id": str(inv.id),
            "invoice_number": inv.invoice_number,
            "tenant_name": inv.lease.tenant.full_name,
            "property_name": inv.lease.unit.property.name,
            "unit_number": inv.lease.unit.unit_number,
            "due_date": inv.due_date.isoformat(),
            "remaining_balance": str(inv.remaining_balance),
        }
        for inv in overdue_invoices_qs
    ]

    # 7. Recent Transactions (Payments & Expenses)
    recent_payments = get_payments_for_user(user).order_by('-payment_date')[:5]
    recent_activities = [
        {
            "id": str(p.id),
            "type": "PAYMENT",
            "title": f"Loyer reçu - {p.tenant.full_name}",
            "amount": str(p.amount),
            "date": p.payment_date.isoformat(),
            "status": p.status,
        }
        for p in recent_payments
    ]

    return {
        "portfolio": {
            "total_properties": total_properties,
            "total_units": total_units,
            "occupied_units": occupied_units,
            "vacant_units": vacant_units,
            "occupancy_rate_percent": occupancy_rate,
        },
        "finances": {
            "total_expected_rent": str(total_expected_rent),
            "total_collected_rent": str(total_collected_rent),
            "total_unpaid_rent": str(total_unpaid_rent),
            "collection_rate_percent": collection_rate,
            "total_expenses": str(total_expenses),
            "net_operating_income": str(net_operating_income),
        },
        "operations": {
            "active_maintenance_count": active_maintenance_count,
            "urgent_maintenance_count": urgent_maintenance_count,
        },
        "monthly_timeline": monthly_timeline,
        "alerts": {
            "expiring_leases": expiring_leases,
            "overdue_invoices": overdue_invoices,
        },
        "recent_activities": recent_activities,
    }
