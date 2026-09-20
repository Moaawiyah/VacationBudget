import io
import sys

import pytest
from PIL import Image

from app.upload.validator import UploadValidationError, validate_upload


def _png_bytes(size=(20, 20)) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", size, color="white").save(buffer, format="PNG")
    return buffer.getvalue()


def test_valid_png_is_accepted():
    image = validate_upload("receipt.png", "image/png", _png_bytes(), max_bytes=10_000)
    assert image.mode == "RGB"


def test_empty_file_is_rejected():
    with pytest.raises(UploadValidationError):
        validate_upload("receipt.png", "image/png", b"", max_bytes=10_000)


def test_oversized_file_is_rejected():
    with pytest.raises(UploadValidationError):
        validate_upload("receipt.png", "image/png", _png_bytes(), max_bytes=10)


def test_image_exceeding_pixel_cap_is_rejected_before_decoding():
    """The resolution check reads only the PNG header, so a decompression
    bomb is refused without its bitmap ever being allocated."""
    bomb = _png_bytes(size=(4000, 4000))  # 16 MP > the 300-pixel cap below
    with pytest.raises(UploadValidationError, match="resolution"):
        validate_upload("receipt.png", "image/png", bomb, max_bytes=10_000_000, max_pixels=300)


def test_image_within_pixel_cap_is_accepted():
    image = validate_upload(
        "receipt.png", "image/png", _png_bytes(size=(30, 30)), max_bytes=10_000, max_pixels=900
    )
    assert image.size == (30, 30)


def test_unsupported_extension_and_content_type_is_rejected():
    with pytest.raises(UploadValidationError):
        validate_upload("receipt.pdf", "application/pdf", b"%PDF-1.4", max_bytes=10_000)


def test_corrupt_image_bytes_are_rejected_despite_correct_extension():
    with pytest.raises(UploadValidationError):
        validate_upload("receipt.png", "image/png", b"not actually a png", max_bytes=10_000)


def test_renamed_non_image_file_is_rejected():
    """A .png extension alone must not be trusted — the bytes must decode."""
    text_disguised_as_png = b"just some plain text pretending to be an image"
    with pytest.raises(UploadValidationError):
        validate_upload("receipt.png", "image/png", text_disguised_as_png, max_bytes=10_000)


def test_heic_without_pillow_heif_installed_fails_gracefully(monkeypatch):
    monkeypatch.setitem(sys.modules, "pillow_heif", None)
    with pytest.raises(UploadValidationError, match="HEIC"):
        validate_upload("receipt.heic", "image/heic", b"irrelevant bytes", max_bytes=10_000)
