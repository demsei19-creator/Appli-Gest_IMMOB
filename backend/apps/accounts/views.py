from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from common.permissions import IsOwner
from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    GoogleAuthSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    UserProfileUpdateSerializer,
    UserSerializer,
    ChangePasswordSerializer,
    SubUserCreateSerializer,
    SubUserListSerializer,
    SubUserStatusSerializer,
)
from .services.auth_service import AuthService
from .selectors.user_selectors import get_sub_users_for_owner


def get_client_ip(request):
    """Utility to extract real client IP address from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


class RegisterView(APIView):
    """
    POST /api/v1/accounts/auth/register/
    Owner registration endpoint.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)
        user, tokens = AuthService.register_owner(serializer.validated_data, ip_address=ip)

        return Response(
            {
                "success": True,
                "message": "Votre compte Propriétaire a été créé avec succès.",
                "data": {
                    "user": UserSerializer(user).data,
                    "tokens": tokens,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """
    POST /api/v1/accounts/auth/login/
    User authentication endpoint returning JWT tokens and user profile.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        ip = get_client_ip(request)

        user, tokens = AuthService.authenticate_user(email=email, password=password, ip_address=ip)

        return Response(
            {
                "success": True,
                "message": "Connexion réussie.",
                "data": {
                    "user": UserSerializer(user).data,
                    "tokens": tokens,
                },
            },
            status=status.HTTP_200_OK,
        )


class GoogleAuthView(APIView):
    """
    POST /api/v1/accounts/auth/google/
    Authenticate or Register via Google OAuth.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        user, tokens, is_new = AuthService.google_authenticate(
            validated_data=serializer.validated_data,
            ip_address=ip
        )

        msg = "Bienvenue sur ImmoGestion Pro !" if is_new else "Connexion avec Google réussie."

        return Response(
            {
                "success": True,
                "message": msg,
                "data": {
                    "user": UserSerializer(user).data,
                    "tokens": tokens,
                    "is_new": is_new,
                },
            },
            status=status.HTTP_200_OK,
        )


class ForgotPasswordView(APIView):
    """
    POST /api/v1/accounts/auth/forgot-password/
    Send password reset instructions via email.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        result = AuthService.request_password_reset(
            email=serializer.validated_data['email'],
            ip_address=ip
        )

        return Response(
            {
                "success": True,
                "message": result.get("message", "Instructions de réinitialisation envoyées."),
                "data": result,
            },
            status=status.HTTP_200_OK,
        )


class ResetPasswordView(APIView):
    """
    POST /api/v1/accounts/auth/reset-password/
    Reset user password using verification token.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        user = AuthService.reset_password_with_token(
            email=serializer.validated_data['email'],
            token=serializer.validated_data['token'],
            new_password=serializer.validated_data['new_password'],
            uid=serializer.validated_data.get('uid'),
            ip_address=ip
        )

        return Response(
            {
                "success": True,
                "message": "Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.",
                "data": {
                    "user": UserSerializer(user).data
                }
            },
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    """
    POST /api/v1/accounts/auth/logout/
    Blacklists the provided refresh token.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {"success": False, "error": {"code": "MISSING_REFRESH_TOKEN", "message": "Le token de rafraîchissement est requis."}},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"success": True, "message": "Déconnexion réussie."}, status=status.HTTP_200_OK)
        except Exception:
            return Response(
                {"success": False, "error": {"code": "INVALID_TOKEN", "message": "Token invalide ou déjà expiré."}},
                status=status.HTTP_400_BAD_REQUEST
            )


class CurrentUserProfileView(APIView):
    """
    GET /api/v1/accounts/profile/ (or /me/) - Retrieve authenticated user profile
    PATCH /api/v1/accounts/profile/ - Update authenticated user personal info
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response({
            "success": True,
            "data": serializer.data
        })

    def patch(self, request):
        serializer = UserProfileUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        ip = get_client_ip(request)
        AuthService.log_action(
            user=user,
            action='UPDATE',
            resource_type='User',
            resource_id=str(user.id),
            changes=serializer.validated_data,
            ip_address=ip
        )

        return Response({
            "success": True,
            "message": "Votre profil a été mis à jour.",
            "data": UserSerializer(user).data
        })


class ChangePasswordView(APIView):
    """
    POST /api/v1/accounts/auth/change-password/
    Password change endpoint for authenticated users.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        old_password = serializer.validated_data['old_password']
        new_password = serializer.validated_data['new_password']
        ip = get_client_ip(request)

        AuthService.change_password(
            user=request.user,
            old_password=old_password,
            new_password=new_password,
            ip_address=ip
        )

        return Response({
            "success": True,
            "message": "Votre mot de passe a été modifié avec succès."
        })


class TeamListView(APIView):
    """
    GET /api/v1/accounts/team/ - List all collaborators belonging to current owner
    POST /api/v1/accounts/team/ - Create/invite a new collaborator (Manager or Accountant)
    """
    permission_classes = [IsAuthenticated, IsOwner]

    def get(self, request):
        sub_users = get_sub_users_for_owner(request.user)
        serializer = SubUserListSerializer(sub_users, many=True)
        return Response({
            "success": True,
            "data": serializer.data
        })

    def post(self, request):
        serializer = SubUserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        sub_user = AuthService.create_sub_user(
            owner=request.user,
            validated_data=serializer.validated_data,
            ip_address=ip
        )

        return Response(
            {
                "success": True,
                "message": f"Le collaborateur {sub_user.get_full_name()} ({sub_user.get_role_display()}) a été créé.",
                "data": SubUserListSerializer(sub_user).data
            },
            status=status.HTTP_201_CREATED
        )


class TeamStatusUpdateView(APIView):
    """
    PATCH /api/v1/accounts/team/{id}/status/
    Enable or disable access for a team member.
    """
    permission_classes = [IsAuthenticated, IsOwner]

    def patch(self, request, sub_user_id):
        serializer = SubUserStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        sub_user = AuthService.update_sub_user_status(
            owner=request.user,
            sub_user_id=sub_user_id,
            is_active=serializer.validated_data['is_active'],
            ip_address=ip
        )

        state_str = "activé" if sub_user.is_active else "suspendu"
        return Response({
            "success": True,
            "message": f"Le compte de {sub_user.get_full_name()} a été {state_str}.",
            "data": SubUserListSerializer(sub_user).data
        })
