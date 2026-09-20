"""Picks the right OCR engine per language and recovers if the primary one fails."""

import logging

import numpy as np

from app.ocr.engine import OcrEngine, OcrResult, PaddleOcrEngine, TesseractOcrEngine
from app.ocr.languages import paddle_lang_for

logger = logging.getLogger(__name__)


class OcrService:
    def __init__(
        self, paddle: OcrEngine | None = None, tesseract: OcrEngine | None = None
    ) -> None:
        self._paddle = paddle or PaddleOcrEngine()
        self._tesseract = tesseract or TesseractOcrEngine()

    def recognize(self, image: np.ndarray, language: str) -> OcrResult:
        if paddle_lang_for(language) is not None:
            try:
                return self._paddle.recognize(image, language)
            except Exception:
                logger.exception("PaddleOCR failed for language=%s, falling back", language)
        return self._tesseract.recognize(image, language)
