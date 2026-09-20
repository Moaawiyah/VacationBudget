"""Denoising and contrast/threshold enhancement to make text easier for OCR."""

import cv2
import numpy as np


def denoise(gray: np.ndarray) -> np.ndarray:
    return cv2.fastNlMeansDenoising(gray, h=10, templateWindowSize=7, searchWindowSize=21)


def enhance_contrast(gray: np.ndarray) -> np.ndarray:
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    return clahe.apply(gray)


def adaptive_threshold(gray: np.ndarray) -> np.ndarray:
    return cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 15
    )


def prepare_for_ocr(gray: np.ndarray) -> np.ndarray:
    """Full enhancement chain: denoise -> contrast -> threshold, in that
    order (thresholding first would destroy the detail CLAHE needs)."""
    return adaptive_threshold(enhance_contrast(denoise(gray)))
