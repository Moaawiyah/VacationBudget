"""End-to-end vision preprocessing: crop -> deskew -> denoise -> enhance -> threshold."""

import numpy as np
from PIL import Image

from app.vision.enhancement import prepare_for_ocr
from app.vision.preprocessor import deskew_and_grayscale, detect_and_crop


def preprocess_receipt(pil_image: Image.Image) -> np.ndarray:
    """Returns a thresholded, OCR-ready grayscale image."""
    cropped = detect_and_crop(pil_image)
    gray = deskew_and_grayscale(cropped)
    return prepare_for_ocr(gray)
