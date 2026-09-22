"""Cross-checks between a receipt's numbers, computed here — never taken from
the model. Mismatches become warnings for the user to review; nothing is
silently "corrected", because which number is wrong is the user's call.
"""

from app.llm.extraction import RawTax
from app.models.receipt import LineItem, Warning
from app.validation.amounts import parse_amount
from app.validation.warnings import warn

_TOLERANCE = 0.02


def _close(a: float, b: float, tolerance: float = _TOLERANCE) -> bool:
    return abs(a - b) <= tolerance


def resolve_tax(
    stated: float | None, taxes: list[RawTax]
) -> tuple[float | None, list[Warning]]:
    """The tax amount to use. With several VAT rates the per-rate lines are
    summed here, and a stated total tax that disagrees is flagged."""
    amounts = [a for a in (parse_amount(t.amount) for t in taxes) if a is not None]
    if not amounts:
        return stated, []
    summed = round(sum(amounts), 2)
    if stated is not None and not _close(stated, summed):
        return summed, [warn("tax_mismatch", detail=f"lines {summed} vs stated {stated}")]
    return summed, []


def reconcile_totals(
    total: float | None, subtotal: float | None, tax: float | None
) -> list[Warning]:
    """Receipts are either tax-exclusive (subtotal + tax = total) or, common
    for VAT, tax-inclusive (subtotal already includes the tax, so it equals
    the total). Either shape is consistent; only neither is a mismatch."""
    if total is None or subtotal is None or tax is None:
        return []
    if _close(subtotal + tax, total) or _close(subtotal, total):
        return []
    return [warn("totals_mismatch", detail=f"{subtotal} + {tax} vs {total}")]


def reconcile_items(
    items: list[LineItem], total: float | None, subtotal: float | None, tax: float | None
) -> list[Warning]:
    """Sum of line totals (discount lines are negative) against the receipt's
    own figures. Skipped unless every item is priced — a partial sum proves
    nothing."""
    if total is None or len(items) < 2 or any(i.total_price is None for i in items):
        return []
    summed = sum(i.total_price for i in items if i.total_price is not None)
    # Each printed line total is rounded, so allow a cent of drift per line.
    tolerance = max(_TOLERANCE, 0.01 * len(items))
    targets = [total]
    if subtotal is not None:
        targets.append(subtotal)
        if tax is not None:
            targets.append(subtotal + tax)
    if any(_close(summed, target, tolerance) for target in targets):
        return []
    return [warn("items_mismatch", detail=f"items {round(summed, 2)} vs total {total}")]
