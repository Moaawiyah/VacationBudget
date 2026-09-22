"""Groq chat-completions provider (OpenAI-compatible /chat/completions API).

Translates Groq's transport errors into the provider-agnostic hierarchy in
app.llm.errors; retries are applied outside, by app.llm.retrying.
"""

import httpx

from app.llm.errors import (
    LLMError,
    LLMRateLimited,
    LLMRejected,
    LLMTimeout,
    LLMUnavailable,
)
from app.llm.provider import LLMProvider

# Receipts are short; this caps what a runaway or injected response can cost
# (and bounds the JSON the extractor must parse).
_MAX_COMPLETION_TOKENS = 2048


class GroqProvider(LLMProvider):
    def __init__(self, api_key: str, model: str, base_url: str, timeout: float) -> None:
        if not api_key:
            raise LLMRejected("GROQ_API_KEY is not configured")
        self._api_key = api_key
        self._model = model
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout

    async def complete(self, system_prompt: str, user_prompt: str) -> str:
        payload = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.1,
            "max_completion_tokens": _MAX_COMPLETION_TOKENS,
            "response_format": {"type": "json_object"},
        }
        headers = {"Authorization": f"Bearer {self._api_key}"}

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            try:
                response = await client.post(
                    f"{self._base_url}/chat/completions", json=payload, headers=headers
                )
            except httpx.TimeoutException as exc:
                raise LLMTimeout(f"Groq timed out after {self._timeout}s") from exc
            except httpx.TransportError as exc:
                raise LLMUnavailable(f"Groq unreachable: {exc}") from exc

        if response.status_code >= 400:
            raise self._error_for(response)

        try:
            return response.json()["choices"][0]["message"]["content"]
        except (ValueError, KeyError, IndexError, TypeError) as exc:
            raise LLMUnavailable("Groq response missing completion content") from exc

    def _error_for(self, response: httpx.Response) -> LLMError:
        code, message = _error_summary(response)
        # Model id + Groq's own reason make a failure diagnosable from one log
        # line. The API key travels only in a request header, never echoed.
        detail = f"model={self._model}: {response.status_code} {code}: {message}"
        if response.status_code == 429:
            return LLMRateLimited(detail, _retry_after(response))
        # json_validate_failed is a 400, but it means this *generation* came
        # out malformed, not that the request was — a retry can succeed.
        if response.status_code >= 500 or code == "json_validate_failed":
            return LLMUnavailable(detail)
        return LLMRejected(detail)


def _error_summary(response: httpx.Response) -> tuple[str, str]:
    """Groq's error code and message — deliberately *not* the whole body: a
    json_validate_failed error includes `failed_generation`, the model's
    output, which is receipt content and must never reach the logs."""
    try:
        error = response.json().get("error") or {}
        code = str(error.get("code") or error.get("type") or "unknown")
        return code, str(error.get("message") or "")[:300]
    except (ValueError, AttributeError):
        return "non_json", ""


def _retry_after(response: httpx.Response) -> float | None:
    try:
        return max(0.0, float(response.headers["retry-after"]))
    except (KeyError, ValueError):
        return None
