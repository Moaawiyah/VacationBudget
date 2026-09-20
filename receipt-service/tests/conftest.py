"""Test-wide setup: env vars must be set before app.config.get_settings() (and
anything that imports app.main) is ever called."""

import os

os.environ.setdefault("SERVICE_AUTH_TOKEN", "test-token")
os.environ.setdefault("GROQ_API_KEY", "test-key")
os.environ.setdefault("GROQ_MODEL", "llama-3.3-70b-versatile")
