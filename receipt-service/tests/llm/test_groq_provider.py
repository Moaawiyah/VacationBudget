import httpx
import pytest

from app.llm.groq_provider import GroqError, GroqProvider


def test_requires_api_key():
    with pytest.raises(GroqError):
        GroqProvider(
            api_key="", model="m", base_url="https://api.groq.com/openai/v1", timeout=5
        )


@pytest.mark.asyncio
async def test_complete_returns_message_content(monkeypatch):
    async def fake_post(self, url, json, headers):
        assert url.endswith("/chat/completions")
        assert headers["Authorization"] == "Bearer secret"
        request = httpx.Request("POST", url)
        return httpx.Response(
            200,
            json={"choices": [{"message": {"content": '{"merchant": "Cafe"}'}}]},
            request=request,
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
    provider = GroqProvider(
        api_key="secret",
        model="llama-3.3-70b-versatile",
        base_url="https://api.groq.com/openai/v1",
        timeout=5,
    )
    result = await provider.complete("system", "user")
    assert result == '{"merchant": "Cafe"}'


@pytest.mark.asyncio
async def test_http_error_raises_groq_error(monkeypatch):
    async def fake_post(self, url, json, headers):
        request = httpx.Request("POST", url)
        return httpx.Response(401, json={"error": "bad key"}, request=request)

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
    provider = GroqProvider(
        api_key="secret", model="m", base_url="https://api.groq.com/openai/v1", timeout=5
    )
    with pytest.raises(GroqError):
        await provider.complete("system", "user")


@pytest.mark.asyncio
async def test_rejection_surfaces_groqs_own_explanation_and_the_model_id(monkeypatch):
    """A bare status code can't distinguish a bad model id from a bad URL —
    Groq's body says which, so it has to reach the logs."""

    async def fake_post(self, url, json, headers):
        request = httpx.Request("POST", url)
        return httpx.Response(
            404,
            json={"error": {"message": "The model `bogus-model` does not exist"}},
            request=request,
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
    provider = GroqProvider(
        api_key="secret",
        model="bogus-model",
        base_url="https://api.groq.com/openai/v1",
        timeout=5,
    )
    with pytest.raises(GroqError, match="does not exist") as excinfo:
        await provider.complete("system", "user")
    assert "bogus-model" in str(excinfo.value)


@pytest.mark.asyncio
async def test_malformed_response_shape_raises_groq_error(monkeypatch):
    async def fake_post(self, url, json, headers):
        request = httpx.Request("POST", url)
        return httpx.Response(200, json={"unexpected": "shape"}, request=request)

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
    provider = GroqProvider(
        api_key="secret", model="m", base_url="https://api.groq.com/openai/v1", timeout=5
    )
    with pytest.raises(GroqError):
        await provider.complete("system", "user")
