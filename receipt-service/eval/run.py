"""CLI: `uv run python -m eval.run` (replay) or `... --live` (real LLM).

Live mode sends each fixture's OCR text to the configured provider — the same
GroqProvider + retries the service uses — so it costs API calls and needs
GROQ_API_KEY. Replay mode is free and deterministic.
"""

import argparse
import asyncio
import sys

from app.config import get_settings
from app.llm.groq_provider import GroqProvider
from app.llm.provider import LLMProvider
from app.llm.retrying import RetryingProvider
from eval.harness import load_fixtures, run_fixture
from eval.report import build_report, format_report


def _live_provider() -> LLMProvider:
    settings = get_settings()
    return RetryingProvider(
        GroqProvider(
            api_key=settings.groq_api_key,
            model=settings.groq_model,
            base_url=settings.groq_base_url,
            timeout=settings.groq_timeout_seconds,
        ),
        max_attempts=settings.llm_max_attempts,
        deadline=settings.llm_deadline_seconds,
    )


async def main(live: bool) -> int:
    provider = _live_provider() if live else None
    results = [await run_fixture(f, provider) for f in load_fixtures()]
    print(f"{'LIVE' if live else 'REPLAY'} — {len(results)} fixtures")
    print(format_report(build_report(results)))
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--live", action="store_true", help="call the real LLM")
    sys.exit(asyncio.run(main(parser.parse_args().live)))
