import logging
from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.http import Http404
from rest_framework import exceptions as drf_exceptions
from rest_framework.response import Response
from rest_framework.views import exception_handler

from .exceptions import BaseAppException

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Standardized DRF Exception Handler.
    Ensures every error response adheres to the official JSON contract:
    {
      "success": false,
      "error": {
        "code": "ERROR_CODE",
        "message": "Descriptive message",
        "details": {}
      }
    }
    """
    # 1. Custom Domain Exception
    if isinstance(exc, BaseAppException):
        return Response(
            {
                "success": False,
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details,
                },
            },
            status=exc.status_code,
        )

    # 2. Django Core Exceptions
    if isinstance(exc, Http404):
        exc = drf_exceptions.NotFound()
    elif isinstance(exc, DjangoPermissionDenied):
        exc = drf_exceptions.PermissionDenied()

    # 3. Standard DRF Exception Handling
    response = exception_handler(exc, context)

    if response is not None:
        error_code = "API_ERROR"
        message = "Une erreur est survenue lors du traitement de la requête."
        details = response.data

        if isinstance(exc, drf_exceptions.ValidationError):
            error_code = "VALIDATION_ERROR"
            message = "Certains champs envoyés sont invalides."
        elif isinstance(exc, drf_exceptions.NotAuthenticated):
            error_code = "AUTHENTICATION_REQUIRED"
            message = "Authentification requise pour accéder à cette ressource."
        elif isinstance(exc, drf_exceptions.AuthenticationFailed):
            error_code = "AUTHENTICATION_FAILED"
            message = "Les identifiants fournis sont invalides."
        elif isinstance(exc, drf_exceptions.PermissionDenied):
            error_code = "PERMISSION_DENIED"
            message = "Vous ne disposez pas des permissions nécessaires."
        elif isinstance(exc, drf_exceptions.NotFound):
            error_code = "NOT_FOUND"
            message = "La ressource demandée n'existe pas."
        elif isinstance(exc, drf_exceptions.MethodNotAllowed):
            error_code = "METHOD_NOT_ALLOWED"
            message = f"La méthode HTTP {context['request'].method} n'est pas autorisée sur cet endpoint."

        response.data = {
            "success": False,
            "error": {
                "code": error_code,
                "message": message,
                "details": details if isinstance(details, (dict, list)) else {"detail": str(details)},
            },
        }
        return response

    # 4. Uncaught Internal Server Errors (500)
    logger.exception(f"Unhandled server error occurred: {exc}", exc_info=True)
    return Response(
        {
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "Une erreur interne imprévue est survenue.",
                "details": {},
            },
        },
        status=500,
    )
