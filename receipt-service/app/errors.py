"""Errors this service reports to its caller, each with a stable code.

Every failure response has the same shape — {"code": ..., "message": ...} —
so the web app can map `code` to a translated message. `message` is plain
English for developers; neither ever carries a stack trace or provider
internals (those go to the logs only).
"""


class ServiceError(Exception):
    def __init__(self, code: str, status: int, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.status = status
        self.message = message


class ReceiptUnreadable(ServiceError):
    """OCR found (next to) no text. The LLM is never asked in this case —
    given nothing to read, it could only invent a receipt."""

    def __init__(self, message: str = "No readable text found on the receipt") -> None:
        super().__init__("receipt_unreadable", 422, message)


class AnalysisUnavailable(ServiceError):
    """The LLM provider failed even after retries."""

    def __init__(self) -> None:
        super().__init__(
            "analysis_unavailable", 503, "Receipt analysis is temporarily unavailable"
        )
