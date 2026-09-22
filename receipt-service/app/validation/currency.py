"""Currency symbol/code normalization. The LLM may echo a symbol, a code, or
both — this is the source of truth for which ISO 4217 code an expense
actually gets, never the LLM's own claim.

_KNOWN_CODES must stay in sync with lib/currency/constants.ts (CURRENCY_CODES)
in the Next.js app — that's the set of currencies the expense form accepts.
"""

_SYMBOL_TO_CODE = {
    "€": "EUR",
    "$": "USD",
    "£": "GBP",
    "¥": "JPY",
    "₪": "ILS",
}

_KNOWN_CODES = {
    "EUR",
    "USD",
    "GBP",
    "CHF",
    "ILS",
    "JPY",
    "AUD",
    "CAD",
    "SEK",
    "NOK",
    "DKK",
    "CZK",
    "PLN",
    "THB",
    "MXN",
}


def normalize_currency(raw: str | None) -> tuple[str | None, bool]:
    """Returns (iso_code_or_None, was_recognized)."""
    if not raw or not raw.strip():
        return None, False

    value = raw.strip()
    upper = value.upper()
    if upper in _KNOWN_CODES:
        return upper, True

    mapped = _SYMBOL_TO_CODE.get(value)
    if mapped:
        return mapped, True

    return None, False


# Symbols shared by several supported currencies: "$" is USD but also AUD,
# CAD and MXN; "¥" is JPY here but also CNY. The mapping above picks the most
# common reading, and the review screen asks the user to confirm it.
_AMBIGUOUS_SYMBOLS = {"$", "¥"}


def is_ambiguous_currency(raw: str | None) -> bool:
    return bool(raw) and raw.strip() in _AMBIGUOUS_SYMBOLS
