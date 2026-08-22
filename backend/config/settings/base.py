from datetime import timedelta
import os
from pathlib import Path

try:
    from decouple import Csv, config
except ImportError:
    # Fallback if python-decouple is not installed yet
    def config(key, default=None, cast=None):
        val = os.environ.get(key, default)
        if cast is bool and isinstance(val, str):
            return val.lower() in ('true', '1', 't', 'yes')
        if cast and val is not None:
            return cast(val)
        return val

    def Csv():
        return lambda v: [x.strip() for x in v.split(',') if x.strip()]

# Build paths inside the project like this: BASE_DIR / 'subdir'.
# BASE_DIR points to backend/
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY', default='django-insecure-dev-temporary-secret-key-change-in-env-987654321')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1,0.0.0.0', cast=Csv())

# Application definition
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'drf_spectacular',
]

LOCAL_APPS = [
    'common.apps.CommonConfig',
    'apps.accounts.apps.AccountsConfig',
    'apps.properties.apps.PropertiesConfig',
    'apps.tenants.apps.TenantsConfig',
    'apps.leases.apps.LeasesConfig',
    'apps.billing.apps.BillingConfig',
    'apps.payments.apps.PaymentsConfig',
    'apps.maintenance.apps.MaintenanceConfig',
    'apps.expenses.apps.ExpensesConfig',
    'apps.taxes.apps.TaxesConfig',
    'apps.documents.apps.DocumentsConfig',
    'apps.notifications.apps.NotificationsConfig',
    'apps.reports.apps.ReportsConfig',
    'apps.audit.apps.AuditConfig',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# Custom User Model
AUTH_USER_MODEL = 'accounts.User'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 8},
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Django REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'common.pagination.StandardPagination',
    'PAGE_SIZE': 20,
    'EXCEPTION_HANDLER': 'common.exception_handler.custom_exception_handler',
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# Simple JWT Configuration
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=config('JWT_ACCESS_TOKEN_LIFETIME_MINUTES', default=60, cast=int)),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=config('JWT_REFRESH_TOKEN_LIFETIME_DAYS', default=7, cast=int)),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

def normalize_origin(origin: str) -> str:
    origin = origin.strip()
    if not origin:
        return ''
    if not (origin.startswith('http://') or origin.startswith('https://')):
        return f'https://{origin}'
    return origin

# CORS Configuration
CORS_ALLOW_ALL_ORIGINS = config('CORS_ALLOW_ALL_ORIGINS', default=False, cast=bool)
_raw_cors = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000',
    cast=Csv()
)
CORS_ALLOWED_ORIGINS = [normalize_origin(o) for o in _raw_cors if normalize_origin(o)]
CORS_ALLOW_CREDENTIALS = True

# CSRF Trusted Origins (essential for HTTPS proxies, Render, Vercel)
_raw_csrf = config(
    'CSRF_TRUSTED_ORIGINS',
    default='http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000',
    cast=Csv()
)
CSRF_TRUSTED_ORIGINS = [normalize_origin(o) for o in _raw_csrf if normalize_origin(o)]

# Redis & Celery
REDIS_URL = config('REDIS_URL', default='redis://localhost:6379/0')
CELERY_BROKER_URL = config('CELERY_BROKER_URL', default='redis://localhost:6379/1')
CELERY_RESULT_BACKEND = config('CELERY_RESULT_BACKEND', default='redis://localhost:6379/2')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

# DRF Spectacular (OpenAPI Documentation)
SPECTACULAR_SETTINGS = {
    'TITLE': 'API Plateforme de Gestion Immobilière',
    'DESCRIPTION': 'Documentation officielle des endpoints REST de la plateforme de gestion immobilière v1.0.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
}

# Frontend & OAuth Configuration
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:5173')
GOOGLE_CLIENT_ID = config('GOOGLE_CLIENT_ID', default='')

