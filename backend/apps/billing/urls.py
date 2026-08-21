from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RentInvoiceViewSet

router = DefaultRouter()
router.register(r'', RentInvoiceViewSet, basename='invoice')

urlpatterns = [
    path('', include(router.urls)),
]
