import numpy as np

from app.vision.enhancement import (
    adaptive_threshold,
    denoise,
    enhance_contrast,
    prepare_for_ocr,
)


def _gray_noise() -> np.ndarray:
    rng = np.random.default_rng(seed=0)
    return rng.integers(0, 256, size=(64, 64), dtype=np.uint8)


def test_denoise_preserves_shape_and_dtype():
    gray = _gray_noise()
    result = denoise(gray)
    assert result.shape == gray.shape
    assert result.dtype == np.uint8


def test_enhance_contrast_preserves_shape_and_dtype():
    gray = _gray_noise()
    result = enhance_contrast(gray)
    assert result.shape == gray.shape
    assert result.dtype == np.uint8


def test_adaptive_threshold_produces_binary_image():
    gray = _gray_noise()
    result = adaptive_threshold(gray)
    assert set(np.unique(result)).issubset({0, 255})


def test_prepare_for_ocr_full_chain():
    gray = _gray_noise()
    result = prepare_for_ocr(gray)
    assert result.shape == gray.shape
    assert set(np.unique(result)).issubset({0, 255})
