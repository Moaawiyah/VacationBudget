"""Groq chat-completions provider (OpenAI-compatible /chat/completions API)."""

import httpx

from app.llm.provider import LLMProvider


class GroqError(RuntimeError):
    """Raised when Groq's API can't be reached or returns something unusable."""


class GroqProvider(LLMProvider):
    def __init__(self, api_key: str, model: str, base_url: str, timeout: float) -> None:
        if not api_key:
            raise GroqError("GROQ_API_KEY is not configured")
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
            "response_format": {"type": "json_object"},
        }
        headers = {"Authorization": f"Bearer {self._api_key}"}

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            try:
                response = await client.post(
                    f"{self._base_url}/chat/completions", json=payload, headers=headers
                )
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                # Groq explains *why* it rejected the call in the response body
                # (bad model id, revoked key, rate limit). Without it, a 404
                # is indistinguishable from a wrong URL — so surface it, capped
                # so a huge error page can't flood the logs. The API key is only
                # ever sent in a header, never echoed back here.
                detail = exc.response.text[:500]
                raise GroqError(
                    f"Groq rejected the request (model={self._model}): "
                    f"{exc.response.status_code} {detail}"
                ) from exc
            except httpx.HTTPError as exc:
                raise GroqError(f"Groq request failed: {exc}") from exc

        data = response.json()
        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise GroqError("Groq response missing completion content") from exc
