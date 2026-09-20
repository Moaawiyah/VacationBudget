"""Turns the LLM's raw (untrusted) extraction into a validated ExtractedReceipt.

This module is the only authority on the final numbers/date/currency an
expense preview shows — the LLM's own arithmetic and formatting choices are
never trusted directly, only used as hints for what to try to parse.
"""

from app.llm.extraction import RawExtraction
from app.models.receipt import ExtractedReceipt, LineItem, Warning
from app.validation.amounts import parse_amount
from app.validation.categories import resolve_category
from app.validation.currency import normalize_currency
from app.validation.dates import parse_receipt_date

_RECONCILE_TOLERANCE = 0.02
_MAX_LINE_ITEMS = 100  # A malicious/malformed LLM response shouldn't be able
# to hand the client an unbounded list.


def _merchant_warnings(raw: RawExtraction) -> list[Warning]:
    if raw.merchant and raw.merchant.strip():
        return []
    return [Warning(field="merchant", message="Merchant not detected")]


def _amount_warnings(raw: RawExtraction, total: float | None) -> list[Warning]:
    warnings = []
    if raw.total is not None and total is None:
        warnings.append(Warning(field="total", message="Could not parse the total amount"))
    if total is None:
        warnings.append(
            Warning(field="total", message="Total amount not detected", severity="error")
        )
    return warnings


def _reconciliation_warning(
    total: float | None, subtotal: float | None, tax: float | None
) -> Warning | None:
    if total is None or subtotal is None or tax is None:
        return None
    if abs((subtotal + tax) - total) <= _RECONCILE_TOLERANCE:
        return None
    return Warning(
        field="total",
        message=f"Subtotal + tax ({subtotal + tax:.2f}) does not match total ({total:.2f})",
    )


def _normalized_line_items(raw: RawExtraction) -> list[LineItem]:
    items = [
        LineItem(
            description=item.description.strip()[:200],
            quantity=item.quantity,
            unit_price=parse_amount(item.unit_price),
            total_price=parse_amount(item.total_price),
        )
        for item in raw.line_items[:_MAX_LINE_ITEMS]
        if item.description and item.description.strip()
    ]
    return items


def _confidence(warnings: list[Warning]) -> float:
    error_count = sum(1 for w in warnings if w.severity == "error")
    soft_count = len(warnings) - error_count
    return round(max(0.0, 1.0 - 0.2 * error_count - 0.05 * soft_count), 2)


def validate_extraction(
    raw: RawExtraction,
    raw_ocr_text: str,
    extraction_warnings: list[str],
    allowed_categories: list[str] | None = None,
) -> ExtractedReceipt:
    warnings = [
        Warning(field="llm", message=w, severity="error") for w in extraction_warnings
    ]

    total = parse_amount(raw.total)
    subtotal = parse_amount(raw.subtotal)
    tax = parse_amount(raw.tax)
    currency, currency_ok = normalize_currency(raw.currency)
    expense_date, date_ok = parse_receipt_date(raw.date)

    warnings += _merchant_warnings(raw)
    warnings += _amount_warnings(raw, total)
    if raw.currency and not currency_ok:
        warnings.append(
            Warning(field="currency", message=f"Unrecognized currency: {raw.currency}")
        )
    if raw.date and not date_ok:
        warnings.append(
            Warning(field="expense_date", message="Could not parse the receipt date")
        )

    category, category_hallucinated = resolve_category(
        raw.category, allowed_categories or []
    )
    if category_hallucinated:
        warnings.append(
            Warning(field="category", message="Suggested category was not recognized")
        )

    reconciliation = _reconciliation_warning(total, subtotal, tax)
    if reconciliation:
        warnings.append(reconciliation)

    warnings += [
        Warning(field=field_name, message="Model reported low confidence")
        for field_name in raw.uncertain_fields
    ]

    merchant = raw.merchant.strip()[:200] if raw.merchant and raw.merchant.strip() else None

    return ExtractedReceipt(
        merchant=merchant,
        expense_date=expense_date,
        total=total,
        subtotal=subtotal,
        tax=tax,
        currency=currency,
        category=category,
        detected_language=raw.detected_language,
        translation=raw.translation,
        line_items=_normalized_line_items(raw),
        warnings=warnings,
        raw_ocr_text=raw_ocr_text,
        confidence=_confidence(warnings),
    )
