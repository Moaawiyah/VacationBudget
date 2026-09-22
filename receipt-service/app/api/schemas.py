"""Wire schemas for the receipts API — kept separate from the internal
domain model (app.models.receipt) so the HTTP contract can evolve
independently of it."""

from pydantic import BaseModel

from app.models.receipt import ExtractedReceipt


class AnalyzeReceiptResponse(BaseModel):
    receipt: ExtractedReceipt


class ErrorResponse(BaseModel):
    """Every non-2xx body. `code` is stable and machine-readable (the web app
    translates it); `message` is English for developers."""

    code: str
    message: str
