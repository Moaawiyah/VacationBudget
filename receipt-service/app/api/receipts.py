"""POST /v1/receipts/analyze — the only endpoint this service exposes."""

import logging

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, status

from app.api.schemas import AnalyzeReceiptResponse
from app.auth import require_service_token
from app.config import get_settings
from app.dependencies import get_pipeline
from app.ocr.languages import SUPPORTED_LANGUAGES
from app.pipeline import AnalyzeRequest, ReceiptPipeline
from app.upload.validator import UploadValidationError, read_upload

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v1/receipts", tags=["receipts"])

# The category list is caller-supplied and ends up inside a prompt, so it's
# bounded on both axes rather than trusted to be sane.
_MAX_CATEGORIES = 40
_MAX_CATEGORY_LENGTH = 50


def _parse_categories(raw: str | None) -> list[str]:
    if not raw:
        return []
    names = [name.strip()[:_MAX_CATEGORY_LENGTH] for name in raw.split(",")]
    return [name for name in names if name][:_MAX_CATEGORIES]


@router.post(
    "/analyze",
    response_model=AnalyzeReceiptResponse,
    dependencies=[Depends(require_service_token)],
)
async def analyze_receipt(
    file: UploadFile,
    language_hint: str | None = Form(default=None),
    categories: str | None = Form(default=None),
    pipeline: ReceiptPipeline = Depends(get_pipeline),
) -> AnalyzeReceiptResponse:
    if language_hint not in SUPPORTED_LANGUAGES:
        language_hint = None

    settings = get_settings()
    try:
        data = await read_upload(file, settings.max_upload_mb * 1024 * 1024)
        receipt = await pipeline.analyze(
            AnalyzeRequest(
                filename=file.filename or "upload",
                content_type=file.content_type,
                data=data,
                language_hint=language_hint,
                categories=_parse_categories(categories),
            )
        )
    except UploadValidationError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    except Exception:
        logger.exception("Receipt analysis failed")
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY, "Could not process the receipt"
        ) from None

    return AnalyzeReceiptResponse(receipt=receipt)
