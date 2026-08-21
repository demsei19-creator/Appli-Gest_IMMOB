from datetime import date
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from common.exceptions import FinancialException, ResourceNotFoundException
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
from apps.payments.models import Payment, PaymentAllocation
from apps.payments.constants import PaymentStatus, PaymentMethod
from apps.payments.services.payment_service import PaymentService

User = get_user_model()


class PaymentServiceTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Owner
        self.owner = User.objects.create_user(
            email="owner.payments@example.com",
            password="SecurePassword123!",
            first_name="Seydou",
            last_name="Traoré",
            role=UserRole.OWNER,
            company_name="Traoré Immobilier"
        )
        self.tokens = AuthService.generate_tokens_for_user(self.owner)

        # Property & Unit
        self.property = PropertyService.create_property(self.owner, {
            "name": "Résidence Les Flamboyants",
            "address": "Riviera Golf",
            "city": "Abidjan"
        })
        self.unit = UnitService.create_unit(self.owner, str(self.property.id), {
            "unit_number": "Villa 12",
            "base_rent_amount": Decimal("500000.00"),
            "service_charges_amount": Decimal("50000.00"),
            "status": UnitStatus.VACANT
        })

        # Tenant
        self.tenant = TenantService.create_tenant(self.owner, {
            "first_name": "Aïssatou",
            "last_name": "Bamba",
            "phone_number": "+22507890102"
        })

        # Active Lease
        self.lease = LeaseService.create_lease(self.owner, {
            "unit": self.unit,
            "tenant": self.tenant,
            "start_date": date(2026, 1, 1),
            "rent_amount": Decimal("500000.00"),
            "charges_amount": Decimal("50000.00"),
            "payment_day_of_month": 5,
            "status": LeaseStatus.ACTIVE
        })

        # Generate 2 consecutive monthly invoices: July (550k) and August (550k)
        self.inv_july = BillingService.generate_single_invoice(self.owner, {
            "lease": self.lease,
            "period_start": date(2026, 7, 1),
            "period_end": date(2026, 7, 31),
            "due_date": date(2026, 7, 5),
            "rent_amount": Decimal("500000.00"),
            "charges_amount": Decimal("50000.00")
        })
        self.inv_august = BillingService.generate_single_invoice(self.owner, {
            "lease": self.lease,
            "period_start": date(2026, 8, 1),
            "period_end": date(2026, 8, 31),
            "due_date": date(2026, 8, 5),
            "rent_amount": Decimal("500000.00"),
            "charges_amount": Decimal("50000.00")
        })

    def test_record_payment_fifo_multi_invoice(self):
        # Pay 800,000 FCFA: should fully pay July (550k) and partially pay August (250k)
        payment = PaymentService.record_payment(
            owner=self.owner,
            tenant_id=str(self.tenant.id),
            amount=Decimal("800000.00"),
            payment_date=date(2026, 8, 10),
            payment_method=PaymentMethod.BANK_TRANSFER,
            reference_number="VIR-2026-7890",
            auto_allocate_fifo=True,
            ip_address="127.0.0.1"
        )

        self.assertTrue(payment.payment_number.startswith("PAI-"))
        self.assertTrue(payment.receipt_number.startswith("QUIT-"))
        self.assertEqual(payment.amount, Decimal("800000.00"))
        self.assertEqual(payment.allocations.count(), 2)

        # Refresh July invoice
        self.inv_july.refresh_from_db()
        self.assertEqual(self.inv_july.total_paid, Decimal("550000.00"))
        self.assertEqual(self.inv_july.remaining_balance, Decimal("0.00"))
        self.assertEqual(self.inv_july.status, InvoiceStatus.PAID)

        # Refresh August invoice
        self.inv_august.refresh_from_db()
        self.assertEqual(self.inv_august.total_paid, Decimal("250000.00"))
        self.assertEqual(self.inv_august.remaining_balance, Decimal("300000.00"))
        self.assertEqual(self.inv_august.status, InvoiceStatus.PARTIAL)

    def test_cancel_payment_restores_invoices(self):
        # 1. Record payment
        payment = PaymentService.record_payment(
            owner=self.owner,
            tenant_id=str(self.tenant.id),
            amount=Decimal("800000.00"),
            payment_date=date(2026, 8, 10),
            payment_method=PaymentMethod.CASH,
            auto_allocate_fifo=True
        )

        # 2. Cancel payment
        cancelled = PaymentService.cancel_payment(
            owner=self.owner,
            payment_id=str(payment.id),
            reason="Chèque sans provision"
        )
        self.assertEqual(cancelled.status, PaymentStatus.CANCELLED)

        # 3. Verify July & August invoices are reverted back to OVERDUE/UNPAID with 0 paid
        self.inv_july.refresh_from_db()
        self.assertEqual(self.inv_july.total_paid, Decimal("0.00"))
        self.assertEqual(self.inv_july.remaining_balance, Decimal("550000.00"))
        self.assertIn(self.inv_july.status, [InvoiceStatus.UNPAID, InvoiceStatus.OVERDUE])

        self.inv_august.refresh_from_db()
        self.assertEqual(self.inv_august.total_paid, Decimal("0.00"))
        self.assertEqual(self.inv_august.remaining_balance, Decimal("550000.00"))

    def test_get_receipt_structured_data(self):
        payment = PaymentService.record_payment(
            owner=self.owner,
            tenant_id=str(self.tenant.id),
            amount=Decimal("550000.00"),
            payment_date=date(2026, 8, 10),
            payment_method=PaymentMethod.BANK_TRANSFER
        )

        receipt = PaymentService.get_receipt_data(self.owner, str(payment.id))
        self.assertEqual(receipt["receipt_number"], payment.receipt_number)
        self.assertEqual(receipt["tenant"]["full_name"], self.tenant.full_name)
        self.assertEqual(len(receipt["allocations"]), 1)
        self.assertEqual(receipt["allocations"][0]["invoice_number"], self.inv_july.invoice_number)

    def test_payment_api_endpoints(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.tokens['access']}")

        # 1. POST /api/v1/payments/
        create_res = self.client.post(
            "/api/v1/payments/",
            {
                "tenant": str(self.tenant.id),
                "amount": "550000.00",
                "payment_date": "2026-08-15",
                "payment_method": "BANK_TRANSFER",
                "reference_number": "TEST-VIR-001",
                "auto_allocate_fifo": True
            },
            format="json"
        )
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        pay_id = create_res.data["data"]["id"]

        # 2. GET /api/v1/payments/
        list_res = self.client.get("/api/v1/payments/")
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_res.data["data"]), 1)

        # 3. GET /api/v1/payments/{id}/receipt/
        receipt_res = self.client.get(f"/api/v1/payments/{pay_id}/receipt/")
        self.assertEqual(receipt_res.status_code, status.HTTP_200_OK)
        self.assertIn("receipt_number", receipt_res.data["data"])

        # 4. POST /api/v1/payments/{id}/cancel/
        cancel_res = self.client.post(
            f"/api/v1/payments/{pay_id}/cancel/",
            {"reason": "Erreur de compte émetteur"},
            format="json"
        )
        self.assertEqual(cancel_res.status_code, status.HTTP_200_OK)
        self.assertEqual(cancel_res.data["data"]["status"], "CANCELLED")

        # 5. GET /api/v1/payments/stats/
        stats_res = self.client.get("/api/v1/payments/stats/")
        self.assertEqual(stats_res.status_code, status.HTTP_200_OK)
