from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PropertyTaxViewSet

router = DefaultRouter()
router.register(r'', PropertyTaxViewSet, basename='tax')

urlpatterns = [
    path('', include(router.urls)),
]
