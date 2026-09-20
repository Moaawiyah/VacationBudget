"""Category resolution: maps the LLM's category claim onto the caller's own list.

The model is told which categories exist, but it's never trusted to have
obeyed that — a name outside the list is dropped rather than passed along,
so the extraction can't introduce a category the user doesn't actually have.
"""


def resolve_category(
    raw_category: str | None, allowed: list[str]
) -> tuple[str | None, bool]:
    """Returns (canonical_name_or_None, was_hallucinated).

    Matching is case/whitespace-insensitive, but the *caller's* spelling is
    what comes back, so a near-miss can't invent a new spelling either.
    """
    if not raw_category or not raw_category.strip() or not allowed:
        return None, False

    needle = raw_category.strip().casefold()
    for name in allowed:
        if name.strip().casefold() == needle:
            return name, False
    return None, True
