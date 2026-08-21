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
from apps.properties.constants import PropertyType, UnitType, UnitStatus
from apps.properties.services.property_service import PropertyService
from apps.properties.services.unit_service import UnitService
from apps.tenants.models import Tenant
from apps.leases.models import Lease
from apps.leases.constants import LeaseStatus

User = get_user_model()


class PropertyServiceTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Owner 1
        self.owner_1 = User.objects.create_user(
            email="owner.prop1@example.com",
            password="SecurePassword123!",
            first_name="Amadou",
            last_name="Diallo",
            role=UserRole.OWNER,
            company_name="Diallo Immo"
        )
        self.tokens_1 = AuthService.generate_tokens_for_user(self.owner_1)

        # Owner 2
        self.owner_2 = User.objects.create_user(
            email="owner.prop2@example.com",
            password="SecurePassword123!",
            first_name="Kouamé",
            last_name="Konan",
            role=UserRole.OWNER,
            company_name="Konan Immo"
        )

    def test_create_property_auto_code_and_kpis(self):
        prop_data = {
            "name": "Résidence Les Hibiscus",
            "property_type": PropertyType.BUILDING,
            "address": "25 Rue des Jardins",
            "city": "Abidjan",
            "country": "Côte d'Ivoire",
            "purchase_price": Decimal("350000000.00"),
            "estimated_value": Decimal("400000000.00"),
        }
        prop = PropertyService.create_property(self.owner_1, prop_data, ip_address="127.0.0.1")
        self.assertEqual(prop.owner, self.owner_1)
        self.assertTrue(prop.code.startswith("PROP-"))
        self.assertEqual(prop.units_count, 0)
        self.assertEqual(prop.occupancy_rate, 0.0)

        # Add 2 units: 1 vacant, 1 occupied
        UnitService.create_unit(self.owner_1, str(prop.id), {
            "unit_number": "A01",
            "unit_type": UnitType.APARTMENT_T2,
            "base_rent_amount": Decimal("200000.00"),
            "service_charges_amount": Decimal("20000.00"),
            "status": UnitStatus.VACANT
        })
        UnitService.create_unit(self.owner_1, str(prop.id), {
            "unit_number": "A02",
            "unit_type": UnitType.APARTMENT_T3,
            "base_rent_amount": Decimal("300000.00"),
            "service_charges_amount": Decimal("30000.00"),
            "status": UnitStatus.OCCUPIED
        })

        prop.refresh_from_db()
        self.assertEqual(prop.units_count, 2)
        self.assertEqual(prop.occupied_units_count, 1)
        self.assertEqual(prop.vacant_units_count, 1)
        self.assertEqual(prop.occupancy_rate, 50.0)
        self.assertEqual(prop.total_monthly_revenue_potential, Decimal("550000.00"))
        self.assertEqual(prop.actual_monthly_revenue, Decimal("330000.00"))

    def test_owner_isolation_on_property_update(self):
        prop = PropertyService.create_property(self.owner_1, {
            "name": "Immeuble Alpha",
            "address": "Plateau",
            "city": "Abidjan"
        })

        # Owner 2 cannot update Owner 1's property
        with self.assertRaises(ResourceNotFoundException):
            PropertyService.update_property(
                owner=self.owner_2,
                property_id=str(prop.id),
                validated_data={"name": "Hacked Name"}
            )

    def test_delete_property_prevented_if_active_lease(self):
        prop = PropertyService.create_property(self.owner_1, {
            "name": "Immeuble Beta",
            "address": "Cocody",
            "city": "Abidjan"
        })
        unit = UnitService.create_unit(self.owner_1, str(prop.id), {
            "unit_number": "B01",
            "base_rent_amount": Decimal("250000.00"),
            "status": UnitStatus.OCCUPIED
        })
        tenant = Tenant.objects.create(
            owner=self.owner_1,
            first_name="Seydou",
            last_name="Bamba",
            email="seydou@example.com",
            phone_number="+22501020304"
        )
        Lease.objects.create(
            owner=self.owner_1,
            unit=unit,
            tenant=tenant,
            start_date=timezone.now().date(),
            rent_amount=Decimal("250000.00"),
            status=LeaseStatus.ACTIVE
        )

        # Deletion must be blocked
        with self.assertRaises(BusinessException):
            PropertyService.delete_property(self.owner_1, str(prop.id))

    def test_property_api_endpoints(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.tokens_1['access']}")

        # 1. POST /api/v1/properties/
        create_res = self.client.post(
            "/api/v1/properties/",
            {
                "name": "Résidence Les Alizés",
                "property_type": "RESIDENCE",
                "address": "Boulevard Mitterrand",
                "city": "Abidjan",
                "purchase_price": "280000000.00"
            },
            format="json"
        )
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        prop_id = create_res.data["data"]["id"]

        # 2. GET /api/v1/properties/
        list_res = self.client.get("/api/v1/properties/?city=Abidjan")
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_res.data["data"]), 1)

        # 3. GET /api/v1/properties/{id}/
        detail_res = self.client.get(f"/api/v1/properties/{prop_id}/")
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_res.data["data"]["name"], "Résidence Les Alizés")

        # 4. GET /api/v1/properties/stats/
        stats_res = self.client.get("/api/v1/properties/stats/")
        self.assertEqual(stats_res.status_code, status.HTTP_200_OK)
        self.assertEqual(stats_res.data["data"]["total_properties"], 1)
