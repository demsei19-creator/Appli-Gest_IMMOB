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
from apps.properties.services.property_service import PropertyService
from apps.properties.services.unit_service import UnitService
from apps.tenants.models import Tenant, EmergencyContact
from apps.tenants.constants import TenantType, IdCardType
from apps.tenants.services.tenant_service import TenantService
from apps.leases.models import Lease
from apps.leases.constants import LeaseStatus

User = get_user_model()


class TenantServiceTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Owner 1
        self.owner_1 = User.objects.create_user(
            email="owner.tenant1@example.com",
            password="SecurePassword123!",
            first_name="Amadou",
            last_name="Diallo",
            role=UserRole.OWNER,
            company_name="Diallo Immo"
        )
        self.tokens_1 = AuthService.generate_tokens_for_user(self.owner_1)

        # Owner 2
        self.owner_2 = User.objects.create_user(
            email="owner.tenant2@example.com",
            password="SecurePassword123!",
            first_name="Kouamé",
            last_name="Konan",
            role=UserRole.OWNER,
            company_name="Konan Immo"
        )

        self.property = PropertyService.create_property(self.owner_1, {
            "name": "Résidence Les Mimosas",
            "address": "Cocody Angré",
            "city": "Abidjan"
        })
        self.unit = UnitService.create_unit(self.owner_1, str(self.property.id), {
            "unit_number": "Lot M01",
            "base_rent_amount": Decimal("250000.00")
        })

    def test_create_individual_and_company_tenants(self):
        # 1. Individual
        indiv = TenantService.create_tenant(
            owner=self.owner_1,
            validated_data={
                "tenant_type": TenantType.INDIVIDUAL,
                "first_name": "Awa",
                "last_name": "Traoré",
                "email": "awa.traore@example.com",
                "phone_number": "+22507080910",
                "id_card_type": IdCardType.CNI,
                "id_card_number": "CI001928374",
                "profession": "Architecte",
                "monthly_income": Decimal("850000.00"),
            },
            emergency_contacts_data=[
                {
                    "name": "Moussa Traoré",
                    "relationship": "Frère",
                    "phone_number": "+22501020304"
                }
            ],
            ip_address="127.0.0.1"
        )
        self.assertEqual(indiv.full_name, "Awa Traoré")
        self.assertEqual(indiv.emergency_contacts.count(), 1)
        self.assertFalse(indiv.is_active_occupant)

        # 2. Company
        comp = TenantService.create_tenant(
            owner=self.owner_1,
            validated_data={
                "tenant_type": TenantType.COMPANY,
                "company_name": "SARL Afric Consulting",
                "email": "contact@afric-consulting.ci",
                "phone_number": "+22527202020",
                "id_card_type": IdCardType.RCCM,
                "id_card_number": "CI-ABJ-2023-B-1234",
                "tax_id": "CC-99887766-A"
            }
        )
        self.assertEqual(comp.full_name, "SARL Afric Consulting")

    def test_owner_isolation_on_tenant_update(self):
        tenant = TenantService.create_tenant(self.owner_1, {
            "first_name": "Bakary",
            "last_name": "Soro",
            "phone_number": "+22505050505"
        })

        with self.assertRaises(ResourceNotFoundException):
            TenantService.update_tenant(
                owner=self.owner_2,
                tenant_id=str(tenant.id),
                validated_data={"last_name": "Hacked"}
            )

    def test_delete_tenant_prevented_if_active_lease(self):
        tenant = TenantService.create_tenant(self.owner_1, {
            "first_name": "Yao",
            "last_name": "Koffi",
            "phone_number": "+22506060606"
        })
        Lease.objects.create(
            owner=self.owner_1,
            unit=self.unit,
            tenant=tenant,
            start_date=timezone.now().date(),
            rent_amount=Decimal("250000.00"),
            status=LeaseStatus.ACTIVE
        )

        with self.assertRaises(BusinessException):
            TenantService.delete_tenant(self.owner_1, str(tenant.id))

    def test_tenant_api_endpoints(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.tokens_1['access']}")

        # 1. POST /api/v1/tenants/
        create_res = self.client.post(
            "/api/v1/tenants/",
            {
                "tenant_type": "INDIVIDUAL",
                "first_name": "Salif",
                "last_name": "Cissé",
                "email": "salif@example.com",
                "phone_number": "+22501020304",
                "profession": "Ingénieur Télécom",
                "monthly_income": "900000.00"
            },
            format="json"
        )
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        tenant_id = create_res.data["data"]["id"]

        # 2. GET /api/v1/tenants/
        list_res = self.client.get("/api/v1/tenants/?search=Salif")
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_res.data["data"]), 1)

        # 3. GET /api/v1/tenants/{id}/
        detail_res = self.client.get(f"/api/v1/tenants/{tenant_id}/")
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_res.data["data"]["full_name"], "Salif Cissé")

        # 4. POST /api/v1/tenants/{id}/emergency-contacts/
        contact_res = self.client.post(
            f"/api/v1/tenants/{tenant_id}/emergency-contacts/",
            {
                "name": "Mariam Cissé",
                "relationship": "Épouse",
                "phone_number": "+22507070707"
            },
            format="json"
        )
        self.assertEqual(contact_res.status_code, status.HTTP_201_CREATED)

        # 5. GET /api/v1/tenants/stats/
        stats_res = self.client.get("/api/v1/tenants/stats/")
        self.assertEqual(stats_res.status_code, status.HTTP_200_OK)
        self.assertEqual(stats_res.data["data"]["total_tenants"], 1)
