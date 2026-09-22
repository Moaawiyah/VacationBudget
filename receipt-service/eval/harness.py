"""Receipt extraction evaluation over labelled fixtures (eval/fixtures/*.json).

Two modes, same fixtures and scoring:
- replay (default; what pytest runs): each fixture's recorded model response
  goes through the real extract() + validate_extraction(). Deterministic, no
  network — it measures the parsing/validation layer on realistic, messy model
  output (decimal commas, symbols, dates as printed, injected fields).
- live (`python -m eval.run --live`): the fixture's OCR text is sent to the
  configured LLM, so the score measures the model too. Needs GROQ_API_KEY and
  is never part of the normal test run.
"""

import json
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

from app.llm.extraction import extract
from app.llm.provider import LLMProvider
from app.models.receipt import ExtractedReceipt
from app.validation.receipt_validator import validate_extraction

FIXTURES_DIR = Path(__file__).parent / "fixtures"
# Fixture dates are judged against this day, not the real one — otherwise the
# "not older than 5 years" rule would start failing fixtures as time passes.
AS_OF = date(2026, 9, 22)
CATEGORIES = ["Food", "Coffee", "Activities", "Public Transport", "Shopping", "Other"]
SCALAR_FIELDS = ("merchant", "date", "total", "currency", "tax")


@dataclass(frozen=True)
class Fixture:
    id: str
    language: str
    tags: list[str]
    ocr_text: str
    llm_response: dict[str, Any]
    expected: dict[str, Any]


@dataclass
class FixtureResult:
    fixture: Fixture
    fields: dict[str, bool]  # scalar field -> correct? (only fields the fixture labels)
    items_matched: int
    items_expected: int
    missing_warnings: set[str]


class ReplayProvider(LLMProvider):
    """Answers with a fixture's recorded model response."""

    def __init__(self, response: dict[str, Any]) -> None:
        self._response = json.dumps(response, ensure_ascii=False)

    async def complete(self, system_prompt: str, user_prompt: str) -> str:
        return self._response


def load_fixtures(directory: Path = FIXTURES_DIR) -> list[Fixture]:
    return [
        Fixture(**json.loads(path.read_text(encoding="utf-8")))
        for path in sorted(directory.glob("*.json"))
    ]


async def run_fixture(
    fixture: Fixture, provider: LLMProvider | None = None
) -> FixtureResult:
    provider = provider or ReplayProvider(fixture.llm_response)
    raw, warnings = await extract(provider, fixture.ocr_text, fixture.language, CATEGORIES)
    receipt = validate_extraction(raw, fixture.ocr_text, warnings, CATEGORIES, AS_OF)
    return score_fixture(fixture, receipt)


def _norm(text: str | None) -> str | None:
    return " ".join(text.casefold().split()) if text else None


def _same(field: str, expected: Any, actual: Any) -> bool:
    if expected is None or actual is None:
        return expected is None and actual is None
    if field in ("total", "tax"):
        return abs(float(expected) - float(actual)) < 0.005
    if field == "merchant":
        return _norm(expected) == _norm(actual)
    return expected == actual


def score_fixture(fixture: Fixture, receipt: ExtractedReceipt) -> FixtureResult:
    actual = {
        "merchant": receipt.merchant,
        "date": receipt.expense_date,
        "total": receipt.total,
        "currency": receipt.currency,
        "tax": receipt.tax,
    }
    exp = fixture.expected
    fields = {f: _same(f, exp[f], actual[f]) for f in SCALAR_FIELDS if f in exp}

    remaining = [(_norm(i.description), i.total_price) for i in receipt.line_items]
    matched = 0
    for item in exp.get("line_items", []):
        for candidate in remaining:
            desc, price = candidate
            if desc == _norm(item["description"]) and _same(
                "total", item["total_price"], price
            ):
                remaining.remove(candidate)
                matched += 1
                break

    found = {w.code for w in receipt.warnings}
    return FixtureResult(
        fixture=fixture,
        fields=fields,
        items_matched=matched,
        items_expected=len(exp.get("line_items", [])),
        missing_warnings=set(exp.get("warnings", [])) - found,
    )
