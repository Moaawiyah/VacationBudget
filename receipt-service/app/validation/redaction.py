"""Masks payment-card numbers in receipt text before it leaves this service.

Receipts often print the card used — sometimes in full on older terminals.
Extracted text flows into expense notes and the browser, so any run of
13–19 digits (spaces or dashes allowed between them) keeps only its last four.
"""

import re

_CARD_NUMBER = re.compile(r"(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)")


def redact_card_numbers(text: str) -> str:
    def mask(match: re.Match[str]) -> str:
        digits = re.sub(r"\D", "", match.group())
        return f"•••• {digits[-4:]}"

    return _CARD_NUMBER.sub(mask, text)


def redact_optional(text: str | None) -> str | None:
    return None if text is None else redact_card_numbers(text)
