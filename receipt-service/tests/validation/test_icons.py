import pytest

from app.validation.icons import FALLBACK_ICON, sanitize_icon


@pytest.mark.parametrize("icon", ["☕", "🍕", "🚌", "🧾"])
def test_emoji_pass_through(icon):
    assert sanitize_icon(icon) == icon


def test_surrounding_whitespace_is_trimmed():
    assert sanitize_icon("  ☕  ") == "☕"


@pytest.mark.parametrize("raw", [None, "", "   "])
def test_missing_icon_falls_back(raw):
    assert sanitize_icon(raw) == FALLBACK_ICON


def test_a_word_instead_of_an_emoji_falls_back():
    """The model ignoring 'one emoji, no words' must not put text in the notes."""
    assert sanitize_icon("coffee") == FALLBACK_ICON


def test_markup_falls_back():
    assert sanitize_icon("<b>") == FALLBACK_ICON


def test_overlong_value_falls_back():
    assert sanitize_icon("☕" * 20) == FALLBACK_ICON


def test_emoji_with_ascii_alongside_falls_back():
    assert sanitize_icon("☕x") == FALLBACK_ICON
