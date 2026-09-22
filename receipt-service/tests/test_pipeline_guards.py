import pytest

from app.errors import AnalysisUnavailable, ReceiptUnreadable
from app.llm.errors import LLMUnavailable
from app.llm.provider import LLMProvider
from app.ocr.engine import OcrResult
from app.pipeline import AnalyzeRequest, ReceiptPipeline
from tests.stubs import StubOcrService
from tests.stubs import jpeg_bytes as _jpeg_bytes


@pytest.mark.asyncio
async def test_empty_ocr_is_unreadable_and_never_reaches_the_llm():
    """Given nothing to read, an LLM can only invent a receipt — so it isn't asked."""

    class BlankOcr:
        def recognize(self, image, language):
            return OcrResult(text="  \n ", engine="stub", confidence=0.0)

    class MustNotBeCalled(LLMProvider):
        async def complete(self, system_prompt: str, user_prompt: str) -> str:
            raise AssertionError("LLM called on an unreadable receipt")

    pipeline = ReceiptPipeline(
        ocr_service=BlankOcr(),
        llm_provider=MustNotBeCalled(),
        max_upload_bytes=1_000_000,
        max_image_pixels=10_000_000,
    )
    with pytest.raises(ReceiptUnreadable):
        await pipeline.analyze(
            AnalyzeRequest(
                filename="r.jpg",
                content_type="image/jpeg",
                data=_jpeg_bytes(),
                language_hint=None,
            )
        )


@pytest.mark.asyncio
async def test_llm_failure_after_retries_is_analysis_unavailable():
    class Down(LLMProvider):
        async def complete(self, system_prompt: str, user_prompt: str) -> str:
            raise LLMUnavailable("503 from provider")

    pipeline = ReceiptPipeline(
        ocr_service=StubOcrService(),
        llm_provider=Down(),
        max_upload_bytes=1_000_000,
        max_image_pixels=10_000_000,
    )
    with pytest.raises(AnalysisUnavailable):
        await pipeline.analyze(
            AnalyzeRequest(
                filename="r.jpg",
                content_type="image/jpeg",
                data=_jpeg_bytes(),
                language_hint=None,
            )
        )
