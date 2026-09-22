"""Shared-secret authorization for receipt endpoints.

This service never sees a Supabase session — the Next.js server authenticates
the end user itself (and checks they own the trip) before ever calling here,
using a bearer token known only to that server. That keeps this service
DB-agnostic while ensuring it's unreachable by an untrusted client directly.
"""

import hmac

from fastapi import Header

from app.config import get_settings
from app.errors import ServiceError


async def require_service_token(authorization: str | None = Header(default=None)) -> None:
    settings = get_settings()
    expected = settings.service_auth_token
    if not expected:
        raise ServiceError("service_unconfigured", 503, "Service not configured")
    if not authorization or not authorization.startswith("Bearer "):
        raise ServiceError("unauthorized", 401, "Missing bearer token")
    token = authorization.removeprefix("Bearer ")
    if not hmac.compare_digest(token, expected):
        raise ServiceError("unauthorized", 401, "Invalid token")
