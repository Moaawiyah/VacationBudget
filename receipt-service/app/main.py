"""FastAPI app: CORS, routes, structured logging, and a health check."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.receipts import router as receipts_router
from app.config import get_settings
from app.logging_config import configure_logging

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


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
