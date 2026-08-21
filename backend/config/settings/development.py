from .base import *
import os

DEBUG = True

# Development allowed hosts
ALLOWED_HOSTS = ['*']

# CORS open in dev
CORS_ALLOW_ALL_ORIGINS = True

# Database Configuration with dynamic fallback for smooth local developer onboarding
DB_NAME = config('DB_NAME', default='appli_imob_db')
DB_USER = config('DB_USER', default='appli_imob_user')
DB_PASSWORD = config('DB_PASSWORD', default='appli_imob_secret_password')
DB_HOST = config('DB_HOST', default='localhost')
DB_PORT = config('DB_PORT', default='5432')

# If USE_SQLITE is explicitly requested or if Postgres is not configured
USE_SQLITE = config('USE_SQLITE', default=False, cast=bool)

if USE_SQLITE:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': DB_NAME,
            'USER': DB_USER,
            'PASSWORD': DB_PASSWORD,
            'HOST': DB_HOST,
            'PORT': DB_PORT,
            'CONN_MAX_AGE': 60,
        }
    }

# Email backend for development (console)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Celery eager mode for development when Redis is not running
CELERY_TASK_ALWAYS_EAGER = config('CELERY_TASK_ALWAYS_EAGER', default=True, cast=bool)
CELERY_TASK_EAGER_PROPAGATES = True
