"""Coded review warnings.

Each warning carries a stable `code` the web app translates for the user;
`message` is English detail for developers and logs. Showing `message`
directly is how raw strings like "llm_unavailable" once reached users.
"""

from app.models.receipt import Warning

# code -> (field, severity, developer message)
_CATALOGUE: dict[str, tuple[str, str, str]] = {
    "merchant_missing": ("merchant", "warning", "Merchant not detected"),
    "total_missing": ("total", "error", "Total amount not detected"),
    "total_unparseable": ("total", "warning", "Could not parse the total amount"),
    "total_not_positive": ("total", "error", "Total is zero or negative"),
    "total_suspicious": ("total", "warning", "Total is unusually large"),
    "amount_ambiguous": ("total", "warning", "Thousands vs decimal separator unclear"),
    "currency_unrecognized": ("currency", "warning", "Unrecognized currency"),
    "currency_ambiguous": ("currency", "warning", "Currency symbol is ambiguous"),
    "date_unparseable": ("expense_date", "warning", "Could not parse the receipt date"),
    "date_ambiguous": ("expense_date", "warning", "Day and month could be swapped"),
    "totals_mismatch": ("total", "warning", "Subtotal and tax don't add up to the total"),
    "tax_mismatch": ("tax", "warning", "Tax lines don't add up to the stated tax"),
    "items_mismatch": ("line_items", "warning", "Line items don't add up to the total"),
    "category_unrecognized": ("category", "warning", "Suggested category not recognized"),
    "low_confidence": ("", "warning", "Model reported low confidence"),
    "llm_malformed_output": ("llm", "error", "Model returned unusable output"),
}

WARNING_CODES = frozenset(_CATALOGUE)


def warn(code: str, *, field: str | None = None, detail: str | None = None) -> Warning:
    """A warning for `code`. `field` overrides the default (low_confidence
    applies to whichever field the model named); `detail` extends the
    developer message without changing what the user sees."""
    default_field, severity, message = _CATALOGUE[code]
    return Warning(
        code=code,
        field=field or default_field,
        severity=severity,
        message=f"{message}: {detail}" if detail else message,
    )
