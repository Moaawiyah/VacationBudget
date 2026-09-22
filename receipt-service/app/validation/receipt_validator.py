"""Turns the LLM's raw (untrusted) extraction into a validated ExtractedReceipt.

This module is the only authority on the final numbers/date/currency an
expense preview shows — the LLM's own arithmetic and formatting choices are
never trusted directly, only used as hints for what to try to parse.
Free text is card-number-redacted here, before it can reach notes or logs.
"""

from datetime import date

from app.llm.extraction import RawExtraction
from app.models.receipt import ExtractedReceipt, LineItem, Warning
from app.validation.amounts import is_ambiguous_amount, parse_amount
from app.validation.categories import resolve_category
from app.validation.currency import is_ambiguous_currency, normalize_currency
from app.validation.dates import is_ambiguous_date, parse_receipt_date
from app.validation.icons import sanitize_icon
from app.validation.reconciliation import reconcile_items, reconcile_totals, resolve_tax
from app.validation.redaction import redact_card_numbers, redact_optional
from app.validation.warnings import WARNING_CODES, warn

_MAX_LINE_ITEMS = 100  # a malformed/malicious response can't send an unbounded list
_SUSPICIOUS_TOTAL = 1_000_000
# Receipts in it/de/fr/ar/he are always day-first; English ones may be US
# (month-first) or not, and an unknown language could be either.
_MONTH_FIRST_POSSIBLE = {None, "en"}


def _total(raw: RawExtraction) -> tuple[float | None, list[Warning]]:
    total = parse_amount(raw.total)
    if total is None:
        unparseable = [warn("total_unparseable")] if raw.total is not None else []
        return None, [*unparseable, warn("total_missing")]
    if total <= 0:
        # An expense amount must be positive; a refund or all-discount receipt
        # is for the user to enter by hand, not to pre-fill as 0 or negative.
        return None, [warn("total_not_positive", detail=str(total))]
    warnings = [warn("amount_ambiguous")] if is_ambiguous_amount(raw.total) else []
    if total >= _SUSPICIOUS_TOTAL:
        warnings.append(warn("total_suspicious", detail=str(total)))
    return total, warnings


def _currency(raw: RawExtraction) -> tuple[str | None, list[Warning]]:
    currency, recognized = normalize_currency(raw.currency)
    if raw.currency and not recognized:
        return None, [warn("currency_unrecognized", detail=raw.currency)]
    if is_ambiguous_currency(raw.currency):
        return currency, [warn("currency_ambiguous", detail=raw.currency)]
    return currency, []


def _line_items(raw: RawExtraction) -> list[LineItem]:
    return [
        LineItem(
            description=redact_card_numbers(item.description.strip())[:200],
            quantity=parse_amount(item.quantity),
            unit_price=parse_amount(item.unit_price),
            total_price=parse_amount(item.total_price),
            icon=sanitize_icon(item.icon),
        )
        for item in raw.line_items[:_MAX_LINE_ITEMS]
        if item.description and item.description.strip()
    ]


def _confidence(warnings: list[Warning]) -> float:
    error_count = sum(1 for w in warnings if w.severity == "error")
    soft_count = len(warnings) - error_count
    return round(max(0.0, 1.0 - 0.2 * error_count - 0.05 * soft_count), 2)


def validate_extraction(
    raw: RawExtraction,
    raw_ocr_text: str,
    extraction_warnings: list[str],
    allowed_categories: list[str] | None = None,
    today: date | None = None,
) -> ExtractedReceipt:
    warnings = [warn(code) for code in extraction_warnings if code in WARNING_CODES]

    total, total_warnings = _total(raw)
    currency, currency_warnings = _currency(raw)
    subtotal = parse_amount(raw.subtotal)
    tax, tax_warnings = resolve_tax(parse_amount(raw.tax), raw.taxes)
    expense_date, date_ok = parse_receipt_date(raw.date, today)
    category, hallucinated = resolve_category(raw.category, allowed_categories or [])
    line_items = _line_items(raw)
    merchant = raw.merchant.strip()[:200] if raw.merchant and raw.merchant.strip() else None

    if merchant is None:
        warnings.append(warn("merchant_missing"))
    warnings += total_warnings + currency_warnings + tax_warnings
    if raw.date and not date_ok:
        warnings.append(warn("date_unparseable"))
    elif is_ambiguous_date(raw.date) and raw.detected_language in _MONTH_FIRST_POSSIBLE:
        warnings.append(warn("date_ambiguous", detail=raw.date))
    if hallucinated:
        warnings.append(warn("category_unrecognized", detail=raw.category))
    warnings += reconcile_totals(total, subtotal, tax)
    warnings += reconcile_items(line_items, total, subtotal, tax)
    warnings += [warn("low_confidence", field=f) for f in raw.uncertain_fields[:20]]

    return ExtractedReceipt(
        merchant=redact_optional(merchant),
        expense_date=expense_date,
        total=total,
        subtotal=subtotal,
        tax=tax,
        currency=currency,
        category=category,
        detected_language=raw.detected_language,
        translation=redact_optional(raw.translation),
        line_items=line_items,
        warnings=warnings,
        raw_ocr_text=redact_card_numbers(raw_ocr_text),
        confidence=_confidence(warnings),
    )
