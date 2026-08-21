from django.db import transaction
import logging

logger = logging.getLogger(__name__)


class BaseService:
    """
    Base service class for domain services.
    Encapsulates business operations and transaction boundaries.
    """

    @classmethod
    def atomic(cls):
        """Helper to run code in an atomic database transaction (Rule 6)."""
        return transaction.atomic()
