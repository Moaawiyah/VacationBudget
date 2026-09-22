"""FastAPI dependency wiring: builds the (expensive, stateful) pipeline once
per process and reuses it across requests."""

from functools import lru_cache

from app.config import get_settings
from app.llm.groq_provider import GroqProvider
from app.llm.retrying import RetryingProvider
from app.ocr.service import OcrService
from app.pipeline import ReceiptPipeline


@lru_cache
def get_pipeline() -> ReceiptPipeline:
    settings = get_settings()
    provider = RetryingProvider(
        GroqProvider(
            api_key=settings.groq_api_key,
            model=settings.groq_model,
            base_url=settings.groq_base_url,
            timeout=settings.groq_timeout_seconds,
        ),
        max_attempts=settings.llm_max_attempts,
        deadline=settings.llm_deadline_seconds,
    )
    return ReceiptPipeline(
        ocr_service=OcrService(),
        llm_provider=provider,
        max_upload_bytes=settings.max_upload_mb * 1024 * 1024,
        max_image_pixels=settings.max_image_megapixels * 1_000_000,
    )
