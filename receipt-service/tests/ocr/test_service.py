import numpy as np

from app.ocr.engine import OcrEngine, OcrResult
from app.ocr.service import OcrService

_IMAGE = np.zeros((10, 10), dtype=np.uint8)


class FakeEngine(OcrEngine):
    def __init__(self, text="", raises=False):
        self.text = text
        self.raises = raises
        self.calls: list[str] = []

    def recognize(self, image, language):
        self.calls.append(language)
        if self.raises:
            raise RuntimeError("engine failed")
        return OcrResult(text=self.text, engine="fake", confidence=1.0)


def test_routes_supported_language_to_paddle():
    paddle, tesseract = FakeEngine("paddle text"), FakeEngine("tesseract text")
    service = OcrService(paddle=paddle, tesseract=tesseract)

    result = service.recognize(_IMAGE, "en")

    assert result.text == "paddle text"
    assert paddle.calls == ["en"]
    assert tesseract.calls == []


def test_routes_hebrew_directly_to_tesseract():
    paddle, tesseract = FakeEngine("paddle text"), FakeEngine("tesseract text")
    service = OcrService(paddle=paddle, tesseract=tesseract)

    result = service.recognize(_IMAGE, "he")

    assert result.text == "tesseract text"
    assert paddle.calls == []
    assert tesseract.calls == ["he"]


def test_falls_back_to_tesseract_when_paddle_raises():
    paddle, tesseract = FakeEngine(raises=True), FakeEngine("tesseract text")
    service = OcrService(paddle=paddle, tesseract=tesseract)

    result = service.recognize(_IMAGE, "fr")

    assert result.text == "tesseract text"
    assert paddle.calls == ["fr"]
    assert tesseract.calls == ["fr"]
