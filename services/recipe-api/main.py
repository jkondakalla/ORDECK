"""Recipe API -- jkHUB service skeleton.
Replace with real implementation. See docs for widget contract.

Requires env var: JWT_SECRET (same value as auth service)
"""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth import CurrentUser

SHELL_URL = os.getenv("SHELL_URL", "http://localhost:3000")

app = FastAPI(title="Recipe API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[SHELL_URL],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)


# ── Public endpoints (no auth) ───────────────────────────────────────────────

@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "recipe"}


@app.get("/status")
def status() -> dict:
    return {"online": False, "label": "NOT IMPLEMENTED"}


# ── Protected endpoints ───────────────────────────────────────────────────────

@app.get("/api/recipes/example")
def example_protected(_user: CurrentUser) -> dict:
    """Example protected route — replace with real Recipe endpoints."""
    return {"message": "authenticated"}
