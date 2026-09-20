"""Domain model for a fully validated, normalized receipt extraction.

Everything here has already passed through app.validation — nothing on this
model is a raw, untrusted LLM claim.
"""

from pydantic import BaseModel, Field


class LineItem(BaseModel):
    description: str
    quantity: float | None = None
    unit_price: float | None = None
    total_price: float | None = None


class Warning(BaseModel):
    field: str
    message: str
    severity: str = "warning"  # "warning" | "error"


class ExtractedReceipt(BaseModel):
    merchant: str | None = None
    expense_date: str | None = None  # ISO 8601 (YYYY-MM-DD)
    total: float | None = None
    subtotal: float | None = None
    tax: float | None = None
    currency: str | None = None  # ISO 4217, e.g. "EUR"
    # Always one of the caller-supplied category names, or None — never a
    # name the model invented (see app.validation.receipt_validator).
    category: str | None = None
    detected_language: str | None = None
    translation: str | None = None
    line_items: list[LineItem] = Field(default_factory=list)
    warnings: list[Warning] = Field(default_factory=list)
    raw_ocr_text: str = ""
    confidence: float = 0.0
