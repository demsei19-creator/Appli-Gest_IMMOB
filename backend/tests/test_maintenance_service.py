from datetime import date
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from common.exceptions import ResourceNotFoundException, BusinessException
from apps.accounts.constants import UserRole
from apps.accounts.services.auth_service import AuthService
from apps.properties.models import Property, Unit
from apps.properties.constants import UnitStatus
from apps.properties.services.property_service import PropertyService
from apps.properties.services.unit_service import UnitService
from apps.tenants.models import Tenant
from apps.tenants.services.tenant_service import TenantService
from apps.maintenance.models import Supplier, MaintenanceRequest
from apps.maintenance.constants import MaintenancePriority, MaintenanceStatus, SupplierCategory
from apps.maintenance.services.maintenance_service import MaintenanceService

User = get_user_model()


class MaintenanceServiceTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Owner 1
        self.owner = User.objects.create_user(
            email="owner.maint@example.com",
            password="SecurePassword123!",
            first_name="Boubacar",
            last_name="Diallo",
            role=UserRole.OWNER,
            company_name="Diallo Immobilier"
        )
        self.tokens = AuthService.generate_tokens_for_user(self.owner)

        # Owner 2 (for isolation tests)
        self.other_owner = User.objects.create_user(
            email="other.maint@example.com",
            password="SecurePassword123!",
            first_name="Charles",
            last_name="Koffi",
            role=UserRole.OWNER
        )

        # Property & Unit
        self.property = PropertyService.create_property(self.owner, {
            "name": "Résidence Horizon",
            "address": "Plateau Dokui",
            "city": "Abidjan"
        })
        self.unit = UnitService.create_unit(self.owner, str(self.property.id), {
            "unit_number": "Appt 302",
            "base_rent_amount": Decimal("250000.00"),
            "service_charges_amount": Decimal("25000.00"),
            "status": UnitStatus.OCCUPIED
        })

        # Tenant
        self.tenant = TenantService.create_tenant(self.owner, {
            "first_name": "Mariam",
            "last_name": "Soro",
            "phone_number": "+22507001122"
        })

        # Supplier
        self.supplier = MaintenanceService.create_supplier(self.owner, {
            "name": "ETS Plomberie Express",
            "category": SupplierCategory.PLUMBING,
            "contact_name": "M. Konan",
            "phone_number": "+22501020304",
            "email": "konan.plomb@example.com",
            "tax_id": "CI-ABJ-2024-B-9988"
        })

    def test_create_maintenance_request_auto_ticket_number(self):
        req = MaintenanceService.create_maintenance_request(self.owner, {
            "property": self.property,
            "unit": self.unit,
            "reported_by_tenant": self.tenant,
            "title": "Fuite d'eau sous évier de cuisine",
            "description": "Important écoulement d'eau au niveau de la bonde de l'évier.",
            "priority": MaintenancePriority.URGENT
        })

        self.assertTrue(req.ticket_number.startswith("TICK-"))
        self.assertEqual(req.status, MaintenanceStatus.REPORTED)
        self.assertEqual(req.priority, MaintenancePriority.URGENT)
        self.assertEqual(req.property, self.property)
        self.assertEqual(req.unit, self.unit)

    def test_assign_supplier_and_lifecycle(self):
        # 1. Create ticket
        req = MaintenanceService.create_maintenance_request(self.owner, {
            "property": self.property,
            "unit": self.unit,
            "title": "Court-circuit salon",
            "description": "Disjoncteur principal qui saute",
            "priority": MaintenancePriority.HIGH
        })

        # 2. Assign supplier with estimated cost
        req = MaintenanceService.assign_supplier(
            owner=self.owner,
            request_id=str(req.id),
            supplier_id=str(self.supplier.id),
            estimated_cost=Decimal("45000.00")
        )
        self.assertEqual(req.supplier, self.supplier)
        self.assertEqual(req.status, MaintenanceStatus.ASSIGNED)
        self.assertEqual(req.estimated_cost, Decimal("45000.00"))

        # 3. Move to IN_PROGRESS
        req = MaintenanceService.update_status(
            owner=self.owner,
            request_id=str(req.id),
            status=MaintenanceStatus.IN_PROGRESS
        )
        self.assertEqual(req.status, MaintenanceStatus.IN_PROGRESS)

        # 4. Move to COMPLETED with actual cost
        req = MaintenanceService.update_status(
            owner=self.owner,
            request_id=str(req.id),
            status=MaintenanceStatus.COMPLETED,
            actual_cost=Decimal("42000.00")
        )
        self.assertEqual(req.status, MaintenanceStatus.COMPLETED)
        self.assertEqual(req.actual_cost, Decimal("42000.00"))
        self.assertIsNotNone(req.completed_date)

        # 5. Check Supplier aggregated stats
        self.assertEqual(self.supplier.total_interventions_count, 1)
        self.assertEqual(self.supplier.total_spent, Decimal("42000.00"))

    def test_owner_isolation(self):
        # Other owner tries to access owner's maintenance request
        req = MaintenanceService.create_maintenance_request(self.owner, {
            "property": self.property,
            "title": "Porte d'entrée bloquée",
            "description": "Serrure cassée",
            "priority": MaintenancePriority.MEDIUM
        })

        with self.assertRaises(ResourceNotFoundException):
            MaintenanceService.update_status(
                owner=self.other_owner,
                request_id=str(req.id),
                status=MaintenanceStatus.CANCELLED
            )

    def test_maintenance_and_supplier_api_endpoints(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.tokens['access']}")

        # 1. POST /api/v1/suppliers/
        sup_res = self.client.post(
            "/api/v1/suppliers/",
            {
                "name": "Électricité Moderne CI",
                "category": "ELECTRICAL",
                "contact_name": "Alassane",
                "phone_number": "+22505556677"
            },
            format="json"
        )
        self.assertEqual(sup_res.status_code, status.HTTP_201_CREATED)
        new_sup_id = sup_res.data["data"]["id"]

        # 2. POST /api/v1/maintenance/
        maint_res = self.client.post(
            "/api/v1/maintenance/",
            {
                "property": str(self.property.id),
                "unit": str(self.unit.id),
                "reported_by_tenant": str(self.tenant.id),
                "title": "Panne de climatiseur",
                "description": "L'appareil ne produit plus de froid dans la chambre.",
                "priority": "HIGH"
            },
            format="json"
        )
        self.assertEqual(maint_res.status_code, status.HTTP_201_CREATED)
        ticket_id = maint_res.data["data"]["id"]

        # 3. POST /api/v1/maintenance/{id}/assign-supplier/
        assign_res = self.client.post(
            f"/api/v1/maintenance/{ticket_id}/assign-supplier/",
            {
                "supplier_id": new_sup_id,
                "estimated_cost": "60000.00"
            },
            format="json"
        )
        self.assertEqual(assign_res.status_code, status.HTTP_200_OK)
        self.assertEqual(assign_res.data["data"]["status"], "ASSIGNED")

        # 4. POST /api/v1/maintenance/{id}/update-status/
        complete_res = self.client.post(
            f"/api/v1/maintenance/{ticket_id}/update-status/",
            {
                "status": "COMPLETED",
                "actual_cost": "55000.00",
                "notes": "Recharge de gaz R410 effectuée avec succès."
            },
            format="json"
        )
        self.assertEqual(complete_res.status_code, status.HTTP_200_OK)
        self.assertEqual(complete_res.data["data"]["status"], "COMPLETED")

        # 5. GET /api/v1/maintenance/stats/
        stats_res = self.client.get("/api/v1/maintenance/stats/")
        self.assertEqual(stats_res.status_code, status.HTTP_200_OK)
        self.assertEqual(stats_res.data["data"]["total_requests"], 1)
