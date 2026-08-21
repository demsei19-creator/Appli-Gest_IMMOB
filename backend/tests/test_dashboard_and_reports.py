from datetime import date, timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.constants import UserRole
from apps.accounts.services.auth_service import AuthService
from apps.properties.services.property_service import PropertyService
from apps.properties.services.unit_service import UnitService
from apps.tenants.services.tenant_service import TenantService
from apps.leases.services.lease_service import LeaseService
from apps.billing.services.billing_service import BillingService
from apps.payments.services.payment_service import PaymentService
from apps.expenses.constants import ExpenseCategory
from apps.expenses.services.expense_service import ExpenseService
from apps.reports.selectors.dashboard_selectors import get_dashboard_kpis
from apps.reports.selectors.financial_report_selectors import get_financial_report

User = get_user_model()


class DashboardAndReportsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Owner
        self.owner = User.objects.create_user(
            email="owner.dashboard@example.com",
            password="SecurePassword123!",
            first_name="Serge",
            last_name="Yao",
            role=UserRole.OWNER,
            company_name="Yao Real Estate Group"
        )
        self.tokens = AuthService.generate_tokens_for_user(self.owner)

        # Property & Units
        self.property = PropertyService.create_property(self.owner, {
            "name": "Tour Ivoire",
            "address": "Plateau",
            "city": "Abidjan"
        })
        self.unit1 = UnitService.create_unit(self.owner, str(self.property.id), {
            "unit_number": "Etage 4 - Bureau A",
            "base_rent_amount": Decimal("800000.00"),
            "service_charges_amount": Decimal("50000.00")
        })
        self.unit2 = UnitService.create_unit(self.owner, str(self.property.id), {
            "unit_number": "Etage 4 - Bureau B",
            "base_rent_amount": Decimal("600000.00"),
            "service_charges_amount": Decimal("40000.00")
        })

        # Tenant & Active Lease
        self.tenant = TenantService.create_tenant(self.owner, {
            "first_name": "Société",
            "last_name": "Africom",
            "tenant_type": "COMPANY",
            "company_name": "Africom SARL",
            "phone_number": "+22505050505"
        })

        today = date.today()
        self.lease = LeaseService.create_lease(self.owner, {
            "unit": self.unit1,
            "tenant": self.tenant,
            "start_date": today - timedelta(days=300),
            "end_date": today + timedelta(days=30),  # Expiring soon (30 days)
            "rent_amount": Decimal("800000.00"),
            "charges_amount": Decimal("50000.00"),
            "deposit_amount": Decimal("1600000.00"),
            "payment_day_of_month": 5
        })
        self.lease = LeaseService.activate_lease(self.owner, str(self.lease.id))
        self.lease.refresh_from_db()

        # Overdue Invoice & Payment
        self.invoice = BillingService.generate_single_invoice(
            owner=self.owner,
            validated_data={
                "lease": self.lease,
                "period_start": today.replace(day=1),
                "period_end": today,
                "due_date": today - timedelta(days=10)  # Overdue
            }
        )

        PaymentService.record_payment(
            owner=self.owner,
            tenant_id=str(self.tenant.id),
            amount=Decimal("400000.00"),  # Partial payment
            payment_date=today,
            payment_method="BANK_TRANSFER"
        )

        # Expense
        ExpenseService.create_expense(self.owner, {
            "property": self.property,
            "category": ExpenseCategory.MAINTENANCE,
            "title": "Maintenance groupe électrogène",
            "amount": Decimal("150000.00"),
            "expense_date": today,
            "is_deductible": True
        })

    def test_dashboard_kpis_computation(self):
        kpis = get_dashboard_kpis(self.owner)

        # 1. Portfolio
        self.assertEqual(kpis["portfolio"]["total_properties"], 1)
        self.assertEqual(kpis["portfolio"]["total_units"], 2)
        self.assertEqual(kpis["portfolio"]["occupied_units"], 1)
        self.assertEqual(kpis["portfolio"]["vacant_units"], 1)
        self.assertEqual(kpis["portfolio"]["occupancy_rate_percent"], 50.0)

        # 2. Finances
        self.assertEqual(kpis["finances"]["total_collected_rent"], "400000.00")
        self.assertEqual(kpis["finances"]["total_expenses"], "150000.00")
        self.assertEqual(kpis["finances"]["net_operating_income"], "250000.00")

        # 3. Monthly Timeline
        self.assertEqual(len(kpis["monthly_timeline"]), 6)

        # 4. Alerts
        self.assertGreaterEqual(len(kpis["alerts"]["expiring_leases"]), 1)
        self.assertGreaterEqual(len(kpis["alerts"]["overdue_invoices"]), 1)

    def test_financial_report_generation(self):
        today = date.today()
        report = get_financial_report(self.owner, year=today.year)

        self.assertEqual(report["report_year"], today.year)
        self.assertEqual(report["company_name"], "Yao Real Estate Group")
        self.assertEqual(report["summary"]["collected_rent"], "400000.00")
        self.assertEqual(report["summary"]["total_expenses"], "150000.00")
        self.assertEqual(len(report["properties_breakdown"]), 1)
        self.assertEqual(report["properties_breakdown"][0]["property_name"], "Tour Ivoire")

    def test_dashboard_and_reports_api(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.tokens['access']}")

        # 1. GET /api/v1/reports/dashboard/
        dash_res = self.client.get("/api/v1/reports/dashboard/")
        self.assertEqual(dash_res.status_code, status.HTTP_200_OK)
        self.assertIn("portfolio", dash_res.data["data"])
        self.assertIn("monthly_timeline", dash_res.data["data"])
        self.assertIn("alerts", dash_res.data["data"])

        # 2. GET /api/v1/reports/financial-report/
        today = date.today()
        rep_res = self.client.get(f"/api/v1/reports/financial-report/?year={today.year}")
        self.assertEqual(rep_res.status_code, status.HTTP_200_OK)
        self.assertEqual(rep_res.data["data"]["summary"]["collected_rent"], "400000.00")
