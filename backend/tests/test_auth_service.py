from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from common.exceptions import ValidationException, PermissionDeniedException
from apps.accounts.constants import UserRole
from apps.accounts.services.auth_service import AuthService

User = get_user_model()


class AuthServiceTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner_data = {
            "email": "owner.alpha@example.com",
            "password": "SecurePassword123!",
            "password_confirm": "SecurePassword123!",
            "first_name": "Amadou",
            "last_name": "Diallo",
            "company_name": "Diallo Immobilier",
            "phone_number": "+2250708091011",
        }

    def test_register_owner_service_success(self):
        user, tokens = AuthService.register_owner(self.owner_data.copy(), ip_address="127.0.0.1")
        self.assertEqual(user.email, "owner.alpha@example.com")
        self.assertEqual(user.role, UserRole.OWNER)
        self.assertTrue(user.is_owner)
        self.assertIn("access", tokens)
        self.assertIn("refresh", tokens)

    def test_authenticate_user_success(self):
        user, _ = AuthService.register_owner(self.owner_data.copy())
        auth_user, tokens = AuthService.authenticate_user(
            email="owner.alpha@example.com",
            password="SecurePassword123!",
            ip_address="192.168.1.50"
        )
        self.assertEqual(auth_user.id, user.id)
        self.assertEqual(auth_user.last_login_ip, "192.168.1.50")
        self.assertIsNotNone(auth_user.last_login)
        self.assertIn("access", tokens)

    def test_authenticate_user_invalid_credentials(self):
        AuthService.register_owner(self.owner_data.copy())
        with self.assertRaises(ValidationException):
            AuthService.authenticate_user(
                email="owner.alpha@example.com",
                password="WrongPassword999!"
            )

    def test_authenticate_user_inactive_account(self):
        user, _ = AuthService.register_owner(self.owner_data.copy())
        user.is_active = False
        user.save()
        with self.assertRaises(PermissionDeniedException):
            AuthService.authenticate_user(
                email="owner.alpha@example.com",
                password="SecurePassword123!"
            )

    def test_change_password_success(self):
        user, _ = AuthService.register_owner(self.owner_data.copy())
        AuthService.change_password(
            user=user,
            old_password="SecurePassword123!",
            new_password="BrandNewPassword456!",
            ip_address="127.0.0.1"
        )
        # Should now authenticate with new password
        auth_user, _ = AuthService.authenticate_user(
            email="owner.alpha@example.com",
            password="BrandNewPassword456!"
        )
        self.assertEqual(auth_user.id, user.id)

    def test_change_password_wrong_old_password(self):
        user, _ = AuthService.register_owner(self.owner_data.copy())
        with self.assertRaises(ValidationException):
            AuthService.change_password(
                user=user,
                old_password="IncorrectPassword!",
                new_password="BrandNewPassword456!"
            )

    def test_api_register_and_login_endpoints(self):
        # 1. API Register
        reg_response = self.client.post(
            "/api/v1/auth/auth/register/",
            self.owner_data,
            format="json"
        )
        self.assertEqual(reg_response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(reg_response.data["success"])
        self.assertEqual(reg_response.data["data"]["user"]["role"], "OWNER")

        # 2. API Login
        login_response = self.client.post(
            "/api/v1/auth/auth/login/",
            {
                "email": "owner.alpha@example.com",
                "password": "SecurePassword123!"
            },
            format="json"
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        access_token = login_response.data["data"]["tokens"]["access"]
        refresh_token = login_response.data["data"]["tokens"]["refresh"]

        # 3. API Profile with JWT
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        profile_response = self.client.get("/api/v1/auth/profile/")
        self.assertEqual(profile_response.status_code, status.HTTP_200_OK)
        self.assertEqual(profile_response.data["data"]["email"], "owner.alpha@example.com")

        # 4. API Logout
        logout_response = self.client.post(
            "/api/v1/auth/auth/logout/",
            {"refresh": refresh_token},
            format="json"
        )
        self.assertEqual(logout_response.status_code, status.HTTP_200_OK)
