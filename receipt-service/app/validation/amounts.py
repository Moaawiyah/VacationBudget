"""Amount parsing: normalizes an LLM- or OCR-reported number that may use
either decimal-separator convention (1234.56 or 1.234,56) into a float, using
thousands-vs-decimal heuristics rather than trusting the LLM's own arithmetic.
"""

import re

_NUMERIC_RE = re.compile(r"[^0-9.,\-]")
_OCR_CONFUSION = re.compile(r"\d[.,\s]*[A-Za-z]+[.,\s]*\d")


def parse_amount(raw: float | int | str | None) -> float | None:
    if raw is None:
        return None
    if isinstance(raw, int | float):
        return round(float(raw), 2)

    if _OCR_CONFUSION.search(raw):
        # "4O.00", "1l.50": a letter *inside* a number is an OCR misread of a
        # digit. Stripping it would silently yield a wrong amount (4.00), so
        # report "unparseable" and let the user type the real one.
        return None
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
    else:
        separator = "," if has_comma else "." if has_dot else None
        if separator and (cleaned.count(separator) > 1 or _is_grouping(cleaned)):
            # "1,234,567" / "1.234.567", or a lone "1.234" / "12,500":
            # thousands grouping, not a decimal point.
            cleaned = cleaned.replace(separator, "")
        elif separator == ",":
            cleaned = cleaned.replace(",", ".")  # European decimal: "12,50"

    try:
        return round(float(cleaned), 2)
    except ValueError:
        return None


_GROUPED = re.compile(r"^-?[1-9]\d{0,2}[.,]\d{3}$")


def _is_grouping(cleaned: str) -> bool:
    """One separator, 1–3 leading digits (not a lone 0), exactly 3 after:
    that shape is a thousands group. "0.500" and "12.50" stay decimals."""
    return bool(_GROUPED.match(cleaned))


def is_ambiguous_amount(raw: float | int | str | None) -> bool:
    """True for strings like "1.234" or "1,234": read as 1234 by
    parse_amount, but a reader from the other convention might mean 1.234 —
    worth asking the user to double-check."""
    if not isinstance(raw, str):
        return False
    return _is_grouping(_NUMERIC_RE.sub("", raw).strip())
