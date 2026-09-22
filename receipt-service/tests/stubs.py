"""Fakes shared by the pipeline and API tests."""

import io

from PIL import Image

from app.llm.provider import LLMProvider
from app.ocr.engine import OcrEngine, OcrResult


class StubOcrEngine(OcrEngine):
    def recognize(self, image, language):
        return OcrResult(text="CAFE ROMA\nTOTAL 11.00", engine="stub", confidence=0.9)


class StubOcrService:
    def recognize(self, image, language):
        return StubOcrEngine().recognize(image, language)


class StubLLMProvider(LLMProvider):
    def __init__(self, response: str):
        self._response = response

    async def complete(self, system_prompt: str, user_prompt: str) -> str:
        return self._response


def jpeg_bytes() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (50, 50), color="white").save(buffer, format="JPEG")
    return buffer.getvalue()
