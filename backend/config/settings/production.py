import os
from .base import *

try:
    import dj_database_url
except ImportError:
    dj_database_url = None

DEBUG = config('DEBUG', default=False, cast=bool)

# Host configuration
ALLOWED_HOSTS = config(
    'ALLOWED_HOSTS',
    default='.onrender.com,localhost,127.0.0.1,0.0.0.0',
    cast=Csv()
)

# CSRF Trusted Origins for cloud deployments (Render, Vercel, etc.)
CSRF_TRUSTED_ORIGINS = config(
    'CSRF_TRUSTED_ORIGINS',
    default='https://*.onrender.com,https://*.vercel.app,http://localhost:5173',
    cast=Csv()
)

# Database Configuration (PostgreSQL Cloud: Neon, Render, Supabase, etc.)
database_url = config('DATABASE_URL', default=None)

if database_url and dj_database_url:
    DATABASES = {
        'default': dj_database_url.parse(
            database_url,
            conn_max_age=600,
            conn_health_checks=True,
            ssl_require=config('DB_SSL_REQUIRE', default=True, cast=bool)
        )
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('DB_NAME', default='appli_imob_db'),
            'USER': config('DB_USER', default='appli_imob_user'),
            'PASSWORD': config('DB_PASSWORD', default='appli_imob_secret_password'),
            'HOST': config('DB_HOST', default='postgres'),
            'PORT': config('DB_PORT', default='5432'),
            'CONN_MAX_AGE': 600,
        }
    }

# Security headers & SSL
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=True, cast=bool)
SESSION_COOKIE_SECURE = config('SESSION_COOKIE_SECURE', default=True, cast=bool)
CSRF_COOKIE_SECURE = config('CSRF_COOKIE_SECURE', default=True, cast=bool)
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default=31536000, cast=int)
SECURE_HSTS_INCLUDE_SUBDOMAINS = config('SECURE_HSTS_INCLUDE_SUBDOMAINS', default=True, cast=bool)
SECURE_HSTS_PRELOAD = config('SECURE_HSTS_PRELOAD', default=True, cast=bool)

# Email Backend in production (SMTP or Console fallback if SMTP credentials not configured)
EMAIL_HOST = config('EMAIL_HOST', default='')
if EMAIL_HOST:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
    EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
    EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
    EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
    DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='Plateforme Immo <noreply@example.com>')
else:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Celery in production (Eager fallback if REDIS_URL is not set on free tier)
CELERY_TASK_ALWAYS_EAGER = config('CELERY_TASK_ALWAYS_EAGER', default=True, cast=bool)
CELERY_TASK_EAGER_PROPAGATES = True

