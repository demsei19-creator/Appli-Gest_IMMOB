class BaseAppException(Exception):
    """Base exception for all domain business errors."""
    code = "APPLICATION_ERROR"
    default_message = "Une erreur applicative est survenue."
    status_code = 400

    def __init__(self, message=None, code=None, details=None, status_code=None):
        self.message = message or self.default_message
        self.code = code or self.code
        self.details = details or {}
        if status_code is not None:
            self.status_code = status_code
        super().__init__(self.message)


class BusinessException(BaseAppException):
    """Raised when a business rule constraint is violated."""
    code = "BUSINESS_RULE_VIOLATION"
    default_message = "L'opération viole une règle métier."
    status_code = 400


class ResourceNotFoundException(BaseAppException):
    """Raised when a requested resource does not exist or is inactive."""
    code = "RESOURCE_NOT_FOUND"
    default_message = "La ressource demandée est introuvable."
    status_code = 404


class ValidationException(BaseAppException):
    """Raised when data input fails domain validation."""
    code = "VALIDATION_ERROR"
    default_message = "Les données fournies sont invalides."
    status_code = 422


class PermissionDeniedException(BaseAppException):
    """Raised when a user lacks privileges for a specific operation or tenant."""
    code = "PERMISSION_DENIED"
    default_message = "Vous n'avez pas l'autorisation d'accéder à cette ressource."
    status_code = 403


class FinancialException(BusinessException):
    """Raised for balance inconsistencies, over-allocations, or financial errors."""
    code = "FINANCIAL_INTEGRITY_ERROR"
    default_message = "Une anomalie financière a interrompu l'opération."
    status_code = 400
