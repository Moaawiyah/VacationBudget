"""Orchestrates the full analyze pipeline: upload -> vision -> OCR -> LLM
extraction -> validation. Each stage is injected, so this stays testable with
fakes and never imports heavy ML libraries itself.
"""

from dataclasses import dataclass, field

from app.llm.extraction import extract
from app.llm.provider import LLMProvider
from app.models.receipt import ExtractedReceipt
from app.ocr.service import OcrService
from app.upload.validator import validate_upload
from app.validation.receipt_validator import validate_extraction
from app.vision.pipeline import preprocess_receipt


@dataclass
class AnalyzeRequest:
    filename: str
    content_type: str | None
    data: bytes
    language_hint: str | None
    # The caller's own expense categories, offered to the LLM to choose from.
    # Empty means "don't suggest a category".
    categories: list[str] = field(default_factory=list)


class ReceiptPipeline:
    def __init__(
        self, ocr_service: OcrService, llm_provider: LLMProvider, max_upload_bytes: int
    ) -> None:
        self._ocr = ocr_service
        self._llm = llm_provider
        self._max_upload_bytes = max_upload_bytes

    async def analyze(self, request: AnalyzeRequest) -> ExtractedReceipt:
        image = validate_upload(
            request.filename, request.content_type, request.data, self._max_upload_bytes
        )
        prepared = preprocess_receipt(image)
        ocr_result = self._ocr.recognize(prepared, request.language_hint or "en")
        raw, warnings = await extract(
            self._llm, ocr_result.text, request.language_hint, request.categories
        )
        return validate_extraction(raw, ocr_result.text, warnings, request.categories)
