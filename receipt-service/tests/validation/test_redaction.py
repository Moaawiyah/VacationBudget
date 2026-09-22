import pytest

from app.llm.extraction import RawExtraction, RawLineItem
from app.validation.receipt_validator import validate_extraction
from app.validation.redaction import redact_card_numbers


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("VISA 4111111111111111", "VISA •••• 1111"),
        ("Card 4111 1111 1111 1111 ok", "Card •••• 1111 ok"),
        ("MC 5500-0000-0000-0004", "MC •••• 0004"),
        ("Amex 3782 822463 10005", "Amex •••• 0005"),
    ],
)
def test_card_numbers_keep_only_their_last_four(text, expected):
    assert redact_card_numbers(text) == expected


@pytest.mark.parametrize(
    "text",
    [
        "TOTAL 1234.56",
        "Tel 02 1234 5678",  # 10 digits: a phone number, not a card
        "Invoice 2026-09-21",
        "Already masked **** 1111",
    ],
)
def test_ordinary_numbers_are_left_alone(text):
    assert redact_card_numbers(text) == text


def test_card_numbers_are_redacted_from_everything_that_leaves_the_service():
    raw = RawExtraction(
        merchant="Shop 4111111111111111",
        total=10.0,
        translation="Paid with 4111 1111 1111 1111",
        line_items=[RawLineItem(description="Gift card 5500000000000004")],
    )
    receipt = validate_extraction(raw, "VISA 4111111111111111\nTOTAL 10.00", [])
    everything = receipt.model_dump_json()
    assert "4111111111111111" not in everything
    assert "4111 1111 1111 1111" not in everything
    assert "5500000000000004" not in everything
    assert "•••• 1111" in receipt.raw_ocr_text
