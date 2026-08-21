from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from common.exceptions import PermissionDeniedException, ResourceNotFoundException
from apps.accounts.constants import UserRole
from apps.accounts.services.auth_service import AuthService
from apps.accounts.selectors.user_selectors import get_sub_users_for_owner

User = get_user_model()


class TeamManagementTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create Owner 1
        self.owner_1 = User.objects.create_user(
            email="owner.one@example.com",
            password="SecurePassword123!",
            first_name="Amadou",
            last_name="Diallo",
            role=UserRole.OWNER,
            company_name="Diallo Patrimoine"
        )

        # Create Owner 2
        self.owner_2 = User.objects.create_user(
            email="owner.two@example.com",
            password="SecurePassword123!",
            first_name="Kouamé",
            last_name="Konan",
            role=UserRole.OWNER,
            company_name="Konan Holding"
        )

    def test_owner_create_manager_sub_user(self):
        manager_data = {
            "email": "manager.diallo@example.com",
            "password": "ManagerPass123!",
            "first_name": "Fatou",
            "last_name": "Bamba",
            "phone_number": "+2250102030405",
            "role": UserRole.MANAGER
        }
        manager = AuthService.create_sub_user(self.owner_1, manager_data)
        self.assertEqual(manager.role, UserRole.MANAGER)
        self.assertEqual(manager.managed_by_owner, self.owner_1)
        self.assertEqual(manager.company_name, self.owner_1.company_name)
        self.assertEqual(manager.get_effective_owner(), self.owner_1)

    def test_owner_create_accountant_sub_user(self):
        accountant_data = {
            "email": "accountant.diallo@example.com",
            "password": "AccountantPass123!",
            "first_name": "Sékou",
            "last_name": "Touré",
            "role": UserRole.ACCOUNTANT
        }
        accountant = AuthService.create_sub_user(self.owner_1, accountant_data)
        self.assertEqual(accountant.role, UserRole.ACCOUNTANT)
        self.assertEqual(accountant.managed_by_owner, self.owner_1)
        self.assertEqual(accountant.get_effective_owner(), self.owner_1)

    def test_manager_cannot_create_sub_user(self):
        manager = User.objects.create_user(
            email="manager.sub@example.com",
            password="Password123!",
            first_name="Ali",
            last_name="Traoré",
            role=UserRole.MANAGER,
            managed_by_owner=self.owner_1
        )
        with self.assertRaises(PermissionDeniedException):
            AuthService.create_sub_user(
                owner=manager,
                validated_data={"email": "test@test.com", "role": UserRole.ACCOUNTANT, "password": "Pass123!"}
            )

    def test_sub_users_isolation_and_status_toggle(self):
        # Create sub-user for Owner 1
        manager_1 = AuthService.create_sub_user(
            self.owner_1,
            {
                "email": "m1@example.com",
                "password": "Pass123!",
                "first_name": "M1",
                "last_name": "User",
                "role": UserRole.MANAGER
            }
        )

        # Owner 1 can see their sub-user
        owner_1_team = get_sub_users_for_owner(self.owner_1)
        self.assertEqual(owner_1_team.count(), 1)
        self.assertEqual(owner_1_team.first().id, manager_1.id)

        # Owner 2 sees 0 sub-users
        owner_2_team = get_sub_users_for_owner(self.owner_2)
        self.assertEqual(owner_2_team.count(), 0)

        # Owner 2 cannot toggle status of Owner 1's sub-user
        with self.assertRaises(ResourceNotFoundException):
            AuthService.update_sub_user_status(
                owner=self.owner_2,
                sub_user_id=str(manager_1.id),
                is_active=False
            )

        # Owner 1 deactivates sub-user
        updated_manager = AuthService.update_sub_user_status(
            owner=self.owner_1,
            sub_user_id=str(manager_1.id),
            is_active=False
        )
        self.assertFalse(updated_manager.is_active)

    def test_api_team_endpoints(self):
        tokens = AuthService.generate_tokens_for_user(self.owner_1)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        # POST /api/v1/auth/team/
        create_res = self.client.post(
            "/api/v1/auth/team/",
            {
                "email": "collab@diallo.ci",
                "password": "CollabPass123!",
                "first_name": "Awa",
                "last_name": "Sanogo",
                "role": "MANAGER"
            },
            format="json"
        )
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        sub_user_id = create_res.data["data"]["id"]

        # GET /api/v1/auth/team/
        list_res = self.client.get("/api/v1/auth/team/")
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_res.data["data"]), 1)

        # PATCH /api/v1/auth/team/{id}/status/
        toggle_res = self.client.patch(
            f"/api/v1/auth/team/{sub_user_id}/status/",
            {"is_active": False},
            format="json"
        )
        self.assertEqual(toggle_res.status_code, status.HTTP_200_OK)
        self.assertFalse(toggle_res.data["data"]["is_active"])
