"""Every failure path answers with one {code, message} shape and the right
status — and never reflects internals or the request's own payload."""

from fastapi.testclient import TestClient

from app.dependencies import get_pipeline
from app.errors import AnalysisUnavailable, ReceiptUnreadable
from app.main import app
from app.upload.validator import UploadValidationError
from tests.api.test_receipts import _clear_overrides, _jpeg_file, client


def _post(pipeline, **kwargs):
    """Posts a receipt through `pipeline`, as a real client would see it:
    raise_server_exceptions=False returns the 500 instead of re-raising."""
    app.dependency_overrides[get_pipeline] = lambda: pipeline
    try:
        return TestClient(app, raise_server_exceptions=False).post(
            "/v1/receipts/analyze",
            headers={"Authorization": "Bearer test-token"},
            files={"file": kwargs.pop("file", _jpeg_file())},
            **kwargs,
        )
    finally:
        _clear_overrides()


class _Raising:
    def __init__(self, error: Exception) -> None:
        self.error = error

    async def analyze(self, request):
        raise self.error


def test_unexpected_failure_is_a_500_without_leaking_internals():
    response = _post(_Raising(RuntimeError("some internal detail that should not leak")))
    assert response.status_code == 500
    assert response.json()["code"] == "internal_error"
    assert "internal detail" not in response.text
    assert "Traceback" not in response.text


def test_llm_outage_is_a_503_analysis_unavailable():
    response = _post(_Raising(AnalysisUnavailable()))
    assert response.status_code == 503
    assert response.json()["code"] == "analysis_unavailable"


def test_unreadable_receipt_is_a_422():
    response = _post(_Raising(ReceiptUnreadable()))
    assert response.status_code == 422
    assert response.json()["code"] == "receipt_unreadable"


def test_oversized_upload_is_a_413():
    response = _post(_Raising(UploadValidationError("too big", "image_too_large")))
    assert response.status_code == 413
    assert response.json()["code"] == "image_too_large"


def test_unsupported_language_hint_is_rejected_at_the_boundary():
    response = _post(
        _Raising(AssertionError("never reached")), data={"language_hint": "xx"}
    )
    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "invalid_request"
    assert "xx" not in body["message"]  # the payload isn't reflected back


def test_error_bodies_share_one_shape():
    unauthorized = client.post("/v1/receipts/analyze", files={"file": _jpeg_file()})
    assert unauthorized.status_code == 401
    assert set(unauthorized.json()) == {"code", "message"}
