"""Application settings, loaded from environment variables (.env in local dev)."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Groq: an OpenAI-compatible chat-completions API. GROQ_MODEL must name a
    # model currently on Groq's free tier — check console.groq.com/docs/models,
    # since availability changes over time. The default below is a reasonable
    # choice as of writing but is not authoritative; always set it explicitly
    # in production.
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-20b"
    groq_base_url: str = "https://api.groq.com/openai/v1"
    # Per attempt. Retries (timeouts, 429s, 5xx only) are capped by count
    # and by an overall deadline under the web app's 60s request timeout.
    groq_timeout_seconds: float = 20.0
    llm_max_attempts: int = 3
    llm_deadline_seconds: float = 45.0

    # Shared secret the Next.js server sends as `Authorization: Bearer
    # <token>`. Left empty by default so the service fails closed (see
    # app.auth) rather than silently accepting unauthenticated requests.
    service_auth_token: str = ""

    # Comma-separated origins allowed to call this service directly. Normally
    # empty: the Next.js server calls it server-to-server, never a browser.
    allowed_origins: str = ""

    max_upload_mb: int = 15
    # Hard cap on decoded image resolution (width * height). A 15MB PNG can
    # otherwise decompress to hundreds of MB of pixels, and OpenCV/Paddle
    # copy that bitmap several times — an easy memory-exhaustion vector.
    max_image_megapixels: int = 50
    log_level: str = "info"

    @property
    def allowed_origin_list(self) -> list[str]:
        return [
            origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()
