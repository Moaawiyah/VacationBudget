"""Validates an uploaded receipt image before it ever reaches OpenCV/OCR:
declared type, real image content (not just a renamed file), and size."""

import io

from fastapi import UploadFile
from PIL import Image, UnidentifiedImageError

_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/heic", "image/heif"}
_ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".heic", ".heif"}
_HEIF_TYPES = {"image/heic", "image/heif"}
_HEIF_EXTENSIONS = {".heic", ".heif"}


class UploadValidationError(ValueError):
    """Raised when an uploaded file fails validation; message is user-facing."""


def _ensure_heif_support() -> None:
    try:
        import pillow_heif

        pillow_heif.register_heif_opener()
    except ImportError as exc:
        raise UploadValidationError("HEIC/HEIF is not supported by this server") from exc


def _extension_of(filename: str) -> str:
    return "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def validate_upload(
    filename: str,
    content_type: str | None,
    data: bytes,
    max_bytes: int,
    max_pixels: int = 50_000_000,
) -> Image.Image:
    """Returns the decoded, verified image, or raises UploadValidationError."""
    if not data:
        raise UploadValidationError("Empty file")
    if len(data) > max_bytes:
        raise UploadValidationError(
            f"File exceeds the {max_bytes // (1024 * 1024)}MB limit"
        )

    extension = _extension_of(filename)
    if content_type not in _ALLOWED_CONTENT_TYPES and extension not in _ALLOWED_EXTENSIONS:
        raise UploadValidationError("Unsupported file type — use JPG, PNG or HEIC")

    if content_type in _HEIF_TYPES or extension in _HEIF_EXTENSIONS:
        _ensure_heif_support()

    try:
        image = Image.open(io.BytesIO(data))
        # Resolution check happens before any pixel is decoded: the header
        # already states width/height, so a decompression bomb is refused
        # without ever allocating its bitmap. Kept below PIL's own
        # MAX_IMAGE_PIXELS so the explicit check always fires first.
        if image.width * image.height > max_pixels:
            raise UploadValidationError("Image resolution is too high")
        image.verify()  # Detects truncated/corrupt files; consumes the handle.
        image = Image.open(io.BytesIO(data))  # Re-open: verify() leaves it unusable.
        image.load()
    except UploadValidationError:
        # Re-raise as-is (e.g. the resolution message) — it subclasses
        # ValueError, so the generic handler below would otherwise swallow it.
        raise
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, ValueError) as exc:
        raise UploadValidationError("File is not a valid image") from exc

    return image.convert("RGB")


async def read_upload(file: UploadFile, max_bytes: int) -> bytes:
    """Reads an UploadFile's body, refusing anything past max_bytes early
    rather than buffering an arbitrarily large upload into memory first."""
    chunks: list[bytes] = []
    total = 0
    while chunk := await file.read(1024 * 1024):
        total += len(chunk)
        if total > max_bytes:
            raise UploadValidationError(
                f"File exceeds the {max_bytes // (1024 * 1024)}MB limit"
            )
        chunks.append(chunk)
    return b"".join(chunks)
