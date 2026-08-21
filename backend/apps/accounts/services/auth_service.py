from django.contrib.auth import get_user_model
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
    and team collaborator delegation under strict multi-tenant isolation.
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
