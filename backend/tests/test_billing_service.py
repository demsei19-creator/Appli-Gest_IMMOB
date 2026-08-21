from datetime import date
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from common.exceptions import BusinessException, ResourceNotFoundException
from apps.accounts.constants import UserRole
from apps.accounts.services.auth_service import AuthService
from apps.properties.models import Property, Unit
from apps.properties.constants import UnitStatus
from apps.properties.services.property_service import PropertyService
from apps.properties.services.unit_service import UnitService
from apps.tenants.models import Tenant
from apps.tenants.services.tenant_service import TenantService
from apps.leases.models import Lease
from apps.leases.constants import LeaseStatus
from apps.leases.services.lease_service import LeaseService
from apps.billing.models import RentInvoice
from apps.billing.constants import InvoiceStatus
from apps.billing.services.billing_service import BillingService

User = get_user_model()


class BillingServiceTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Owner
        self.owner = User.objects.create_user(
            email="owner.billing@example.com",
            password="SecurePassword123!",
            first_name="Koffi",
            last_name="N'Goran",
            role=UserRole.OWNER,
            company_name="N'Goran Properties"
        )
        self.tokens = AuthService.generate_tokens_for_user(self.owner)

        # Property & Units
        self.property = PropertyService.create_property(self.owner, {
            "name": "Résidence La Palmeraie",
            "address": "Cocody Angré",
            "city": "Abidjan"
        })
        self.unit_1 = UnitService.create_unit(self.owner, str(self.property.id), {
            "unit_number": "Lot B01",
            "base_rent_amount": Decimal("350000.00"),
            "service_charges_amount": Decimal("30000.00"),
            "status": UnitStatus.VACANT
        })
        self.unit_2 = UnitService.create_unit(self.owner, str(self.property.id), {
            "unit_number": "Lot B02",
            "base_rent_amount": Decimal("400000.00"),
            "service_charges_amount": Decimal("40000.00"),
            "status": UnitStatus.VACANT
        })

        # Tenants
        self.tenant_1 = TenantService.create_tenant(self.owner, {
            "first_name": "Jean",
            "last_name": "Bakayoko",
            "phone_number": "+22501020304"
        })
        self.tenant_2 = TenantService.create_tenant(self.owner, {
            "first_name": "Fatou",
            "last_name": "Diop",
            "phone_number": "+22505060708"
        })

        # Active Leases
        self.lease_1 = LeaseService.create_lease(self.owner, {
            "unit": self.unit_1,
            "tenant": self.tenant_1,
            "start_date": date(2026, 1, 1),
            "rent_amount": Decimal("350000.00"),
            "charges_amount": Decimal("30000.00"),
            "payment_day_of_month": 5,
            "status": LeaseStatus.ACTIVE
        })
        self.lease_2 = LeaseService.create_lease(self.owner, {
            "unit": self.unit_2,
            "tenant": self.tenant_2,
            "start_date": date(2026, 1, 1),
            "rent_amount": Decimal("400000.00"),
            "charges_amount": Decimal("40000.00"),
            "payment_day_of_month": 10,
            "status": LeaseStatus.ACTIVE
        })

    def test_create_single_invoice_success(self):
        # Using a due_date in the future (Sept 2026) to test initial UNPAID status
        invoice = BillingService.generate_single_invoice(
            owner=self.owner,
            validated_data={
                "lease": self.lease_1,
                "period_start": date(2026, 9, 1),
                "period_end": date(2026, 9, 30),
                "due_date": date(2026, 9, 5),
                "rent_amount": Decimal("350000.00"),
                "charges_amount": Decimal("30000.00")
            },
            ip_address="127.0.0.1"
        )

        self.assertTrue(invoice.invoice_number.startswith("FACT-202609-"))
        self.assertEqual(invoice.total_expected, Decimal("380000.00"))
        self.assertEqual(invoice.remaining_balance, Decimal("380000.00"))
        self.assertEqual(invoice.status, InvoiceStatus.UNPAID)

    def test_prevent_duplicate_invoice_for_same_period(self):
        # Create first invoice
        BillingService.generate_single_invoice(
            owner=self.owner,
            validated_data={
                "lease": self.lease_1,
                "period_start": date(2026, 8, 1),
                "period_end": date(2026, 8, 31)
            }
        )

        # Attempt to create second invoice on same period
        with self.assertRaises(BusinessException):
            BillingService.generate_single_invoice(
                owner=self.owner,
                validated_data={
                    "lease": self.lease_1,
                    "period_start": date(2026, 8, 1),
                    "period_end": date(2026, 8, 31)
                }
            )

    def test_bulk_generation_and_deduplication(self):
        # 1. Bulk generate for August 2026
        result_1 = BillingService.generate_bulk_invoices(
            owner=self.owner,
            month=8,
            year=2026
        )
        self.assertEqual(result_1["generated_count"], 2)
        self.assertEqual(result_1["skipped_count"], 0)

        # 2. Re-run bulk generation for same month (should skip both)
        result_2 = BillingService.generate_bulk_invoices(
            owner=self.owner,
            month=8,
            year=2026
        )
        self.assertEqual(result_2["generated_count"], 0)
        self.assertEqual(result_2["skipped_count"], 2)

    def test_cancel_unpaid_invoice(self):
        invoice = BillingService.generate_single_invoice(
            owner=self.owner,
            validated_data={
                "lease": self.lease_1,
                "period_start": date(2026, 9, 1),
                "period_end": date(2026, 9, 30)
            }
        )

        cancelled_inv = BillingService.cancel_invoice(
            owner=self.owner,
            invoice_id=str(invoice.id),
            reason="Erreur sur la période de facturation"
        )
        self.assertEqual(cancelled_inv.status, InvoiceStatus.CANCELLED)
        self.assertIn("Erreur sur la période", cancelled_inv.notes)

    def test_billing_api_endpoints(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.tokens['access']}")

        # 1. POST /api/v1/billing/bulk-generate/
        bulk_res = self.client.post(
            "/api/v1/billing/bulk-generate/",
            {
                "month": 10,
                "year": 2026
            },
            format="json"
        )
        self.assertEqual(bulk_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(bulk_res.data["data"]["generated_count"], 2)

        # 2. GET /api/v1/billing/
        list_res = self.client.get("/api/v1/billing/?month=10&year=2026")
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_res.data["data"]), 2)
        inv_id = list_res.data["data"][0]["id"]

        # 3. GET /api/v1/billing/{id}/
        detail_res = self.client.get(f"/api/v1/billing/{inv_id}/")
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)
        self.assertIn("lease_detail", detail_res.data["data"])

        # 4. POST /api/v1/billing/{id}/cancel/
        cancel_res = self.client.post(
            f"/api/v1/billing/{inv_id}/cancel/",
            {"reason": "Demande d'annulation"},
            format="json"
        )
        self.assertEqual(cancel_res.status_code, status.HTTP_200_OK)
        self.assertEqual(cancel_res.data["data"]["status"], "CANCELLED")

        # 5. GET /api/v1/billing/stats/
        stats_res = self.client.get("/api/v1/billing/stats/?month=10&year=2026")
        self.assertEqual(stats_res.status_code, status.HTTP_200_OK)
        self.assertEqual(stats_res.data["data"]["total_invoices_count"], 1)  # 1 remaining active (1 cancelled excluded)
