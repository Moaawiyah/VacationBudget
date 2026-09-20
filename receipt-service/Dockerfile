# syntax=docker/dockerfile:1
FROM python:3.12-slim

# libgl1/libglib2.0-0: required by opencv-python-headless's native libs.
# tesseract-ocr + language packs: the fallback OCR engine (see app/ocr/engine.py) —
# it's what actually covers Hebrew, since PaddleOCR has no Hebrew-script model.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 \
    tesseract-ocr tesseract-ocr-eng tesseract-ocr-ita tesseract-ocr-deu \
    tesseract-ocr-fra tesseract-ocr-ara tesseract-ocr-heb \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY app ./app
RUN uv sync --frozen --no-dev

EXPOSE 8000
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
