"""Orchestrates the full analyze pipeline: upload -> vision -> OCR -> LLM
extraction -> validation. Each stage is injected, so this stays testable with
fakes and never imports heavy ML libraries itself.
"""

import logging
from dataclasses import dataclass, field

from app.errors import AnalysisUnavailable, ReceiptUnreadable
from app.llm.errors import LLMError
from app.llm.extraction import extract
from app.llm.provider import LLMProvider
from app.models.receipt import ExtractedReceipt
from app.ocr.service import OcrService
from app.upload.validator import validate_upload
from app.validation.icons import FALLBACK_ICON
from app.validation.receipt_validator import validate_extraction
from app.vision.pipeline import preprocess_receipt

logger = logging.getLogger(__name__)

# Below this, OCR found effectively nothing: a real receipt has at least a
# merchant and a total. Sending near-empty text to the LLM only invites it to
# invent a plausible-looking receipt.
MIN_OCR_CHARS = 8


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
        self,
        ocr_service: OcrService,
        llm_provider: LLMProvider,
        max_upload_bytes: int,
        max_image_pixels: int,
    ) -> None:
        self._ocr = ocr_service
        self._llm = llm_provider
        self._max_upload_bytes = max_upload_bytes
        self._max_image_pixels = max_image_pixels

    async def analyze(self, request: AnalyzeRequest) -> ExtractedReceipt:
        image = validate_upload(
            request.filename,
            request.content_type,
            request.data,
            self._max_upload_bytes,
            self._max_image_pixels,
        )
        prepared = preprocess_receipt(image)
        ocr_result = self._ocr.recognize(prepared, request.language_hint or "en")
        if len(ocr_result.text.strip()) < MIN_OCR_CHARS:
            logger.info(
                "receipt unreadable", extra={"fields": {"ocr_chars": len(ocr_result.text)}}
            )
            raise ReceiptUnreadable()
        try:
            raw, warnings = await extract(
                self._llm, ocr_result.text, request.language_hint, request.categories
            )
        except LLMError as exc:
            # Retries already happened inside the provider; this is final.
            fields = {"kind": type(exc).__name__, "error": str(exc)}
            logger.error("LLM failed", extra={"fields": fields})
            raise AnalysisUnavailable() from exc
        receipt = validate_extraction(raw, ocr_result.text, warnings, request.categories)
        _log_outcome(ocr_result.engine, len(ocr_result.text), warnings, receipt)
        return receipt


def _log_outcome(
    ocr_engine: str, ocr_chars: int, llm_warnings: list[str], receipt: ExtractedReceipt
) -> None:
    """Records which stage produced what — shape only, never contents.

    Receipts carry personal data (card fragments, addresses, what someone
    bought), so the log holds counts and flags: enough to tell an OCR failure
    from an LLM failure from a validation rejection, and nothing more.
    """
    logger.info(
        "receipt analyzed",
        extra={
            "fields": {
                "ocr_engine": ocr_engine,
                "ocr_chars": ocr_chars,
                "llm_warnings": llm_warnings,
                "line_items": len(receipt.line_items),
                "items_with_icon": sum(
                    1 for item in receipt.line_items if item.icon != FALLBACK_ICON
                ),
                "has_merchant": receipt.merchant is not None,
                "has_total": receipt.total is not None,
                "has_category": receipt.category is not None,
                "warning_fields": sorted({w.field for w in receipt.warnings}),
                "confidence": receipt.confidence,
            }
        },
    )
