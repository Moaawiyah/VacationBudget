from app.llm.extraction import RawExtraction, RawLineItem
from app.validation.receipt_validator import validate_extraction


def test_clean_extraction_has_no_warnings_and_full_confidence():
    raw = RawExtraction(
        detected_language="en",
        merchant="Cafe Roma",
        date="2026-01-10",
        total=11.0,
        subtotal=10.0,
        tax=1.0,
        currency="EUR",
        line_items=[RawLineItem(description="Coffee", total_price=3.0)],
    )
    receipt = validate_extraction(raw, "raw ocr text", [])

    assert receipt.merchant == "Cafe Roma"
    assert receipt.expense_date == "2026-01-10"
    assert receipt.total == 11.0
    assert receipt.currency == "EUR"
    assert receipt.warnings == []
    assert receipt.confidence == 1.0
    assert receipt.raw_ocr_text == "raw ocr text"


def test_missing_total_is_an_error_warning_and_lowers_confidence():
    receipt = validate_extraction(RawExtraction(), "", [])
    assert any(w.field == "total" and w.severity == "error" for w in receipt.warnings)
    assert receipt.confidence < 1.0


def test_subtotal_plus_tax_mismatch_is_flagged():
    raw = RawExtraction(total=100.0, subtotal=50.0, tax=10.0)
    receipt = validate_extraction(raw, "", [])
    assert any("does not match total" in w.message for w in receipt.warnings)


def test_subtotal_plus_tax_within_tolerance_is_not_flagged():
    raw = RawExtraction(total=11.0, subtotal=10.0, tax=1.005)
    receipt = validate_extraction(raw, "", [])
    assert not any("does not match total" in w.message for w in receipt.warnings)


def test_unrecognized_currency_is_flagged_and_dropped():
    raw = RawExtraction(total=10.0, currency="ZZZ")
    receipt = validate_extraction(raw, "", [])
    assert receipt.currency is None
    assert any(w.field == "currency" for w in receipt.warnings)


def test_llm_stage_warnings_are_carried_through_as_errors():
    receipt = validate_extraction(RawExtraction(), "", ["llm_malformed_output"])
    assert any(
        w.field == "llm" and w.severity == "error" and w.message == "llm_malformed_output"
        for w in receipt.warnings
    )


def test_uncertain_fields_become_soft_warnings():
    raw = RawExtraction(total=10.0, uncertain_fields=["merchant"])
    receipt = validate_extraction(raw, "", [])
    assert any(w.field == "merchant" and w.severity == "warning" for w in receipt.warnings)


def test_blank_line_items_are_dropped():
    raw = RawExtraction(
        total=10.0,
        line_items=[RawLineItem(description="   "), RawLineItem(description="Water")],
    )
    receipt = validate_extraction(raw, "", [])
    assert [item.description for item in receipt.line_items] == ["Water"]


def test_line_items_are_capped_at_100():
    raw = RawExtraction(
        total=10.0, line_items=[RawLineItem(description=f"item {i}") for i in range(150)]
    )
    receipt = validate_extraction(raw, "", [])
    assert len(receipt.line_items) == 100


def test_category_is_accepted_when_it_matches_the_allowed_list():
    raw = RawExtraction(total=10.0, category="Food")
    receipt = validate_extraction(raw, "", [], ["Food", "Transport"])
    assert receipt.category == "Food"
    assert not any(w.field == "category" for w in receipt.warnings)


def test_category_match_ignores_case_but_returns_the_callers_spelling():
    raw = RawExtraction(total=10.0, category="  fOOd  ")
    receipt = validate_extraction(raw, "", [], ["Food"])
    assert receipt.category == "Food"


def test_hallucinated_category_is_dropped_and_flagged():
    """The model must not be able to introduce a category the user doesn't have."""
    raw = RawExtraction(total=10.0, category="Cryptocurrency")
    receipt = validate_extraction(raw, "", [], ["Food", "Transport"])
    assert receipt.category is None
    assert any(w.field == "category" for w in receipt.warnings)


def test_category_is_none_when_no_list_was_supplied():
    raw = RawExtraction(total=10.0, category="Food")
    receipt = validate_extraction(raw, "", [], [])
    assert receipt.category is None


def test_no_category_claim_is_not_flagged():
    receipt = validate_extraction(RawExtraction(total=10.0), "", [], ["Food"])
    assert receipt.category is None
    assert not any(w.field == "category" for w in receipt.warnings)


def test_confidence_never_goes_below_zero():
    raw = RawExtraction(uncertain_fields=[f"field{i}" for i in range(50)])
    receipt = validate_extraction(raw, "", ["llm_unavailable"])
    assert receipt.confidence == 0.0
