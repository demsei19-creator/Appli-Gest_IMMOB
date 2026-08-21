import uuid
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from .constants import UserRole


class UserManager(BaseUserManager):
    """Custom user manager where email is the unique identifier for auth."""
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("L'adresse email est obligatoire.")
        email = self.normalize_email(email)
        username = extra_fields.pop('username', email)
        user = self.model(email=email, username=username, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', UserRole.OWNER)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Le superutilisateur doit avoir is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Le superutilisateur doit avoir is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """
    Custom User model identifying users by Email and assigning business roles.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Identifiant unique UUID"
    )
    email = models.EmailField(
        unique=True,
        db_index=True,
        verbose_name="Adresse Email"
    )
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.OWNER,
        db_index=True,
        verbose_name="Rôle utilisateur"
    )
    phone_number = models.CharField(
        max_length=30,
        blank=True,
        verbose_name="Numéro de téléphone"
    )
    company_name = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Nom de la société / Patrimoine"
    )
    avatar = models.ImageField(
        upload_to='avatars/',
        null=True,
        blank=True,
        verbose_name="Photo de profil"
    )
    managed_by_owner = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='staff_members',
        verbose_name="Rattaché au Propriétaire",
        help_text="Permet d'associer un Gestionnaire ou Comptable au portefeuille d'un propriétaire"
    )
    last_login_ip = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name="Dernière adresse IP"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date d'inscription"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Dernière mise à jour"
    )

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"
        ordering = ['-date_joined']

    def __str__(self):
        full_name = self.get_full_name()
        return f"{full_name} ({self.email}) - {self.get_role_display()}" if full_name else self.email

    @property
    def is_owner(self) -> bool:
        return self.role == UserRole.OWNER

    @property
    def is_manager(self) -> bool:
        return self.role == UserRole.MANAGER

    @property
    def is_accountant(self) -> bool:
        return self.role == UserRole.ACCOUNTANT

    def get_effective_owner(self):
        """
        Returns the effective Owner user object for multi-tenant data isolation (Rule 8).
        If the user is an OWNER, returns self.
        If the user is a MANAGER or ACCOUNTANT, returns the managed_by_owner parent.
        """
        if self.is_owner:
            return self
        return self.managed_by_owner or self
