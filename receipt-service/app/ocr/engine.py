"""OCR engines behind a common interface, so the pipeline doesn't care which
one actually ran. Heavy ML libraries are imported lazily inside each
engine's method (not at module load) so the rest of the service can start —
and be unit-tested — without PaddlePaddle/Tesseract installed.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

import numpy as np

from app.ocr.languages import paddle_lang_for, tesseract_lang_for


@dataclass
class OcrResult:
    text: str
    engine: str
    confidence: float


class OcrEngine(ABC):
    @abstractmethod
    def recognize(self, image: np.ndarray, language: str) -> OcrResult: ...


class PaddleOcrEngine(OcrEngine):
    """Wraps PaddleOCR. One recognizer per language is cached process-wide —
    reloading its model on every request would dominate request latency."""

    def __init__(self) -> None:
        self._recognizers: dict[str, Any] = {}

    def _recognizer_for(self, paddle_lang: str) -> Any:
        if paddle_lang not in self._recognizers:
            from paddleocr import PaddleOCR

            self._recognizers[paddle_lang] = PaddleOCR(
                lang=paddle_lang, use_angle_cls=True, show_log=False
            )
        return self._recognizers[paddle_lang]

    def recognize(self, image: np.ndarray, language: str) -> OcrResult:
        paddle_lang = paddle_lang_for(language)
        if paddle_lang is None:
            raise ValueError(f"PaddleOCR has no model for language: {language}")

        result = self._recognizer_for(paddle_lang).ocr(image, cls=True)
        lines = result[0] if result else []
        texts = [line[1][0] for line in lines if line and line[1]]
        scores = [line[1][1] for line in lines if line and line[1]]
        confidence = sum(scores) / len(scores) if scores else 0.0
        return OcrResult(text="\n".join(texts), engine="paddleocr", confidence=confidence)


class TesseractOcrEngine(OcrEngine):
    """Fallback engine — covers Hebrew (no PaddleOCR model) and any language
    where PaddleOCR itself fails at runtime."""

    def recognize(self, image: np.ndarray, language: str) -> OcrResult:
        import pytesseract
        from PIL import Image

        tesseract_lang = tesseract_lang_for(language)
        pil_image = Image.fromarray(image)
        data = pytesseract.image_to_data(
            pil_image, lang=tesseract_lang, output_type=pytesseract.Output.DICT
        )
        words = [word for word in data["text"] if word.strip()]
        confidences = [float(c) for c in data["conf"] if c not in ("-1", -1)]
        confidence = (sum(confidences) / len(confidences) / 100) if confidences else 0.0
        return OcrResult(text=" ".join(words), engine="tesseract", confidence=confidence)
