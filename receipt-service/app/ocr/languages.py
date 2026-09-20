"""Maps the app's supported language codes to each OCR engine's own codes.

PaddleOCR's bundled multilingual recognizers don't include a Hebrew-script
model, so Hebrew always routes to the Tesseract fallback engine (see
app.ocr.service); every other supported language prefers PaddleOCR, with
Tesseract as a safety net if Paddle's recognizer errors at runtime.
"""

SUPPORTED_LANGUAGES = {"en", "it", "de", "fr", "ar", "he"}

_PADDLE_LANG = {"en": "en", "it": "it", "de": "german", "fr": "french", "ar": "ar"}
_TESSERACT_LANG = {
    "en": "eng",
    "it": "ita",
    "de": "deu",
    "fr": "fra",
    "ar": "ara",
    "he": "heb",
}


def paddle_lang_for(language: str) -> str | None:
    return _PADDLE_LANG.get(language)


def tesseract_lang_for(language: str) -> str:
    return _TESSERACT_LANG.get(language, "eng")
