from django.contrib.auth import get_user_model
from django.db.models import QuerySet
from common.exceptions import ResourceNotFoundException

User = get_user_model()


def get_user_by_id(user_id: str) -> User:
    """
    Retrieves a user by their UUID primary key.
    """
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        raise ResourceNotFoundException("Utilisateur introuvable.", code="USER_NOT_FOUND")


def get_sub_users_for_owner(owner: User) -> QuerySet[User]:
    """
    Returns the list of collaborators (Managers, Accountants) belonging to the Owner.
    """
    return User.objects.filter(managed_by_owner=owner).order_by('-date_joined')


def get_users_managed_by_owner(owner: User) -> QuerySet[User]:
    """
    Alias for get_sub_users_for_owner.
    """
    return get_sub_users_for_owner(owner)


def get_sub_user_by_id(owner: User, sub_user_id: str) -> User:
    """
    Retrieves a single collaborator belonging to the owner.
    """
    try:
        return User.objects.get(id=sub_user_id, managed_by_owner=owner)
    except User.DoesNotExist:
        raise ResourceNotFoundException("Collaborateur introuvable.", code="SUB_USER_NOT_FOUND")
