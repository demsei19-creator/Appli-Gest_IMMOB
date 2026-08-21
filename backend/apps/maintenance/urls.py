from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MaintenanceRequestViewSet, SupplierViewSet

router = DefaultRouter()
router.register(r'suppliers', SupplierViewSet, basename='supplier')
router.register(r'', MaintenanceRequestViewSet, basename='maintenance')

urlpatterns = [
    path('', include(router.urls)),
]
