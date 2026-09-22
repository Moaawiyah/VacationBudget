"""POST /v1/receipts/analyze — the only endpoint this service exposes."""

from enum import Enum

from fastapi import APIRouter, Depends, Form, UploadFile

from app.api.schemas import AnalyzeReceiptResponse, ErrorResponse
from app.auth import require_service_token
from app.config import get_settings
from app.dependencies import get_pipeline
from app.errors import ServiceError
from app.ocr.languages import SUPPORTED_LANGUAGES
from app.pipeline import AnalyzeRequest, ReceiptPipeline
from app.upload.validator import UploadValidationError, read_upload

router = APIRouter(prefix="/v1/receipts", tags=["receipts"])

# The category list is caller-supplied and ends up inside a prompt, so it's
# bounded on both axes rather than trusted to be sane.
_MAX_CATEGORIES = 40
_MAX_CATEGORY_LENGTH = 50
# The raw comma-joined field, bounded before it's even split.
_MAX_CATEGORIES_FIELD = _MAX_CATEGORIES * (_MAX_CATEGORY_LENGTH + 1)

# Validated at the boundary: anything else is a 422, not a silent fallback.
Language = Enum("Language", {code: code for code in sorted(SUPPORTED_LANGUAGES)}, type=str)


def _parse_categories(raw: str | None) -> list[str]:
    if not raw:
        return []
    names = [name.strip()[:_MAX_CATEGORY_LENGTH] for name in raw.split(",")]
    return [name for name in names if name][:_MAX_CATEGORIES]


@router.post(
    "/analyze",
    response_model=AnalyzeReceiptResponse,
    responses={
        400: {"model": ErrorResponse, "description": "unsupported_image"},
        401: {"model": ErrorResponse, "description": "unauthorized"},
        413: {"model": ErrorResponse, "description": "image_too_large"},
        422: {"model": ErrorResponse, "description": "receipt_unreadable, invalid_request"},
        503: {"model": ErrorResponse, "description": "analysis_unavailable"},
    },
    dependencies=[Depends(require_service_token)],
)
async def analyze_receipt(
    file: UploadFile,
    language_hint: Language | None = Form(default=None),
    categories: str | None = Form(default=None, max_length=_MAX_CATEGORIES_FIELD),
    pipeline: ReceiptPipeline = Depends(get_pipeline),
) -> AnalyzeReceiptResponse:
    settings = get_settings()
    try:
        data = await read_upload(file, settings.max_upload_mb * 1024 * 1024)
        receipt = await pipeline.analyze(
            AnalyzeRequest(
                filename=file.filename or "upload",
                content_type=file.content_type,
                data=data,
                language_hint=language_hint.value if language_hint else None,
                categories=_parse_categories(categories),
            )
        )
    except UploadValidationError as exc:
        raise ServiceError(exc.code, exc.status, str(exc)) from exc
    return AnalyzeReceiptResponse(receipt=receipt)
