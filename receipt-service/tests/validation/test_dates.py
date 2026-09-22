from datetime import date

from app.validation.dates import parse_receipt_date

TODAY = date(2026, 9, 20)


def test_none_or_blank_is_unconfident():
    assert parse_receipt_date(None, TODAY) == (None, False)
    assert parse_receipt_date("   ", TODAY) == (None, False)


def test_iso_date_passes_through():
    assert parse_receipt_date("2026-01-12", TODAY) == ("2026-01-12", True)


def test_ambiguous_numeric_date_reads_day_first():
    # 03/04/2026 is ambiguous; dayfirst=True reads it as 3 April, not March 4.
    assert parse_receipt_date("03/04/2026", TODAY) == ("2026-04-03", True)


def test_named_month_date():
    assert parse_receipt_date("12 Jan 2026", TODAY) == ("2026-01-12", True)


def test_future_date_is_rejected():
    assert parse_receipt_date("2027-01-01", TODAY) == (None, False)


def test_implausibly_old_date_is_rejected():
    assert parse_receipt_date("2010-01-01", TODAY) == (None, False)


def test_garbage_is_rejected():
    assert parse_receipt_date("not a date at all !!", TODAY) == (None, False)


def test_ambiguous_numeric_dates_are_flagged_only_where_month_first_is_possible():
    from app.llm.extraction import RawExtraction
    from app.validation.receipt_validator import validate_extraction

    def codes(language, raw_date):
        raw = RawExtraction(
            merchant="M", total=1.0, date=raw_date, detected_language=language
        )
        return {w.code for w in validate_extraction(raw, "", [], today=TODAY).warnings}

    assert "date_ambiguous" in codes("en", "03/04/2026")  # US reading = 4 March
    assert "date_ambiguous" not in codes("it", "03/04/2026")  # Italian: day-first
    assert "date_ambiguous" not in codes("en", "21/04/2026")  # 21 can't be a month
    assert "date_ambiguous" not in codes("en", "04/04/2026")  # same either way
