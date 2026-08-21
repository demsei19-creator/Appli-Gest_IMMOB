from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

# API v1 URL patterns
api_v1_patterns = [
    path('auth/', include('apps.accounts.urls')),
    path('properties/', include('apps.properties.urls')),
    path('units/', include('apps.properties.unit_urls')),
    path('tenants/', include('apps.tenants.urls')),
    path('leases/', include('apps.leases.urls')),
    path('billing/', include('apps.billing.urls')),
    path('payments/', include('apps.payments.urls')),
    path('maintenance/', include('apps.maintenance.urls')),
    path('suppliers/', include('apps.maintenance.supplier_urls')),
    path('expenses/', include('apps.expenses.urls')),
    path('taxes/', include('apps.taxes.urls')),
    path('documents/', include('apps.documents.urls')),
    path('notifications/', include('apps.notifications.urls')),
    path('reports/', include('apps.reports.urls')),
    path('audit/', include('apps.audit.urls')),
]

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API v1 Root
    path('api/v1/', include((api_v1_patterns, 'api_v1'))),
    
    # OpenAPI Schema & Interactive Docs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/swagger/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/docs/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
