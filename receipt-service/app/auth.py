"""Shared-secret authorization for receipt endpoints.

This service never sees a Supabase session — the Next.js server authenticates
the end user itself (and checks they own the trip) before ever calling here,
using a bearer token known only to that server. That keeps this service
DB-agnostic while ensuring it's unreachable by an untrusted client directly.
"""

import hmac

from fastapi import Header, HTTPException, status

from app.config import get_settings


async def require_service_token(authorization: str | None = Header(default=None)) -> None:
    settings = get_settings()
    expected = settings.service_auth_token
    if not expected:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Service not configured")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    token = authorization.removeprefix("Bearer ")
    if not hmac.compare_digest(token, expected):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
