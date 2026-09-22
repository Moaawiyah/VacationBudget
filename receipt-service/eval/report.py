"""Aggregates FixtureResults into per-field accuracy, overall and per language."""

from collections import defaultdict
from dataclasses import dataclass

from eval.harness import SCALAR_FIELDS, FixtureResult


@dataclass
class Report:
    field_accuracy: dict[str, float]  # field -> share of labelled fixtures correct
    item_accuracy: float  # matched line items / expected line items
    warning_recall: float  # expected warnings actually raised
    by_language: dict[str, float]  # language -> share of scored fields correct
    failures: list[str]  # human-readable misses, for the CLI / assertion output


def _share(hits: int, total: int) -> float:
    return hits / total if total else 1.0


def build_report(results: list[FixtureResult]) -> Report:
    field_hits: dict[str, list[bool]] = defaultdict(list)
    language_hits: dict[str, list[bool]] = defaultdict(list)
    failures: list[str] = []
    for r in results:
        for field, ok in r.fields.items():
            field_hits[field].append(ok)
            language_hits[r.fixture.language].append(ok)
            if not ok:
                failures.append(f"{r.fixture.id}: {field}")
        if r.items_matched < r.items_expected:
            failures.append(f"{r.fixture.id}: items {r.items_matched}/{r.items_expected}")
        for code in sorted(r.missing_warnings):
            failures.append(f"{r.fixture.id}: missing warning {code}")

    expected_warnings = sum(len(r.fixture.expected.get("warnings", [])) for r in results)
    missing_warnings = sum(len(r.missing_warnings) for r in results)
    return Report(
        field_accuracy={
            f: _share(sum(field_hits[f]), len(field_hits[f])) for f in SCALAR_FIELDS
        },
        item_accuracy=_share(
            sum(r.items_matched for r in results), sum(r.items_expected for r in results)
        ),
        warning_recall=_share(expected_warnings - missing_warnings, expected_warnings),
        by_language={
            lang: _share(sum(hits), len(hits))
            for lang, hits in sorted(language_hits.items())
        },
        failures=failures,
    )


def format_report(report: Report) -> str:
    lines = ["Field accuracy:"]
    lines += [
        f"  {field:<9} {share:6.1%}" for field, share in report.field_accuracy.items()
    ]
    lines.append(f"  {'items':<9} {report.item_accuracy:6.1%}")
    lines.append(f"Warning recall: {report.warning_recall:.1%}")
    lines.append("By language:")
    lines += [f"  {lang:<3} {share:6.1%}" for lang, share in report.by_language.items()]
    if report.failures:
        lines.append("Misses:")
        lines += [f"  - {miss}" for miss in report.failures]
    return "\n".join(lines)
