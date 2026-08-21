from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from datetime import date
from typing import Union


DECIMAL_ZERO = Decimal('0.00')
CENT_PRECISION = Decimal('0.01')


def safe_decimal(value: Union[int, float, str, Decimal, None], default: Decimal = DECIMAL_ZERO) -> Decimal:
    """
    Safely converts an arbitrary input to a Decimal, avoiding float precision drift.
    """
    if value is None:
        return default
    if isinstance(value, Decimal):
        return value
    try:
        if isinstance(value, float):
            return Decimal(str(value)).quantize(CENT_PRECISION, rounding=ROUND_HALF_UP)
        return Decimal(str(value).strip().replace(' ', ''))
    except (InvalidOperation, ValueError, TypeError):
        return default


def quantize_amount(amount: Union[int, float, str, Decimal, None]) -> Decimal:
    """
    Quantizes an amount to 2 decimal places using ROUND_HALF_UP (Rule 5).
    Example: Decimal('250000') -> Decimal('250000.00')
    """
    dec_val = safe_decimal(amount)
    return dec_val.quantize(CENT_PRECISION, rounding=ROUND_HALF_UP)


def calculate_remaining_balance(expected_amount: Decimal, paid_amount: Decimal) -> Decimal:
    """
    Calculates remaining balance: expected - paid.
    Returns Decimal('0.00') if paid >= expected.
    """
    expected = quantize_amount(expected_amount)
    paid = quantize_amount(paid_amount)
    balance = expected - paid
    return balance if balance > DECIMAL_ZERO else DECIMAL_ZERO


def calculate_invoice_status(
    expected_amount: Decimal,
    paid_amount: Decimal,
    due_date: date,
    current_date: date = None,
) -> str:
    """
    Computes strict invoice financial status (Rule 21):
    - PAID: paid_amount >= expected_amount
    - PARTIAL: 0 < paid_amount < expected_amount
    - OVERDUE: paid_amount < expected_amount and current_date > due_date
    - UNPAID: paid_amount == 0 and current_date <= due_date
    """
    if current_date is None:
        current_date = date.today()

    expected = quantize_amount(expected_amount)
    paid = quantize_amount(paid_amount)

    if paid >= expected and expected > DECIMAL_ZERO:
        return "PAID"
    elif paid > DECIMAL_ZERO and paid < expected:
        return "PARTIAL"
    elif current_date > due_date:
        return "OVERDUE"
    else:
        return "UNPAID"
