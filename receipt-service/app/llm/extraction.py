"""Calls the configured LLMProvider and parses its JSON response defensively.

The LLM is never authoritative (see app.validation) — this module's only job
is to get *some* structured JSON out of free-form model output, however
noisy or malformed, so validation always has a dict-shaped object to work
with instead of raw text.
"""

import json
import logging
import re

from pydantic import BaseModel, ValidationError

from app.llm.prompts import SYSTEM_PROMPT, build_user_prompt
from app.llm.provider import LLMProvider

logger = logging.getLogger(__name__)

_FENCE_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.MULTILINE)


class RawLineItem(BaseModel):
    """Extra keys the model invents are ignored by default (Pydantic v2) —
    this schema is also what stops a prompt-injected field from ever
    reaching the rest of the app as anything but inert data."""

    description: str = ""
    quantity: float | None = None
    unit_price: float | None = None
    total_price: float | None = None
    icon: str | None = None


class RawExtraction(BaseModel):
    """Whatever the LLM claims — every field optional, nothing trusted yet."""

    detected_language: str | None = None
    translation: str | None = None
    merchant: str | None = None
    date: str | None = None
    total: float | str | None = None
    subtotal: float | str | None = None
    tax: float | str | None = None
    currency: str | None = None
    category: str | None = None
    line_items: list[RawLineItem] = []
    uncertain_fields: list[str] = []


async def extract(
    provider: LLMProvider,
    ocr_text: str,
    language_hint: str | None = None,
    categories: list[str] | None = None,
) -> tuple[RawExtraction, list[str]]:
    """Returns the best-effort parsed extraction, plus extraction-stage warnings."""
    try:
        completion = await provider.complete(
            SYSTEM_PROMPT, build_user_prompt(ocr_text, language_hint, categories)
        )
    except Exception:
        logger.exception("LLM completion failed")
        return RawExtraction(), ["llm_unavailable"]

    cleaned = _FENCE_RE.sub("", completion).strip()
    try:
        payload = json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning("LLM returned non-JSON output")
        return RawExtraction(), ["llm_malformed_output"]

    if not isinstance(payload, dict):
        return RawExtraction(), ["llm_malformed_output"]

    try:
        return RawExtraction.model_validate(payload), []
    except ValidationError:
        logger.warning("LLM JSON did not match the expected schema")
        return RawExtraction(), ["llm_malformed_output"]
