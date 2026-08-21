import re
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from .constants import UserRole

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Public representation of an authenticated user."""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'role',
            'role_display',
            'phone_number',
            'company_name',
            'avatar',
            'is_active',
            'is_owner',
            'is_manager',
            'is_accountant',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id', 'email', 'role', 'role_display', 'is_active',
            'is_owner', 'is_manager', 'is_accountant', 'created_at', 'updated_at'
        ]


class RegisterSerializer(serializers.ModelSerializer):
    """Registration serializer for new Owners."""
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            'email',
            'password',
            'password_confirm',
            'first_name',
            'last_name',
            'company_name',
            'phone_number',
        ]

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Un compte avec cette adresse email existe déjà.")
        return email

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Le mot de passe doit comporter au moins 8 caractères.")
        if not re.search(r'[A-Za-z]', value) or not re.search(r'\d', value):
            raise serializers.ValidationError("Le mot de passe doit contenir au moins une lettre et un chiffre.")
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password_confirm": "Les mots de passe ne correspondent pas."})
        return attrs


class LoginSerializer(serializers.Serializer):
    """Serializer for email/password authentication."""
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)
    remember_me = serializers.BooleanField(default=False, required=False)

    def validate_email(self, value):
        return value.strip().lower()


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile info."""
    class Meta:
        model = User
        fields = [
            'first_name',
            'last_name',
            'phone_number',
            'company_name',
            'avatar',
        ]


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for changing password by authenticated user."""
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(required=True, write_only=True, min_length=8)

    def validate_new_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Le nouveau mot de passe doit comporter au moins 8 caractères.")
        if not re.search(r'[A-Za-z]', value) or not re.search(r'\d', value):
            raise serializers.ValidationError("Le mot de passe doit contenir au moins une lettre et un chiffre.")
        return value

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({"new_password_confirm": "Les nouveaux mots de passe ne correspondent pas."})
        if attrs['old_password'] == attrs['new_password']:
            raise serializers.ValidationError({"new_password": "Le nouveau mot de passe doit être différent de l'ancien."})
        return attrs


class SubUserCreateSerializer(serializers.ModelSerializer):
    """
    Serializer used by an OWNER to create or invite a team collaborator (MANAGER or ACCOUNTANT).
    """
    role = serializers.ChoiceField(
        choices=[(UserRole.MANAGER, 'Gestionnaire'), (UserRole.ACCOUNTANT, 'Comptable')],
        required=True
    )
    password = serializers.CharField(write_only=True, min_length=8, required=True)

    class Meta:
        model = User
        fields = [
            'email',
            'first_name',
            'last_name',
            'phone_number',
            'role',
            'password',
        ]

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Cette adresse email est déjà utilisée.")
        return email

    def validate_role(self, value):
        if value not in [UserRole.MANAGER, UserRole.ACCOUNTANT]:
            raise serializers.ValidationError("Le rôle doit être Gestionnaire (MANAGER) ou Comptable (ACCOUNTANT).")
        return value


class SubUserListSerializer(serializers.ModelSerializer):
    """Serializer for listing collaborators created by the owner."""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'role',
            'role_display',
            'phone_number',
            'is_active',
            'created_at',
            'last_login',
        ]
        read_only_fields = fields


class SubUserStatusSerializer(serializers.Serializer):
    """Serializer to activate / deactivate a team member."""
    is_active = serializers.BooleanField(required=True)
