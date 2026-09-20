"""OpenCV preprocessing: crop the receipt out of its background, correct
perspective, and deskew it, so OCR sees a flat, upright document."""

import cv2
import numpy as np
from PIL import Image


def _order_corners(pts: np.ndarray) -> np.ndarray:
    """Orders 4 points as top-left, top-right, bottom-right, bottom-left."""
    rect = np.zeros((4, 2), dtype="float32")
    total = pts.sum(axis=1)
    rect[0] = pts[np.argmin(total)]
    rect[2] = pts[np.argmax(total)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect


def _find_receipt_contour(gray: np.ndarray) -> np.ndarray | None:
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.dilate(cv2.Canny(blurred, 50, 150), None, iterations=2)
    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    image_area = gray.shape[0] * gray.shape[1]
    for contour in sorted(contours, key=cv2.contourArea, reverse=True)[:5]:
        if cv2.contourArea(contour) < image_area * 0.2:
            continue
        perimeter = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * perimeter, True)
        if len(approx) == 4:
            return approx.reshape(4, 2)
    return None


def _warp_perspective(image: np.ndarray, corners: np.ndarray) -> np.ndarray:
    rect = _order_corners(corners.astype("float32"))
    (top_left, top_right, bottom_right, bottom_left) = rect
    width = int(
        max(
            np.linalg.norm(bottom_right - bottom_left), np.linalg.norm(top_right - top_left)
        )
    )
    height = int(
        max(
            np.linalg.norm(top_right - bottom_right), np.linalg.norm(top_left - bottom_left)
        )
    )
    width, height = max(width, 1), max(height, 1)
    destination = np.array(
        [[0, 0], [width - 1, 0], [width - 1, height - 1], [0, height - 1]],
        dtype="float32",
    )
    matrix = cv2.getPerspectiveTransform(rect, destination)
    return cv2.warpPerspective(image, matrix, (width, height))


def _deskew(gray: np.ndarray) -> np.ndarray:
    coords = np.column_stack(np.where(gray < 250))
    if coords.size == 0:
        return gray
    angle = cv2.minAreaRect(coords.astype("float32"))[-1]
    angle = -(90 + angle) if angle < -45 else -angle
    if abs(angle) < 0.5:
        return gray
    height, width = gray.shape[:2]
    matrix = cv2.getRotationMatrix2D((width // 2, height // 2), angle, 1.0)
    return cv2.warpAffine(
        gray,
        matrix,
        (width, height),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )


def detect_and_crop(pil_image: Image.Image) -> np.ndarray:
    """Crops to the receipt and corrects its perspective when a clean
    4-corner contour is found; otherwise falls back to the full frame (still
    deskewed/enhanced later) — a busy background shouldn't block OCR
    from running on the whole image."""
    bgr = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    corners = _find_receipt_contour(gray)
    return _warp_perspective(bgr, corners) if corners is not None else bgr


def deskew_and_grayscale(image_bgr: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    return _deskew(gray)
