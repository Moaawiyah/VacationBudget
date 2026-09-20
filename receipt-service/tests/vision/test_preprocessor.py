import numpy as np
from PIL import Image, ImageDraw

from app.vision.preprocessor import deskew_and_grayscale, detect_and_crop


def _synthetic_receipt(rotate: float = 0.0) -> Image.Image:
    """A white rectangle (the "receipt") with black text-like strokes, on a
    dark, busy background — enough for contour detection to find a 4-corner
    shape without needing a real photograph."""
    canvas = Image.new("RGB", (400, 500), color=(40, 40, 40))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle([60, 80, 340, 420], fill="white", outline="black", width=3)
    for y in range(120, 400, 30):
        draw.line([(90, y), (300, y)], fill="black", width=4)
    return canvas.rotate(rotate, fillcolor=(40, 40, 40), expand=False)


def test_detect_and_crop_finds_the_receipt_and_shrinks_the_frame():
    original = _synthetic_receipt()
    cropped = detect_and_crop(original)
    assert cropped.shape[0] < original.size[1]
    assert cropped.shape[1] < original.size[0]


def test_detect_and_crop_falls_back_to_full_frame_without_a_clean_contour():
    # A uniform image has no edges at all, so no 4-corner contour exists.
    blank = Image.new("RGB", (100, 100), color="white")
    result = detect_and_crop(blank)
    assert result.shape[:2] == (100, 100)


def test_deskew_and_grayscale_returns_2d_array():
    original = _synthetic_receipt()
    cropped = detect_and_crop(original)
    gray = deskew_and_grayscale(cropped)
    assert gray.ndim == 2
    assert gray.dtype == np.uint8
