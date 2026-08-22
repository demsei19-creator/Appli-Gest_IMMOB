import json
import urllib.request
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken
from common.services import BaseService
from common.exceptions import ValidationException, PermissionDeniedException, ResourceNotFoundException
from apps.accounts.constants import UserRole
from apps.audit.services.audit_service import AuditService

User = get_user_model()


class AuthService(BaseService):
    """
    Business service handling registration, authentication, password management,
    Google OAuth, and team collaborator delegation under strict multi-tenant isolation.
    """

    @classmethod
    def generate_tokens_for_user(cls, user: User) -> dict:
        """Generate JWT Access and Refresh tokens with custom claims."""
        refresh = RefreshToken.for_user(user)
        refresh['role'] = user.role
        refresh['email'] = user.email
        refresh['full_name'] = user.get_full_name()
        refresh['company_name'] = user.company_name

        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }

    @classmethod
    @transaction.atomic
    def register_owner(cls, validated_data: dict, ip_address: str = None) -> tuple[User, dict]:
        """
        Registers a new Owner user with full validation.
        """
        validated_data.pop('password_confirm', None)
        password = validated_data.pop('password')
        
        user = User.objects.create_user(
            password=password,
            role=UserRole.OWNER,
            **validated_data
        )

        tokens = cls.generate_tokens_for_user(user)

        AuditService.log_action(
            user=user,
            action='REGISTER',
            resource_type='User',
            resource_id=str(user.id),
            changes={'email': user.email, 'role': user.role, 'company': user.company_name},
            ip_address=ip_address
        )

        return user, tokens

    @classmethod
    def authenticate_user(cls, email: str, password: str, ip_address: str = None) -> tuple[User, dict]:
        """
        Validates email and password, checks active status, records login event, and returns JWT tokens.
        """
        try:
            user = User.objects.get(email__iexact=email.strip())
        except User.DoesNotExist:
            raise ValidationException("Identifiants incorrects (email ou mot de passe invalide).", code="INVALID_CREDENTIALS")

        if not user.check_password(password):
            raise ValidationException("Identifiants incorrects (email ou mot de passe invalide).", code="INVALID_CREDENTIALS")

        if not user.is_active:
            raise PermissionDeniedException("Votre compte est désactivé ou suspendu. Veuillez contacter le support.", code="ACCOUNT_DISABLED")

        # Update last login info
        user.last_login = timezone.now()
        if ip_address:
            user.last_login_ip = ip_address
        user.save(update_fields=['last_login', 'last_login_ip'])

        tokens = cls.generate_tokens_for_user(user)

        AuditService.log_action(
            user=user,
            action='LOGIN',
            resource_type='User',
            resource_id=str(user.id),
            changes={'login_at': timezone.now().isoformat()},
            ip_address=ip_address
        )

        return user, tokens

    @classmethod
    def _verify_google_id_token(cls, id_token: str) -> dict:
        """Verifies Google ID token against Google's tokeninfo endpoint."""
        try:
            url = f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
            req = urllib.request.Request(url, headers={'User-Agent': 'ImmoGestion/1.0'})
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode('utf-8'))
                if 'email' in data:
                    return data
        except Exception:
            pass
        return {}

    @classmethod
    @transaction.atomic
    def google_authenticate(cls, validated_data: dict, ip_address: str = None) -> tuple[User, dict, bool]:
        """
        Authenticates or signs up a user via Google OAuth.
        """
        id_token = validated_data.get('id_token')
        email = validated_data.get('email', '')
        first_name = validated_data.get('first_name', '')
        last_name = validated_data.get('last_name', '')
        avatar = validated_data.get('avatar', '')

        if id_token:
            google_info = cls._verify_google_id_token(id_token)
            if google_info and google_info.get('email'):
                email = google_info.get('email')
                first_name = google_info.get('given_name', first_name)
                last_name = google_info.get('family_name', last_name)
                avatar = google_info.get('picture', avatar)

        if not email:
            raise ValidationException("Impossible de récupérer l'adresse email depuis le compte Google.", code="GOOGLE_AUTH_FAILED")

        email = email.strip().lower()
        user = User.objects.filter(email__iexact=email).first()
        is_new = False

        if not user:
            is_new = True
            user = User.objects.create_user(
                email=email,
                first_name=first_name or "Utilisateur",
                last_name=last_name or "Google",
                role=UserRole.OWNER,
                company_name=validated_data.get('company_name', 'Patrimoine Immobilier'),
                is_active=True
            )
        else:
            if first_name and not user.first_name:
                user.first_name = first_name
            if last_name and not user.last_name:
                user.last_name = last_name

        if not user.is_active:
            raise PermissionDeniedException("Votre compte est désactivé ou suspendu.", code="ACCOUNT_DISABLED")

        user.last_login = timezone.now()
        if ip_address:
            user.last_login_ip = ip_address
        user.save(update_fields=['last_login', 'last_login_ip', 'first_name', 'last_name'])

        tokens = cls.generate_tokens_for_user(user)

        AuditService.log_action(
            user=user,
            action='LOGIN_GOOGLE',
            resource_type='User',
            resource_id=str(user.id),
            changes={'email': user.email, 'is_new': is_new},
            ip_address=ip_address
        )

        return user, tokens, is_new

    @classmethod
    def request_password_reset(cls, email: str, ip_address: str = None) -> dict:
        """
        Generates a secure password reset token and sends email instructions.
        """
        email = email.strip().lower()
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return {
                "sent": True,
                "message": "Si un compte est associé à cette adresse, un lien de réinitialisation vous a été envoyé."
            }

        if not user.is_active:
            raise PermissionDeniedException("Votre compte est désactivé.", code="ACCOUNT_DISABLED")

        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        reset_link = f"{frontend_url}/reset-password?uid={uid}&token={token}&email={email}"

        subject = "Réinitialisation de votre mot de passe - ImmoGestion Pro"
        message = f"""Bonjour {user.get_full_name() or user.email},

Vous avez demandé la réinitialisation de votre mot de passe sur la plateforme ImmoGestion Pro.

Veuillez cliquer sur le lien ci-dessous pour choisir votre nouveau mot de passe :
{reset_link}

Ce lien est sécurisé et valable pour une durée limitée. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.

Cordialement,
L'équipe ImmoGestion Pro
"""
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@appli-imob.com'),
                recipient_list=[user.email],
                fail_silently=True,
            )
        except Exception:
            pass

        AuditService.log_action(
            user=user,
            action='REQUEST_RESET',
            resource_type='User',
            resource_id=str(user.id),
            changes={'email': user.email},
            ip_address=ip_address
        )

        return {
            "sent": True,
            "reset_link": reset_link,
            "token": token,
            "uid": uid,
            "message": "Si un compte est associé à cette adresse, un lien de réinitialisation vous a été envoyé."
        }

    @classmethod
    @transaction.atomic
    def reset_password_with_token(cls, email: str, token: str, new_password: str, uid: str = None, ip_address: str = None) -> User:
        """
        Validates the password reset token and updates the user's password.
        """
        email = email.strip().lower()
        user = None
        if uid:
            try:
                user_id = force_str(urlsafe_base64_decode(uid))
                user = User.objects.get(pk=user_id)
            except Exception:
                pass

        if not user:
            try:
                user = User.objects.get(email__iexact=email)
            except User.DoesNotExist:
                raise ValidationException("Lien de réinitialisation invalide ou utilisateur introuvable.", code="INVALID_RESET_REQUEST")

        if not default_token_generator.check_token(user, token):
            raise ValidationException("Le lien de réinitialisation est invalide ou a expiré. Veuillez refaire une demande.", code="INVALID_OR_EXPIRED_TOKEN")

        user.set_password(new_password)
        user.save(update_fields=['password'])

        AuditService.log_action(
            user=user,
            action='RESET_PASSWORD',
            resource_type='User',
            resource_id=str(user.id),
            changes={'event': 'password_reset_completed'},
            ip_address=ip_address
        )

        return user

    @classmethod
    @transaction.atomic
    def change_password(cls, user: User, old_password: str, new_password: str, ip_address: str = None) -> None:
        """
        Changes password for authenticated user.
        """
        if not user.check_password(old_password):
            raise ValidationException("L'ancien mot de passe fourni est incorrect.", code="INVALID_OLD_PASSWORD")

        user.set_password(new_password)
        user.save(update_fields=['password'])

        AuditService.log_action(
            user=user,
            action='UPDATE',
            resource_type='User',
            resource_id=str(user.id),
            changes={'event': 'password_changed'},
            ip_address=ip_address
        )

    @classmethod
    @transaction.atomic
    def create_sub_user(cls, owner: User, validated_data: dict, ip_address: str = None) -> User:
        """
        Allows an OWNER to create a team member (MANAGER or ACCOUNTANT).
        """
        if not owner.is_owner:
            raise PermissionDeniedException("Seul un propriétaire peut inviter ou créer des collaborateurs.", code="ONLY_OWNER_CAN_ADD_STAFF")

        role = validated_data.get('role')
        if role not in [UserRole.MANAGER, UserRole.ACCOUNTANT]:
            raise ValidationException("Le rôle doit être un Gestionnaire ou un Comptable.", code="INVALID_SUB_USER_ROLE")

        password = validated_data.pop('password')

        sub_user = User.objects.create_user(
            password=password,
            managed_by_owner=owner,
            company_name=owner.company_name,
            **validated_data
        )

        AuditService.log_action(
            user=owner,
            action='CREATE',
            resource_type='User',
            resource_id=str(sub_user.id),
            changes={
                'sub_user_email': sub_user.email,
                'role': sub_user.role,
                'managed_by_owner': str(owner.id)
            },
            ip_address=ip_address
        )

        return sub_user

    @classmethod
    @transaction.atomic
    def update_sub_user_status(cls, owner: User, sub_user_id: str, is_active: bool, ip_address: str = None) -> User:
        """
        Enables or disables access for a team member belonging to the owner.
        """
        if not owner.is_owner:
            raise PermissionDeniedException("Action réservée au propriétaire du compte.", code="PERMISSION_DENIED")

        try:
            sub_user = User.objects.get(id=sub_user_id, managed_by_owner=owner)
        except User.DoesNotExist:
            raise ResourceNotFoundException("Collaborateur introuvable ou n'appartenant pas à votre compte.", code="SUB_USER_NOT_FOUND")

        sub_user.is_active = is_active
        sub_user.save(update_fields=['is_active'])

        AuditService.log_action(
            user=owner,
            action='UPDATE',
            resource_type='User',
            resource_id=str(sub_user.id),
            changes={'is_active': is_active},
            ip_address=ip_address
        )

        return sub_user
