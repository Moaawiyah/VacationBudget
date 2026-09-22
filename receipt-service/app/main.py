"""FastAPI app: CORS, routes, structured logging, and a health check."""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.receipts import router as receipts_router
from app.config import get_settings
from app.errors import ServiceError
from app.logging_config import configure_logging

logger = logging.getLogger(__name__)

settings = get_settings()
configure_logging(settings.log_level)

app = FastAPI(title="Receipt Intelligence Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origin_list,
    allow_credentials=False,
    allow_methods=["POST"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(receipts_router)


def _error(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"code": code, "message": message})


@app.exception_handler(ServiceError)
async def service_error(_: Request, exc: ServiceError) -> JSONResponse:
    return _error(exc.status, exc.code, exc.message)


@app.exception_handler(RequestValidationError)
async def invalid_request(_: Request, exc: RequestValidationError) -> JSONResponse:
    # FastAPI's default 422 echoes the offending input back; name the fields
    # instead, so a malformed request never reflects its own payload.
    fields = sorted({".".join(str(p) for p in e["loc"][1:]) for e in exc.errors()})
    return _error(422, "invalid_request", f"Invalid fields: {', '.join(fields)}")


@app.exception_handler(Exception)
async def unexpected(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error")
    return _error(500, "internal_error", "Internal error")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
