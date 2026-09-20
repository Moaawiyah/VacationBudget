"""Sanitises the per-line-item emoji the LLM suggests.

These end up in the expense's notes text, so the model isn't trusted to have
returned an emoji at all: anything containing ASCII (a word like "coffee", or
markup) or anything suspiciously long is replaced with a neutral bullet.
"""

FALLBACK_ICON = "•"

# Room for an emoji plus modifiers/ZWJ joiners, but nowhere near enough for
# the model to smuggle a sentence into the notes.
_MAX_LENGTH = 8


def sanitize_icon(raw: str | None) -> str:
    if not raw:
        return FALLBACK_ICON

    candidate = raw.strip()
    if not candidate or len(candidate) > _MAX_LENGTH:
        return FALLBACK_ICON

    # Every pictograph is non-ASCII, so any ASCII character at all means the
    # model returned text (or markup) rather than an emoji.
    if any(char.isascii() for char in candidate):
        return FALLBACK_ICON

    return candidate
