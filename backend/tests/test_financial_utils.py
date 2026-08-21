from decimal import Decimal
from datetime import date, timedelta
from django.test import SimpleTestCase
from common.utils.financial import (
    quantize_amount,
    safe_decimal,
    calculate_remaining_balance,
    calculate_invoice_status,
)


class FinancialUtilsTestCase(SimpleTestCase):
    """
    Tests financial utility functions ensuring strict Decimal arithmetic (Rules 5, 21, 40).
    """

    def test_quantize_amount_formats_correctly(self):
        self.assertEqual(quantize_amount(250000), Decimal('250000.00'))
        self.assertEqual(quantize_amount("250000.5"), Decimal('250000.50'))
        self.assertEqual(quantize_amount(250000.555), Decimal('250000.56'))
        self.assertEqual(quantize_amount(None), Decimal('0.00'))

    def test_safe_decimal_handles_invalid_input(self):
        self.assertEqual(safe_decimal("invalid"), Decimal('0.00'))
        self.assertEqual(safe_decimal(None), Decimal('0.00'))
        self.assertEqual(safe_decimal(100), Decimal('100'))

    def test_calculate_remaining_balance(self):
        expected = Decimal('250000.00')
        paid = Decimal('100000.00')
        self.assertEqual(calculate_remaining_balance(expected, paid), Decimal('150000.00'))

        # Full payment
        self.assertEqual(calculate_remaining_balance(expected, expected), Decimal('0.00'))

        # Overpayment
        self.assertEqual(calculate_remaining_balance(expected, Decimal('300000.00')), Decimal('0.00'))

    def test_calculate_invoice_status_paid(self):
        status = calculate_invoice_status(
            expected_amount=Decimal('250000.00'),
            paid_amount=Decimal('250000.00'),
            due_date=date.today()
        )
        self.assertEqual(status, "PAID")

    def test_calculate_invoice_status_partial(self):
        status = calculate_invoice_status(
            expected_amount=Decimal('250000.00'),
            paid_amount=Decimal('100000.00'),
            due_date=date.today() + timedelta(days=5)
        )
        self.assertEqual(status, "PARTIAL")

    def test_calculate_invoice_status_overdue(self):
        status = calculate_invoice_status(
            expected_amount=Decimal('250000.00'),
            paid_amount=Decimal('0.00'),
            due_date=date.today() - timedelta(days=2),
            current_date=date.today()
        )
        self.assertEqual(status, "OVERDUE")

    def test_calculate_invoice_status_unpaid_before_due_date(self):
        status = calculate_invoice_status(
            expected_amount=Decimal('250000.00'),
            paid_amount=Decimal('0.00'),
            due_date=date.today() + timedelta(days=5),
            current_date=date.today()
        )
        self.assertEqual(status, "UNPAID")
