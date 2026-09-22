"""Gate on the replay-mode receipt eval (see eval/harness.py).

Replay is deterministic, so these are exact floors: any drop means the
parsing/validation layer regressed on a labelled, realistic receipt.
"""

import pytest

from eval.harness import load_fixtures, run_fixture
from eval.report import build_report

LANGUAGES = {"en", "it", "de", "fr", "ar", "he"}


@pytest.fixture(scope="module")
def results():
    import asyncio

    return [asyncio.run(run_fixture(fixture)) for fixture in load_fixtures()]


def test_fixtures_cover_every_supported_language_and_hard_case():
    fixtures = load_fixtures()
    assert {f.language for f in fixtures} >= LANGUAGES
    tags = {tag for f in fixtures for tag in f.tags}
    assert tags >= {
        "decimal_comma",
        "discount",
        "multiple_vat",
        "blurry_ocr",
        "missing_subtotal",
        "named_month",
        "two_digit_year",
        "prompt_injection",
    }


def test_field_accuracy_floors(results):
    report = build_report(results)
    for field in ("merchant", "date", "currency", "tax"):
        assert report.field_accuracy[field] == 1.0, report.failures
    assert report.item_accuracy == 1.0, report.failures


def test_the_only_total_miss_is_the_injected_one_and_it_is_flagged(results):
    """The model was fooled into reporting 9999 — the eval must count that as
    wrong (it is), and validation must have raised it for the user's review."""
    report = build_report(results)
    total_misses = [m for m in report.failures if m.endswith(": total")]
    assert total_misses == ["en_prompt_injection: total"]
    assert report.warning_recall == 1.0, report.failures


def test_every_language_scores_perfectly_apart_from_the_injection_case(results):
    report = build_report([r for r in results if r.fixture.id != "en_prompt_injection"])
    assert set(report.by_language.values()) == {1.0}, report.failures
