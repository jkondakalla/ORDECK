"""LazurOS API — Wake-on-LAN proxy for jkHUB compute node."""
import os
import socket
import struct
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx

COMPUTE_IP      = os.getenv("COMPUTE_NODE_IP", "192.168.1.100")
COMPUTE_MAC     = os.getenv("COMPUTE_NODE_MAC", "")
COMPUTE_PORT    = int(os.getenv("COMPUTE_API_PORT", "11434"))
WAKE_TIMEOUT    = int(os.getenv("WAKE_TIMEOUT_SECONDS", "45"))
LISTEN_PORT     = int(os.getenv("LAZUROS_LISTEN_PORT", "8080"))

app = FastAPI(title="LazurOS API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _send_magic_packet(mac: str) -> None:
    """Broadcast a Wake-on-LAN magic packet to the given MAC address."""
    mac_bytes = bytes.fromhex(mac.replace(":", "").replace("-", ""))
    if len(mac_bytes) != 6:
        raise ValueError(f"Invalid MAC address: {mac}")
    packet = b"\xff" * 6 + mac_bytes * 16
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        s.sendto(packet, ("<broadcast>", 9))


async def _is_compute_online() -> bool:
    """Return True if the compute node's inference API responds."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(f"http://{COMPUTE_IP}:{COMPUTE_PORT}/")
            return r.status_code < 500
    except Exception:
        return False


@app.get("/health")
async def health() -> dict:
    online = await _is_compute_online()
    return {
        "status": "ok",
        "service": "lazuros",
        "compute_online": online,
        "compute_ip": COMPUTE_IP,
    }


@app.post("/wake")
async def wake() -> dict:
    if not COMPUTE_MAC:
        raise HTTPException(status_code=503, detail="COMPUTE_NODE_MAC not configured")
    try:
        _send_magic_packet(COMPUTE_MAC)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Poll until online or timeout
    for _ in range(WAKE_TIMEOUT):
        await asyncio.sleep(1)
        if await _is_compute_online():
            return {"status": "online"}

    return {"status": "timeout", "detail": f"Node did not respond within {WAKE_TIMEOUT}s"}
