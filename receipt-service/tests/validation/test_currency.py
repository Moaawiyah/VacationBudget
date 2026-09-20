import pytest

from app.validation.currency import normalize_currency


@pytest.mark.parametrize(
    ("raw", "expected_code", "expected_ok"),
    [
        (None, None, False),
        ("", None, False),
        ("eur", "EUR", True),
        ("EUR", "EUR", True),
        ("€", "EUR", True),
        ("$", "USD", True),
        ("£", "GBP", True),
        ("₪", "ILS", True),
        ("CHF", "CHF", True),
        ("XYZ", None, False),
        ("¤", None, False),
    ],
)
def test_normalize_currency(raw, expected_code, expected_ok):
    assert normalize_currency(raw) == (expected_code, expected_ok)
