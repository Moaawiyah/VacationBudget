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

# Pinned to the uv version the lockfile was created with, so the image build
# stays reproducible instead of tracking whatever "latest" ships that day.
COPY --from=ghcr.io/astral-sh/uv:0.11.10 /uv /uvx /usr/local/bin/

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# Pre-download every PaddleOCR language model into the image at build time,
# before COPY app: the container's filesystem is ephemeral, so without this
# the first request after every deploy pays for a multi-hundred-MB download
# from paddleocr.bj.bcebos.com — easily blowing past the client's request
# timeout. Placing it before `COPY app ./app` means an app code change
# (frequent) never invalidates this layer — only a dependency change
# (rare) does. See app/ocr/languages.py for the language list this must match.
RUN uv run python -c "\
from paddleocr import PaddleOCR; \
[PaddleOCR(lang=lang, use_angle_cls=True, show_log=False) for lang in ('en', 'it', 'german', 'french', 'ar')]"

COPY app ./app
RUN uv sync --frozen --no-dev

# Run as an unprivileged user, mirroring the root Dockerfile's nextjs:1001.
# HOME and the uv cache point at /tmp (the only guaranteed-writable dir for
# this user); UV_NO_SYNC stops `uv run` from ever trying to rewrite the
# already-synced /app/.venv, which is root-owned from the build stages.
RUN groupadd --system --gid 1001 receipts \
    && useradd --system --uid 1001 --gid receipts --home-dir /nonexistent receipts
ENV HOME=/tmp UV_CACHE_DIR=/tmp/uv-cache UV_NO_SYNC=1
USER 1001:1001

EXPOSE 8000
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
