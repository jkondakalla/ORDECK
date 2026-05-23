"""Plex API -- jkHUB service skeleton.
Replace with real implementation. See docs for widget contract.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Plex API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "plex"}


@app.get("/status")
def status() -> dict:
    return {"online": False, "label": "NOT IMPLEMENTED"}
