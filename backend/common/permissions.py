from rest_framework.permissions import BasePermission


class IsAuthenticatedUser(BasePermission):
    """Allows access only to authenticated users."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


class IsOwner(BasePermission):
    """Allows access only to Property Owners (or superusers)."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return getattr(request.user, 'role', None) == 'OWNER' or request.user.is_superuser


class IsManager(BasePermission):
    """Allows access to Property Owners and Managers."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return getattr(request.user, 'role', None) in ['OWNER', 'MANAGER'] or request.user.is_superuser


class IsAccountant(BasePermission):
    """Allows access to Owners, Managers, and Accountants."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return getattr(request.user, 'role', None) in ['OWNER', 'MANAGER', 'ACCOUNTANT'] or request.user.is_superuser


class HasTenantOwnership(BasePermission):
    """
    Object-level permission to ensure a user only interacts with resources
    belonging to their owned portfolio or managed scope (Rule 8).
    """
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True

        # Check direct owner attribute
        if hasattr(obj, 'owner'):
            return obj.owner == request.user or (
                hasattr(request.user, 'managed_by_owner') and obj.owner == request.user.managed_by_owner
            )

        # Check nested property/lease owner if available
        if hasattr(obj, 'property') and hasattr(obj.property, 'owner'):
            return obj.property.owner == request.user

        return True
