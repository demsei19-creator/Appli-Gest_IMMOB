from datetime import date
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from common.exceptions import ResourceNotFoundException, FinancialException
from apps.accounts.constants import UserRole
from apps.accounts.services.auth_service import AuthService
from apps.properties.models import Property, Unit
from apps.properties.services.property_service import PropertyService
from apps.properties.services.unit_service import UnitService
from apps.tenants.models import Tenant
from apps.tenants.services.tenant_service import TenantService
from apps.leases.models import Lease
from apps.leases.services.lease_service import LeaseService
from apps.payments.models import Payment
from apps.payments.services.payment_service import PaymentService
from apps.expenses.models import Expense
from apps.expenses.constants import ExpenseCategory
from apps.expenses.services.expense_service import ExpenseService
from apps.taxes.models import PropertyTax
from apps.taxes.constants import TaxType
from apps.taxes.services.tax_service import TaxService
from apps.taxes.selectors.tax_selectors import get_tax_simulation_for_year

User = get_user_model()


class TaxServiceTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Owner 1
        self.owner = User.objects.create_user(
            email="owner.taxes@example.com",
            password="SecurePassword123!",
            first_name="Kouamé",
            last_name="N'Guessan",
            role=UserRole.OWNER,
            company_name="N'Guessan Invest"
        )
        self.tokens = AuthService.generate_tokens_for_user(self.owner)

        # Owner 2
        self.other_owner = User.objects.create_user(
            email="other.taxes@example.com",
            password="SecurePassword123!",
            first_name="Hélène",
            last_name="Bamba",
            role=UserRole.OWNER
        )

        # Property & Unit
        self.property = PropertyService.create_property(self.owner, {
            "name": "Immeuble Le Palmier",
            "address": "Cocody Angré",
            "city": "Abidjan"
        })
        self.unit = UnitService.create_unit(self.owner, str(self.property.id), {
            "unit_number": "B01",
            "base_rent_amount": Decimal("400000.00"),
            "service_charges_amount": Decimal("40000.00")
        })

        # Tenant
        self.tenant = TenantService.create_tenant(self.owner, {
            "first_name": "Patrick",
            "last_name": "Aka",
            "phone_number": "+22507889900"
        })

    def test_create_and_mark_paid_tax(self):
        tax = TaxService.create_tax(self.owner, {
            "property": self.property,
            "tax_type": TaxType.PROPERTY_TAX,
            "fiscal_year": 2026,
            "amount": Decimal("320000.00"),
            "due_date": date(2026, 10, 15),
            "reference_notice": "AVIS-FONCIER-2026-99"
        })

        self.assertTrue(tax.tax_number.startswith("TAX-2026-"))
        self.assertFalse(tax.is_paid)
        self.assertEqual(tax.amount, Decimal("320000.00"))

        # Mark paid
        paid_tax = TaxService.mark_as_paid(self.owner, str(tax.id), paid_date=date(2026, 10, 10))
        self.assertTrue(paid_tax.is_paid)
        self.assertEqual(paid_tax.paid_date, date(2026, 10, 10))

    def test_tax_simulation_calculation(self):
        # 1. Register rental payment in 2026 (Gross Income: 4,400,000 FCFA)
        Payment.objects.create(
            owner=self.owner,
            tenant=self.tenant,
            amount=Decimal("4400000.00"),
            payment_date=date(2026, 7, 5),
            status="COMPLETED"
        )

        # 2. Register Deductible Expenses in 2026 (Total Deductible: 1,400,000 FCFA)
        ExpenseService.create_expense(self.owner, {
            "property": self.property,
            "category": ExpenseCategory.REPAIRS,
            "title": "Rénovation étanchéité toiture",
            "amount": Decimal("900000.00"),
            "expense_date": date(2026, 3, 10),
            "is_deductible": True
        })
        ExpenseService.create_expense(self.owner, {
            "property": self.property,
            "category": ExpenseCategory.INSURANCE,
            "title": "Prime d'assurance 2026",
            "amount": Decimal("500000.00"),
            "expense_date": date(2026, 1, 15),
            "is_deductible": True
        })

        # 3. Register Non-Deductible Expense (400,000 FCFA)
        ExpenseService.create_expense(self.owner, {
            "property": self.property,
            "category": ExpenseCategory.OTHER,
            "title": "Frais divers non déductibles",
            "amount": Decimal("400000.00"),
            "expense_date": date(2026, 5, 20),
            "is_deductible": False
        })

        # 4. Simulate Tax Declaration for 2026
        sim = get_tax_simulation_for_year(self.owner, fiscal_year=2026)
        self.assertEqual(sim["gross_rental_income"], "4400000.00")
        self.assertEqual(sim["total_deductible_expenses"], "1400000.00")
        # Net taxable = 4.4M - 1.4M = 3.0M
        self.assertEqual(sim["net_taxable_income"], "3000000.00")
        # Estimated tax = 15% of 3.0M = 450,000 FCFA
        self.assertEqual(sim["estimated_tax_amount"], "450000.00")
        # Net after tax = 4.4M - 1.4M - 0.45M = 2,550,000 FCFA
        self.assertEqual(sim["net_cashflow_after_tax"], "2550000.00")

    def test_owner_isolation(self):
        tax = TaxService.create_tax(self.owner, {
            "property": self.property,
            "tax_type": TaxType.LOCAL_DEVELOPMENT,
            "fiscal_year": 2026,
            "amount": Decimal("80000.00"),
            "due_date": date(2026, 12, 31)
        })

        with self.assertRaises(ResourceNotFoundException):
            TaxService.mark_as_paid(self.other_owner, str(tax.id))

    def test_tax_api_endpoints(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.tokens['access']}")

        # 1. POST /api/v1/taxes/
        create_res = self.client.post(
            "/api/v1/taxes/",
            {
                "property": str(self.property.id),
                "tax_type": "PROPERTY_TAX",
                "fiscal_year": 2026,
                "amount": "250000.00",
                "due_date": "2026-11-30",
                "reference_notice": "AVIS-2026-TF-01"
            },
            format="json"
        )
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        tax_id = create_res.data["data"]["id"]

        # 2. GET /api/v1/taxes/
        list_res = self.client.get("/api/v1/taxes/")
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_res.data["data"]), 1)

        # 3. POST /api/v1/taxes/{id}/mark-paid/
        mark_res = self.client.post(
            f"/api/v1/taxes/{tax_id}/mark-paid/",
            {"paid_date": "2026-11-15"},
            format="json"
        )
        self.assertEqual(mark_res.status_code, status.HTTP_200_OK)
        self.assertTrue(mark_res.data["data"]["is_paid"])

        # 4. GET /api/v1/taxes/stats/
        stats_res = self.client.get("/api/v1/taxes/stats/?fiscal_year=2026")
        self.assertEqual(stats_res.status_code, status.HTTP_200_OK)
        self.assertEqual(stats_res.data["data"]["taxes_count"], 1)

        # 5. GET /api/v1/taxes/simulation/
        sim_res = self.client.get("/api/v1/taxes/simulation/?fiscal_year=2026")
        self.assertEqual(sim_res.status_code, status.HTTP_200_OK)
        self.assertIn("net_taxable_income", sim_res.data["data"])
