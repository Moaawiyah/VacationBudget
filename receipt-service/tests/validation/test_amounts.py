import pytest

from app.validation.amounts import parse_amount


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        (None, None),
        ("", None),
        ("abc", None),
        (12.5, 12.5),
        (12, 12.0),
        ("12.50", 12.5),
        ("12,50", 12.5),
        ("$12.50", 12.5),
        ("1.234,56", 1234.56),  # European: dot=thousands, comma=decimal
        ("1,234.56", 1234.56),  # US: comma=thousands, dot=decimal
        ("12,500", 12500.0),  # lone comma, not 2 trailing digits -> thousands
        ("€ 9.99", 9.99),
        ("-", None),
    ],
)
def test_parse_amount(raw, expected):
    assert parse_amount(raw) == expected
