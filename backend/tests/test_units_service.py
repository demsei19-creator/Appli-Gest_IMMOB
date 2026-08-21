from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from common.exceptions import BusinessException, ValidationException, ResourceNotFoundException
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


class UnitServiceTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.owner = User.objects.create_user(
            email="owner.units@example.com",
            password="SecurePassword123!",
            first_name="Amadou",
            last_name="Diallo",
            role=UserRole.OWNER,
            company_name="Diallo Immo"
        )
        self.tokens = AuthService.generate_tokens_for_user(self.owner)

        self.property = PropertyService.create_property(self.owner, {
            "name": "Résidence La Palmeraie",
            "address": "Riviera 3",
            "city": "Abidjan"
        })

    def test_create_unit_success_and_duplicate_rejection(self):
        unit_data = {
            "unit_number": "Lot 101",
            "floor": "1er étage",
            "unit_type": UnitType.APARTMENT_T3,
            "surface_area_sqm": Decimal("90.50"),
            "rooms_count": 3,
            "bathrooms_count": 2,
            "base_rent_amount": Decimal("350000.00"),
            "service_charges_amount": Decimal("30000.00"),
            "water_meter_number": "WATER-00129",
            "electricity_meter_number": "CIE-998811",
            "status": UnitStatus.VACANT
        }
        unit = UnitService.create_unit(self.owner, str(self.property.id), unit_data)
        self.assertEqual(unit.total_rent_amount, Decimal("380000.00"))
        self.assertFalse(unit.is_occupied)

        # Re-creating same unit number in same property must be rejected
        with self.assertRaises(ValidationException):
            UnitService.create_unit(self.owner, str(self.property.id), unit_data)

    def test_unit_status_transitions(self):
        unit = UnitService.create_unit(self.owner, str(self.property.id), {
            "unit_number": "Lot 202",
            "base_rent_amount": Decimal("200000.00"),
            "status": UnitStatus.VACANT
        })

        # Switch to maintenance
        updated_unit = UnitService.update_unit_status(
            self.owner,
            str(unit.id),
            new_status=UnitStatus.MAINTENANCE,
            reason="Travaux de peinture"
        )
        self.assertEqual(updated_unit.status, UnitStatus.MAINTENANCE)

        # Switch back to vacant
        updated_unit_2 = UnitService.update_unit_status(
            self.owner,
            str(unit.id),
            new_status=UnitStatus.VACANT
        )
        self.assertEqual(updated_unit_2.status, UnitStatus.VACANT)

    def test_unit_cannot_be_set_vacant_with_active_lease(self):
        unit = UnitService.create_unit(self.owner, str(self.property.id), {
            "unit_number": "Lot 303",
            "base_rent_amount": Decimal("400000.00"),
            "status": UnitStatus.OCCUPIED
        })
        tenant = Tenant.objects.create(
            owner=self.owner,
            first_name="Jean",
            last_name="Konan",
            email="jean.k@example.com",
            phone_number="+22501020304"
        )
        Lease.objects.create(
            owner=self.owner,
            unit=unit,
            tenant=tenant,
            start_date=timezone.now().date(),
            rent_amount=Decimal("400000.00"),
            status=LeaseStatus.ACTIVE
        )

        # Cannot set to VACANT while lease is ACTIVE
        with self.assertRaises(BusinessException):
            UnitService.update_unit_status(self.owner, str(unit.id), new_status=UnitStatus.VACANT)

        # Cannot delete unit while lease is ACTIVE
        with self.assertRaises(BusinessException):
            UnitService.delete_unit(self.owner, str(unit.id))

    def test_unit_api_endpoints(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.tokens['access']}")

        # 1. POST /api/v1/units/
        create_res = self.client.post(
            "/api/v1/units/",
            {
                "property": str(self.property.id),
                "unit_number": "Appart C12",
                "floor": "3ème étage",
                "unit_type": "T2",
                "surface_area_sqm": "58.00",
                "base_rent_amount": "220000.00",
                "service_charges_amount": "20000.00"
            },
            format="json"
        )
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        unit_id = create_res.data["data"]["id"]

        # 2. GET /api/v1/units/
        list_res = self.client.get(f"/api/v1/units/?property={self.property.id}&status=VACANT")
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_res.data["data"]), 1)

        # 3. PATCH /api/v1/units/{id}/status/
        status_res = self.client.patch(
            f"/api/v1/units/{unit_id}/status/",
            {"status": "MAINTENANCE", "reason": "Rénovation plomberie"},
            format="json"
        )
        self.assertEqual(status_res.status_code, status.HTTP_200_OK)
        self.assertEqual(status_res.data["data"]["status"], "MAINTENANCE")
