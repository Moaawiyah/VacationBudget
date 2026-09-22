"""Date parsing/normalization to ISO 8601 (YYYY-MM-DD).

Receipts use every date convention there is (DD/MM/YYYY, MM/DD/YYYY, dotted,
named months, various locales) — dateutil handles the formats; this module
only adds the sanity checks dateutil can't do on its own.
"""

import re
from datetime import date, datetime, time

from dateutil import parser as dateutil_parser
from dateutil.parser import isoparse


def parse_receipt_date(
    raw: str | None, today: date | None = None
) -> tuple[str | None, bool]:
    """Returns (iso_date_or_None, was_confident).

    Rejects dates in the future or implausibly old, since a receipt should
    never be dated after today, and those cases are almost always a parse
    ambiguity (e.g. a two-digit year, or day/month swapped) rather than a
    real date.
    """
    if not raw or not raw.strip():
        return None, False

    reference = today or date.today()
    try:
        # Try strict ISO 8601 first: dateutil's generic parse() applies
        # dayfirst even to unambiguous "YYYY-MM-DD" input (misreading it as
        # year-day-month), so an already-unambiguous date must bypass it.
        parsed = isoparse(raw)
    except ValueError:
        try:
            # dayfirst=True: most non-US receipts (and every UI locale this
            # app ships) write DD/MM — ambiguous numeric dates default that
            # way rather than the US MM/DD convention. default must be a
            # datetime (not a date) — dateutil copies its time fields onto
            # the result.
            parsed = dateutil_parser.parse(
                raw,
                dayfirst=True,
                fuzzy=True,
                default=datetime.combine(reference, time.min),
            )
        except (ValueError, OverflowError, TypeError):
            return None, False

    parsed_date = parsed.date()
    if parsed_date > reference or parsed_date.year < reference.year - 5:
        return None, False
    return parsed_date.isoformat(), True


_NUMERIC_DATE = re.compile(r"^\s*(\d{1,2})[/.\-](\d{1,2})[/.\-]\d{2,4}")


def is_ambiguous_date(raw: str | None) -> bool:
    """True for dates like 03/04/2026, where both leading parts could be the
    month: read day-first (3 April) here, but 4 March on a US receipt."""
    match = _NUMERIC_DATE.match(raw or "")
    if not match:
        return False
    first, second = int(match.group(1)), int(match.group(2))
    return first != second and first <= 12 and second <= 12
