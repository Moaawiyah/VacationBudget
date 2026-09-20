"""Amount parsing: normalizes an LLM- or OCR-reported number that may use
either decimal-separator convention (1234.56 or 1.234,56) into a float, using
thousands-vs-decimal heuristics rather than trusting the LLM's own arithmetic.
"""

import re

_NUMERIC_RE = re.compile(r"[^0-9.,\-]")


def parse_amount(raw: float | int | str | None) -> float | None:
    if raw is None:
        return None
    if isinstance(raw, int | float):
        return round(float(raw), 2)

    cleaned = _NUMERIC_RE.sub("", raw).strip()
    if not cleaned or cleaned == "-":
        return None

    has_comma, has_dot = "," in cleaned, "." in cleaned
    if has_comma and has_dot:
        # Whichever separator appears last is the decimal point; the other
        # one is a thousands separator and gets dropped.
        decimal_sep = "," if cleaned.rfind(",") > cleaned.rfind(".") else "."
        thousands_sep = "." if decimal_sep == "," else ","
        cleaned = cleaned.replace(thousands_sep, "").replace(decimal_sep, ".")
    elif has_comma:
        # A lone comma with exactly two trailing digits reads as a decimal
        # point (European style, "12,50"); anything else is a thousands
        # separator ("12,500" -> 12500).
        tail = cleaned.split(",")[-1]
        cleaned = cleaned.replace(",", "." if len(tail) == 2 else "")

    try:
        return round(float(cleaned), 2)
    except ValueError:
        return None
