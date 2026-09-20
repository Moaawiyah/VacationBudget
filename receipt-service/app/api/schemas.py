"""Wire schemas for the receipts API — kept separate from the internal
domain model (app.models.receipt) so the HTTP contract can evolve
independently of it."""

from pydantic import BaseModel

from app.models.receipt import ExtractedReceipt


class AnalyzeReceiptResponse(BaseModel):
    receipt: ExtractedReceipt


class ErrorResponse(BaseModel):
    error: str
