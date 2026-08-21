from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    RegisterView,
    LoginView,
    LogoutView,
    CurrentUserProfileView,
    ChangePasswordView,
    TeamListView,
    TeamStatusUpdateView,
)

urlpatterns = [
    # Authentication endpoints
    path('auth/register/', RegisterView.as_view(), name='auth_register'),
    path('auth/login/', LoginView.as_view(), name='auth_login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='auth_refresh'),
    path('auth/logout/', LogoutView.as_view(), name='auth_logout'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='auth_change_password'),

    # Profile endpoints
    path('profile/', CurrentUserProfileView.as_view(), name='user_profile'),
    path('me/', CurrentUserProfileView.as_view(), name='user_me'),

    # Team & Collaborators endpoints (Owner only)
    path('team/', TeamListView.as_view(), name='team_list_create'),
    path('team/<uuid:sub_user_id>/status/', TeamStatusUpdateView.as_view(), name='team_update_status'),
]
