import io

from fastapi.testclient import TestClient
from PIL import Image

from app.dependencies import get_pipeline
from app.llm.provider import LLMProvider
from app.main import app
from app.ocr.engine import OcrResult
from app.pipeline import ReceiptPipeline

client = TestClient(app)


class StubOcrService:
    def recognize(self, image, language):
        return OcrResult(text="CAFE\nTOTAL 5.00", engine="stub", confidence=1.0)


class StubLLMProvider(LLMProvider):
    async def complete(self, system_prompt: str, user_prompt: str) -> str:
        return '{"merchant": "Cafe", "total": 5.0, "currency": "EUR"}'


def _override_pipeline():
    app.dependency_overrides[get_pipeline] = lambda: ReceiptPipeline(
        ocr_service=StubOcrService(),
        llm_provider=StubLLMProvider(),
        max_upload_bytes=1_000_000,
        max_image_pixels=10_000_000,
    )


def _clear_overrides():
    app.dependency_overrides.clear()


def _jpeg_file():
    buffer = io.BytesIO()
    Image.new("RGB", (30, 30), color="white").save(buffer, format="JPEG")
    buffer.seek(0)
    return ("receipt.jpg", buffer, "image/jpeg")


def test_missing_auth_header_is_rejected():
    _clear_overrides()
    response = client.post("/v1/receipts/analyze", files={"file": _jpeg_file()})
    assert response.status_code == 401


def test_wrong_token_is_rejected():
    _clear_overrides()
    response = client.post(
        "/v1/receipts/analyze",
        headers={"Authorization": "Bearer wrong-token"},
        files={"file": _jpeg_file()},
    )
    assert response.status_code == 401


def test_valid_request_returns_analyzed_receipt():
    _override_pipeline()
    try:
        response = client.post(
            "/v1/receipts/analyze",
            headers={"Authorization": "Bearer test-token"},
            files={"file": _jpeg_file()},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["receipt"]["merchant"] == "Cafe"
        assert body["receipt"]["total"] == 5.0
    finally:
        _clear_overrides()


def test_invalid_upload_returns_400():
    _override_pipeline()
    try:
        response = client.post(
            "/v1/receipts/analyze",
            headers={"Authorization": "Bearer test-token"},
            files={"file": ("receipt.txt", io.BytesIO(b"not an image"), "text/plain")},
        )
        assert response.status_code == 400
    finally:
        _clear_overrides()


def test_health_check():
    assert client.get("/health").json() == {"status": "ok"}
