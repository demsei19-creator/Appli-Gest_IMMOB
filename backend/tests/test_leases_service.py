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
from apps.leases.models import Lease, Deposit
from apps.leases.constants import LeaseStatus, DepositStatus
from apps.leases.services.lease_service import LeaseService

User = get_user_model()


class LeaseServiceTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Owner
        self.owner = User.objects.create_user(
            email="owner.lease@example.com",
            password="SecurePassword123!",
            first_name="Amadou",
            last_name="Diallo",
            role=UserRole.OWNER,
            company_name="Diallo Immo"
        )
        self.tokens = AuthService.generate_tokens_for_user(self.owner)

        # Property & Unit
        self.property = PropertyService.create_property(self.owner, {
            "name": "Résidence Les Acacias",
            "address": "Zone 4",
            "city": "Abidjan"
        })
        self.unit = UnitService.create_unit(self.owner, str(self.property.id), {
            "unit_number": "Lot A01",
            "base_rent_amount": Decimal("300000.00"),
            "service_charges_amount": Decimal("25000.00"),
            "status": UnitStatus.VACANT
        })

        # Tenant
        self.tenant = TenantService.create_tenant(self.owner, {
            "first_name": "Paul",
            "last_name": "Kouassi",
            "phone_number": "+22507070707"
        })

    def test_create_lease_and_auto_deposit(self):
        lease_data = {
            "unit": self.unit,
            "tenant": self.tenant,
            "start_date": timezone.now().date(),
            "rent_amount": Decimal("300000.00"),
            "charges_amount": Decimal("25000.00"),
            "deposit_amount": Decimal("600000.00"),
            "status": LeaseStatus.ACTIVE
        }
        lease = LeaseService.create_lease(self.owner, lease_data, ip_address="127.0.0.1")

        self.assertTrue(lease.lease_number.startswith("BAIL-"))
        self.assertEqual(lease.total_monthly_amount, Decimal("325000.00"))
        self.assertEqual(lease.status, LeaseStatus.ACTIVE)

        # Check deposit was created automatically
        self.assertIsNotNone(lease.deposit)
        self.assertEqual(lease.deposit.amount, Decimal("600000.00"))
        self.assertEqual(lease.deposit.status, DepositStatus.PENDING)

        # Check unit status was updated to OCCUPIED
        self.unit.refresh_from_db()
        self.assertEqual(self.unit.status, UnitStatus.OCCUPIED)

    def test_prevent_second_active_lease_on_occupied_unit(self):
        # Create first active lease
        LeaseService.create_lease(self.owner, {
            "unit": self.unit,
            "tenant": self.tenant,
            "start_date": timezone.now().date(),
            "rent_amount": Decimal("300000.00"),
            "status": LeaseStatus.ACTIVE
        })

        # Second tenant
        tenant_2 = TenantService.create_tenant(self.owner, {
            "first_name": "Marc",
            "last_name": "Yao",
            "phone_number": "+22501010101"
        })

        # Attempt to create another active lease on same unit
        with self.assertRaises(BusinessException):
            LeaseService.create_lease(self.owner, {
                "unit": self.unit,
                "tenant": tenant_2,
                "start_date": timezone.now().date(),
                "rent_amount": Decimal("300000.00"),
                "status": LeaseStatus.ACTIVE
            })

    def test_terminate_lease_frees_unit(self):
        lease = LeaseService.create_lease(self.owner, {
            "unit": self.unit,
            "tenant": self.tenant,
            "start_date": timezone.now().date(),
            "rent_amount": Decimal("300000.00"),
            "status": LeaseStatus.ACTIVE
        })

        # Terminate lease
        terminated_lease = LeaseService.terminate_lease(
            owner=self.owner,
            lease_id=str(lease.id),
            termination_date=timezone.now().date(),
            reason="Départ volontaire du locataire",
            next_unit_status="VACANT"
        )
        self.assertEqual(terminated_lease.status, LeaseStatus.TERMINATED)

        # Verify unit is freed back to VACANT
        self.unit.refresh_from_db()
        self.assertEqual(self.unit.status, UnitStatus.VACANT)

    def test_deposit_management_flow(self):
        lease = LeaseService.create_lease(self.owner, {
            "unit": self.unit,
            "tenant": self.tenant,
            "start_date": timezone.now().date(),
            "rent_amount": Decimal("300000.00"),
            "deposit_amount": Decimal("600000.00"),
            "status": LeaseStatus.ACTIVE
        })

        # 1. Pay deposit
        deposit = LeaseService.manage_deposit(
            owner=self.owner,
            lease_id=str(lease.id),
            action='PAY',
            payment_method='Virement Bancaire',
            receipt_reference='VIR-998877'
        )
        self.assertEqual(deposit.status, DepositStatus.PAID)
        self.assertEqual(deposit.payment_method, 'Virement Bancaire')

        # 2. Refund partial deposit with deduction
        deposit_refunded = LeaseService.manage_deposit(
            owner=self.owner,
            lease_id=str(lease.id),
            action='REFUND',
            amount=Decimal('450000.00')
        )
        self.assertEqual(deposit_refunded.status, DepositStatus.PARTIALLY_REFUNDED)
        self.assertEqual(deposit_refunded.refunded_amount, Decimal('450000.00'))

    def test_lease_api_endpoints(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.tokens['access']}")

        # 1. POST /api/v1/leases/
        create_res = self.client.post(
            "/api/v1/leases/",
            {
                "unit": str(self.unit.id),
                "tenant": str(self.tenant.id),
                "start_date": str(timezone.now().date()),
                "rent_amount": "280000.00",
                "charges_amount": "20000.00",
                "deposit_amount": "560000.00",
                "status": "DRAFT"
            },
            format="json"
        )
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        lease_id = create_res.data["data"]["id"]

        # 2. POST /api/v1/leases/{id}/activate/
        act_res = self.client.post(f"/api/v1/leases/{lease_id}/activate/")
        self.assertEqual(act_res.status_code, status.HTTP_200_OK)
        self.assertEqual(act_res.data["data"]["status"], "ACTIVE")

        # 3. POST /api/v1/leases/{id}/deposit/
        dep_res = self.client.post(
            f"/api/v1/leases/{lease_id}/deposit/",
            {
                "action": "PAY",
                "payment_method": "Espèces",
                "receipt_reference": "REC-001"
            },
            format="json"
        )
        self.assertEqual(dep_res.status_code, status.HTTP_200_OK)
        self.assertEqual(dep_res.data["data"]["status"], "PAID")

        # 4. POST /api/v1/leases/{id}/terminate/
        term_res = self.client.post(
            f"/api/v1/leases/{lease_id}/terminate/",
            {
                "termination_date": str(timezone.now().date()),
                "reason": "Fin normale du bail"
            },
            format="json"
        )
        self.assertEqual(term_res.status_code, status.HTTP_200_OK)
        self.assertEqual(term_res.data["data"]["status"], "TERMINATED")

        # 5. GET /api/v1/leases/stats/
        stats_res = self.client.get("/api/v1/leases/stats/")
        self.assertEqual(stats_res.status_code, status.HTTP_200_OK)
        self.assertEqual(stats_res.data["data"]["total_leases"], 1)
