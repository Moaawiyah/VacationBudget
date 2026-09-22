from app.llm.extraction import RawExtraction, RawLineItem, RawTax
from app.validation.receipt_validator import validate_extraction


def codes(raw: RawExtraction) -> set[str]:
    return {w.code for w in validate_extraction(raw, "", []).warnings}


def test_tax_exclusive_totals_reconcile():
    raw = RawExtraction(merchant="M", total=12.2, subtotal=10.0, tax=2.2)
    assert "totals_mismatch" not in codes(raw)


def test_tax_inclusive_vat_totals_reconcile():
    """EU receipts print VAT already included: subtotal == total."""
    raw = RawExtraction(merchant="M", total=12.2, subtotal=12.2, tax=2.2)
    assert "totals_mismatch" not in codes(raw)


def test_multiple_vat_rates_are_summed_deterministically():
    raw = RawExtraction(
        merchant="M",
        total=31.0,
        subtotal=28.0,
        taxes=[RawTax(rate=10, amount="1,00"), RawTax(rate=22, amount=2.0)],
    )
    receipt = validate_extraction(raw, "", [])
    assert receipt.tax == 3.0
    assert "totals_mismatch" not in {w.code for w in receipt.warnings}


def test_stated_tax_disagreeing_with_tax_lines_is_flagged():
    raw = RawExtraction(merchant="M", total=31.0, tax=5.0, taxes=[RawTax(amount=3.0)])
    receipt = validate_extraction(raw, "", [])
    assert receipt.tax == 3.0  # computed from the lines, not the model's sum
    assert "tax_mismatch" in {w.code for w in receipt.warnings}


def test_discount_lines_count_toward_the_item_sum():
    raw = RawExtraction(
        merchant="M",
        total=8.0,
        line_items=[
            RawLineItem(description="Pizza", total_price=10.0),
            RawLineItem(description="Sconto", total_price="-2,00"),
        ],
    )
    assert "items_mismatch" not in codes(raw)


def test_items_that_dont_add_up_are_flagged():
    raw = RawExtraction(
        merchant="M",
        total=50.0,
        line_items=[
            RawLineItem(description="A", total_price=10.0),
            RawLineItem(description="B", total_price=10.0),
        ],
    )
    assert "items_mismatch" in codes(raw)


def test_item_check_is_skipped_when_any_item_is_unpriced():
    raw = RawExtraction(
        merchant="M",
        total=50.0,
        line_items=[
            RawLineItem(description="A", total_price=10.0),
            RawLineItem(description="B"),
        ],
    )
    assert "items_mismatch" not in codes(raw)


def test_non_positive_total_is_not_prefilled():
    receipt = validate_extraction(RawExtraction(merchant="M", total=-4.0), "", [])
    assert receipt.total is None
    assert "total_not_positive" in {w.code for w in receipt.warnings}


def test_ambiguous_separator_and_currency_ask_for_a_double_check():
    raw = RawExtraction(merchant="M", total="1.234", currency="$")
    receipt = validate_extraction(raw, "", [])
    found = {w.code for w in receipt.warnings}
    assert receipt.total == 1234.0
    assert receipt.currency == "USD"
    assert {"amount_ambiguous", "currency_ambiguous"} <= found


def test_implausibly_large_total_is_flagged():
    assert "total_suspicious" in codes(RawExtraction(merchant="M", total=2_500_000))


def test_every_warning_has_a_code():
    receipt = validate_extraction(
        RawExtraction(total="abc", currency="ZZZ", date="nope", uncertain_fields=["x"]),
        "",
        ["llm_malformed_output"],
    )
    assert receipt.warnings
    assert all(w.code for w in receipt.warnings)
