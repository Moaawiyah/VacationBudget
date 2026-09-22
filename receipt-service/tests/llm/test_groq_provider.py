import httpx
import pytest

from app.llm.errors import LLMRateLimited, LLMRejected, LLMTimeout, LLMUnavailable
from app.llm.groq_provider import GroqProvider

BASE = "https://api.groq.com/openai/v1"


def _provider(model: str = "m") -> GroqProvider:
    return GroqProvider(api_key="secret", model=model, base_url=BASE, timeout=5)


def _respond(monkeypatch, status=200, json=None, headers=None, raises=None):
    async def fake_post(self, url, json_body=None, headers_=None, **kwargs):
        if raises:
            raise raises
        return httpx.Response(
            status, json=json, headers=headers, request=httpx.Request("POST", url)
        )

    async def post(self, url, json=None, headers=None):
        return await fake_post(self, url)

    monkeypatch.setattr(httpx.AsyncClient, "post", post)


def test_requires_api_key():
    with pytest.raises(LLMRejected):
        GroqProvider(api_key="", model="m", base_url=BASE, timeout=5)


async def test_returns_message_content_and_caps_tokens(monkeypatch):
    sent = {}

    async def post(self, url, json=None, headers=None):
        sent.update(url=url, json=json, headers=headers)
        body = {"choices": [{"message": {"content": '{"merchant": "Cafe"}'}}]}
        return httpx.Response(200, json=body, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.AsyncClient, "post", post)
    assert await _provider().complete("system", "user") == '{"merchant": "Cafe"}'
    assert sent["url"].endswith("/chat/completions")
    assert sent["headers"]["Authorization"] == "Bearer secret"
    assert sent["json"]["max_completion_tokens"] > 0


@pytest.mark.parametrize(
    ("status", "body", "expected"),
    [
        (429, {"error": {"code": "rate_limit_exceeded"}}, LLMRateLimited),
        (500, {"error": {"message": "boom"}}, LLMUnavailable),
        (503, {"error": {"message": "overloaded"}}, LLMUnavailable),
        (401, {"error": {"code": "invalid_api_key"}}, LLMRejected),
        (404, {"error": {"code": "model_not_found"}}, LLMRejected),
        # A malformed *generation*, not a malformed request: retryable.
        (400, {"error": {"code": "json_validate_failed"}}, LLMUnavailable),
    ],
)
async def test_http_failures_are_classified(monkeypatch, status, body, expected):
    _respond(monkeypatch, status=status, json=body)
    with pytest.raises(expected):
        await _provider().complete("system", "user")


async def test_429_carries_retry_after(monkeypatch):
    _respond(monkeypatch, status=429, json={}, headers={"retry-after": "2"})
    with pytest.raises(LLMRateLimited) as info:
        await _provider().complete("system", "user")
    assert info.value.retry_after == 2.0


async def test_timeouts_and_connection_errors_are_retryable(monkeypatch):
    _respond(monkeypatch, raises=httpx.ReadTimeout("slow"))
    with pytest.raises(LLMTimeout):
        await _provider().complete("system", "user")
    _respond(monkeypatch, raises=httpx.ConnectError("down"))
    with pytest.raises(LLMUnavailable):
        await _provider().complete("system", "user")


async def test_error_names_the_model_but_never_logs_the_failed_generation(monkeypatch):
    """json_validate_failed bodies include the model's output — receipt
    content — under `failed_generation`. It must not reach the error text."""
    body = {
        "error": {
            "code": "json_validate_failed",
            "message": "Failed to generate JSON",
            "failed_generation": "CAFE ROMA card 4111 1111 1111 1111",
        }
    }
    _respond(monkeypatch, status=400, json=body)
    with pytest.raises(LLMUnavailable) as info:
        await _provider(model="openai/gpt-oss-20b").complete("system", "user")
    text = str(info.value)
    assert "openai/gpt-oss-20b" in text
    assert "CAFE ROMA" not in text and "4111" not in text


async def test_unusable_success_body_is_a_provider_failure(monkeypatch):
    _respond(monkeypatch, status=200, json={"unexpected": "shape"})
    with pytest.raises(LLMUnavailable):
        await _provider().complete("system", "user")
