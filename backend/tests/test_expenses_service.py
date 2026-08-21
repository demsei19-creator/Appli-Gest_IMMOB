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
from apps.properties.constants import UnitStatus
from apps.properties.services.property_service import PropertyService
from apps.properties.services.unit_service import UnitService
from apps.maintenance.models import Supplier
from apps.maintenance.constants import SupplierCategory
from apps.maintenance.services.maintenance_service import MaintenanceService
from apps.expenses.models import Expense
from apps.expenses.constants import ExpenseCategory
from apps.expenses.services.expense_service import ExpenseService

User = get_user_model()


class ExpenseServiceTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Owner 1
        self.owner = User.objects.create_user(
            email="owner.expenses@example.com",
            password="SecurePassword123!",
            first_name="Fatou",
            last_name="Coulibaly",
            role=UserRole.OWNER,
            company_name="Coulibaly Gestion"
        )
        self.tokens = AuthService.generate_tokens_for_user(self.owner)

        # Owner 2
        self.other_owner = User.objects.create_user(
            email="other.expenses@example.com",
            password="SecurePassword123!",
            first_name="David",
            last_name="Yao",
            role=UserRole.OWNER
        )

        # Property & Unit
        self.property = PropertyService.create_property(self.owner, {
            "name": "Résidence Les Jardins",
            "address": "Zone 4",
            "city": "Abidjan"
        })
        self.unit = UnitService.create_unit(self.owner, str(self.property.id), {
            "unit_number": "A101",
            "base_rent_amount": Decimal("300000.00"),
            "service_charges_amount": Decimal("30000.00"),
            "status": UnitStatus.VACANT
        })

        # Supplier
        self.supplier = MaintenanceService.create_supplier(self.owner, {
            "name": "CIE Électricité Pro",
            "category": SupplierCategory.ELECTRICAL,
            "phone_number": "+22507112233"
        })

    def test_create_expense_property_and_unit(self):
        # 1. Property-wide deductible expense
        exp1 = ExpenseService.create_expense(self.owner, {
            "property": self.property,
            "category": ExpenseCategory.INSURANCE,
            "title": "Assurance Multirisque Immeuble 2026",
            "amount": Decimal("450000.00"),
            "expense_date": date(2026, 8, 1),
            "paid_to": "NSIA Assurances",
            "is_deductible": True
        })
        self.assertTrue(exp1.expense_number.startswith("DEP-"))
        self.assertEqual(exp1.amount, Decimal("450000.00"))
        self.assertTrue(exp1.is_deductible)
        self.assertIsNone(exp1.unit)

        # 2. Unit-specific non-deductible expense
        exp2 = ExpenseService.create_expense(self.owner, {
            "property": self.property,
            "unit": self.unit,
            "supplier": self.supplier,
            "category": ExpenseCategory.MAINTENANCE,
            "title": "Changement tableau disjoncteur lot A101",
            "amount": Decimal("75000.00"),
            "expense_date": date(2026, 8, 12),
            "is_deductible": False
        })
        self.assertTrue(exp2.expense_number.startswith("DEP-"))
        self.assertEqual(exp2.unit, self.unit)
        self.assertEqual(exp2.supplier, self.supplier)
        self.assertFalse(exp2.is_deductible)

    def test_owner_isolation(self):
        exp = ExpenseService.create_expense(self.owner, {
            "property": self.property,
            "category": ExpenseCategory.SECURITY,
            "title": "Gardiennage Juillet",
            "amount": Decimal("120000.00"),
            "expense_date": date(2026, 7, 31)
        })

        with self.assertRaises(ResourceNotFoundException):
            ExpenseService.update_expense(
                owner=self.other_owner,
                expense_id=str(exp.id),
                validated_data={"amount": Decimal("150000.00")}
            )

    def test_expense_api_endpoints(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.tokens['access']}")

        # 1. POST /api/v1/expenses/
        create_res = self.client.post(
            "/api/v1/expenses/",
            {
                "property": str(self.property.id),
                "unit": str(self.unit.id),
                "category": "REPAIRS",
                "title": "Remplacement serrure blindée",
                "amount": "85000.00",
                "expense_date": "2026-08-10",
                "paid_to": "Serrurerie Express",
                "is_deductible": True
            },
            format="json"
        )
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        exp_id = create_res.data["data"]["id"]

        # 2. GET /api/v1/expenses/
        list_res = self.client.get("/api/v1/expenses/")
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_res.data["data"]), 1)

        # 3. GET /api/v1/expenses/stats/
        stats_res = self.client.get("/api/v1/expenses/stats/")
        self.assertEqual(stats_res.status_code, status.HTTP_200_OK)
        self.assertEqual(stats_res.data["data"]["expenses_count"], 1)
        self.assertEqual(stats_res.data["data"]["total_amount"], "85000.00")
        self.assertEqual(stats_res.data["data"]["deductible_amount"], "85000.00")

        # 4. DELETE /api/v1/expenses/{id}/
        del_res = self.client.delete(f"/api/v1/expenses/{exp_id}/")
        self.assertEqual(del_res.status_code, status.HTTP_200_OK)
