# ORDECK · TrueNAS SCALE Deployment Guide

**Platform:** TrueNAS SCALE 25.04+  
**Last updated:** 2026-05-23  
**Status:** Infrastructure complete — fill placeholders below, then follow steps

---

## Overview

jkHUB runs as a set of Docker containers on TrueNAS SCALE. All containers share a single bridge network (`ordeck-net`) except LazurOS, which runs on the host network (required so it can send Wake-on-LAN UDP broadcast packets to the LAN).

**Public entry point:** nginx reverse proxy on ports 80/443  
**Internal services:** Each service runs in its own container on `ordeck-net`  
**LazurOS:** Host network only, reached by nginx via `host.docker.internal:8080`

---

## Step 0 — Prerequisites

1. TrueNAS SCALE 25.04+ with Docker Compose available (Apps → Manage → Docker)  
2. `git` installed on the TrueNAS shell  
3. A domain name pointing at your TrueNAS public IP (or local DNS override)  
4. SSL certificate for your domain (see Step 2)  
5. Google Cloud Console project with OAuth2 credentials (see Step 3)  

---

## Step 1 — Clone Repositories

Open the TrueNAS shell:

```bash
# Pick a location on a dataset (replace YOUR_POOL with your pool name):
mkdir -p /mnt/YOUR_POOL/hub && cd /mnt/YOUR_POOL/hub

git clone https://github.com/YOUR_GITHUB_USERNAME/ORDECK.git
git clone https://github.com/YOUR_GITHUB_USERNAME/BeigeBoard.git
git clone https://github.com/YOUR_GITHUB_USERNAME/LazurOS.git
git clone https://github.com/YOUR_GITHUB_USERNAME/OpenCourseFlow.git
```

> The ORDECK monorepo's Docker configs expect `BeigeBoard/` and `LazurOS/` to be siblings of `ORDECK/`.  
> Correct layout: `/mnt/YOUR_POOL/hub/ORDECK/`, `/mnt/YOUR_POOL/hub/BeigeBoard/`, etc.

---

## Step 2 — SSL Certificate

Place your certificate files at the paths referenced in `docker/nginx/docker-compose.yml`:

```
/mnt/YOUR_TRUENAS_POOL/ssl/YOUR_DOMAIN.crt
/mnt/YOUR_TRUENAS_POOL/ssl/YOUR_DOMAIN.key
```

**Option A — TrueNAS ACME (Let's Encrypt):**
1. TrueNAS UI → System → Certificates → Add → ACME Certificate  
2. After issuance, export: `openssl pkcs12 -in ...` or use the TrueNAS API to download  
3. Copy the `.crt` and `.key` to the paths above  

**Option B — Self-signed (local/dev only):**
```bash
openssl req -x509 -newkey rsa:4096 -keyout /mnt/YOUR_TRUENAS_POOL/ssl/YOUR_DOMAIN.key \
  -out /mnt/YOUR_TRUENAS_POOL/ssl/YOUR_DOMAIN.crt -days 365 -nodes \
  -subj "/CN=YOUR_DOMAIN"
```

---

## Step 3 — Google OAuth2 Setup

1. Go to https://console.cloud.google.com → **APIs & Services → Credentials**  
2. **Create OAuth 2.0 Client ID** → Web application  
3. Add Authorized redirect URIs:
   - `https://YOUR_DOMAIN/api/auth/google/callback` (for ORDECK login)
   - `https://YOUR_DOMAIN/api/beigeboard/api/auth/google/callback` (for BeigeBoard calendar)
4. Copy the **Client ID** and **Client Secret**

---

## Step 4 — Generate JWT Secret

All services share a single JWT secret. Generate one:

```bash
openssl rand -hex 64
```

Copy the output — you'll paste it into every `.env` file below.

---

## Step 5 — Generate LazurOS API Token

The plex-api, recipe-api, and BeigeBoard backend authenticate to LazurOS using a Bearer token. This token is validated by LazurOS using the shared JWT_SECRET.

Generate a token (or use the ORDECK Settings UI once the stack is running):

```bash
# Quick one-liner using node:
node -e "const jwt=require('jsonwebtoken'); console.log(jwt.sign({sub:'service',iss:'ordeck-auth'},process.env.JWT_SECRET))"
# OR: use openssl rand -hex 32 as a simple static token and handle validation accordingly
```

> **Recommended:** Start the stack first (Step 8), then use the Settings UI → API Tokens tab  
> to generate a proper token. Come back and fill in `LAZUROS_TOKEN` in all `.env` files.

---

## Step 6 — Create Docker Network

Run once. All containers share this network:

```bash
docker network create ordeck-net
```

---

## Step 7 — Fill in .env Files

For each service below, copy `.env.example` → `.env` and fill in the placeholders.

### 7a — LazurOS (`ORDECK/docker/lazuros/.env`)

```bash
cd /mnt/YOUR_POOL/hub/ORDECK/docker/lazuros
cp .env.example .env
nano .env
```

Fill in:
| Variable | Value |
|----------|-------|
| `JWT_SECRET` | (from Step 4) |
| `SHELL_URL` | `https://YOUR_DOMAIN` |
| `ALLOWED_EMAILS` | Your Google email, e.g. `you@gmail.com` (empty = any) |
| `COMPUTE_NODE_IP` | IP of your Linux desktop, e.g. `192.168.1.50` |
| `COMPUTE_NODE_MAC` | MAC of the desktop NIC, e.g. `AA:BB:CC:DD:EE:FF` |
| `COMPUTE_API_PORT` | `11434` (Ollama default) |
| `LAZUROS_LISTEN_PORT` | `8080` |
| `WAKE_TIMEOUT_SECONDS` | `45` |

**How to find the MAC address** (run on your Linux desktop):
```bash
ip link show | grep ether
# or:
cat /sys/class/net/YOUR_NIC/address
```

**Enable Wake-on-LAN on the desktop:**
```bash
sudo ethtool -s YOUR_NIC wol g
# Make permanent: add to /etc/systemd/system/wol.service or use NetworkManager
```

---

### 7b — Auth API (`ORDECK/docker/auth/.env`)

```bash
cd /mnt/YOUR_POOL/hub/ORDECK/docker/auth
cp .env.example .env
nano .env
```

| Variable | Value |
|----------|-------|
| `PORT` | `8000` |
| `JWT_SECRET` | (from Step 4) |
| `GOOGLE_CLIENT_ID` | (from Step 3) |
| `GOOGLE_CLIENT_SECRET` | (from Step 3) |
| `SHELL_URL` | `https://YOUR_DOMAIN` |
| `AUTH_URL` | `https://YOUR_DOMAIN/api/auth` |
| `ALLOWED_EMAILS` | `you@gmail.com` |
| `DB_PATH` | `/data/auth.db` |

---

### 7c — BeigeBoard (`ORDECK/docker/beigeboard/.env`)

```bash
cd /mnt/YOUR_POOL/hub/ORDECK/docker/beigeboard
cp .env.example .env
nano .env
```

| Variable | Value |
|----------|-------|
| `JWT_SECRET` | (from Step 4) |
| `SHELL_URL` | `https://YOUR_DOMAIN` |
| `GOOGLE_CLIENT_ID` | (from Step 3) |
| `GOOGLE_CLIENT_SECRET` | (from Step 3) |
| `GOOGLE_REDIRECT_URI` | `https://YOUR_DOMAIN/api/beigeboard/api/auth/google/callback` |
| `MICROSOFT_CLIENT_ID` | (from Azure portal, optional) |
| `MICROSOFT_CLIENT_SECRET` | (from Azure portal, optional) |
| `MICROSOFT_REDIRECT_URI` | `https://YOUR_DOMAIN/api/beigeboard/api/auth/outlook/callback` |
| `LAZUROS_URL` | `http://host.docker.internal:8080` |
| `LAZUROS_TOKEN` | (from Step 5) |
| `LAZUROS_DEFAULT_MODEL` | `llama3.2` |

**Volume path:** BeigeBoard SQLite database stores at `/mnt/Luna/BeigeBoard-Data/`.  
Create the directory if it doesn't exist:
```bash
mkdir -p /mnt/Luna/BeigeBoard-Data
```
Or change the path in `docker-compose.yml` to match your pool layout.

---

### 7d — Plex API (`ORDECK/docker/plex/.env`)

```bash
cd /mnt/YOUR_POOL/hub/ORDECK/docker/plex
cp .env.example .env
nano .env
```

| Variable | Value |
|----------|-------|
| `JWT_SECRET` | (from Step 4) |
| `SHELL_URL` | `https://YOUR_DOMAIN` |
| `LAZUROS_URL` | `http://host.docker.internal:8080` |
| `LAZUROS_TOKEN` | (from Step 5) |
| `LAZUROS_DEFAULT_MODEL` | `llama3.2` |

---

### 7e — Recipe API (`ORDECK/docker/recipe/.env`)

```bash
cd /mnt/YOUR_POOL/hub/ORDECK/docker/recipe
cp .env.example .env
nano .env
```

Same variables as Plex API above.

---

### 7f — Nginx (`ORDECK/docker/nginx/nginx.conf`)

Replace `YOUR_DOMAIN` with your actual domain:

```bash
sed -i 's/YOUR_DOMAIN/hub.yourdomain.com/g' \
  /mnt/YOUR_POOL/hub/ORDECK/docker/nginx/nginx.conf \
  /mnt/YOUR_POOL/hub/ORDECK/docker/nginx/docker-compose.yml
```

Replace `YOUR_TRUENAS_POOL` with your pool name:

```bash
sed -i 's/YOUR_TRUENAS_POOL/YOUR_ACTUAL_POOL_NAME/g' \
  /mnt/YOUR_POOL/hub/ORDECK/docker/nginx/docker-compose.yml
```

---

## Step 8 — Start Services (in order)

```bash
BASE=/mnt/YOUR_POOL/hub/ORDECK/docker

# 1. LazurOS API (host network, starts WoL proxy on port 8080)
cd $BASE/../../../LazurOS
# OR from ORDECK: cd $BASE/lazuros
docker compose up -d lazuros-api
docker compose logs -f lazuros-api   # should show "Uvicorn running on http://0.0.0.0:8080"
# Ctrl-C to exit logs

# 2. ORDECK Auth API
cd $BASE/auth
docker compose up -d
docker compose logs auth   # should show "Server running on port 8000"

# 3. BeigeBoard (plugin + API)
cd $BASE/beigeboard
docker compose up -d

# 4. Plex (plugin + API)
cd $BASE/plex
docker compose up -d

# 5. Recipe (plugin + API)
cd $BASE/recipe
docker compose up -d

# 6. LazurOS plugin (static React widget)
cd $BASE/lazuros
docker compose up -d lazuros-plugin

# 7. Shell
cd $BASE/shell
docker compose up -d

# 8. Nginx (last — all services must be up first)
cd $BASE/nginx
docker compose up -d
```

---

## Step 9 — Verify

```bash
# Check all containers are running:
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Expected containers:
#   ordeck-nginx
#   ordeck-shell
#   ordeck-auth
#   ordeck-plex-api
#   ordeck-plex-plugin
#   ordeck-recipe-api
#   ordeck-recipe-plugin
#   ordeck-beigeboard-api
#   ordeck-beigeboard-plugin
#   ordeck-lazuros-api        (host network — won't show ports in docker ps)
#   ordeck-lazuros-plugin

# Test LazurOS directly (from TrueNAS shell):
curl http://localhost:8080/health
# Expected: {"lazuros":"ok","compute_node":"sleeping",...}

# Test via nginx:
curl -k https://YOUR_DOMAIN/api/lazuros/health

# Test shell:
curl -k https://YOUR_DOMAIN/ -I
# Expected: 200 OK
```

---

## Step 10 — TrueNAS Firewall / Port Forwarding

If accessing from outside your LAN, configure port forwarding on your router:

| External Port | Internal (TrueNAS IP) | Protocol |
|--------------|----------------------|----------|
| 443 | YOUR_TRUENAS_IP:443 | TCP |
| 80 | YOUR_TRUENAS_IP:80 | TCP (redirects to 443) |

LazurOS and other internal services are NOT exposed externally — only nginx ports 80/443.

---

## Network Architecture Diagram

```
Internet / LAN Browser
        │
        │ HTTPS :443
        ▼
┌─────────────────────────────────────────────────────────────────┐
│  TrueNAS SCALE host                                             │
│                                                                  │
│  ┌─── ordeck-net (Docker bridge network) ──────────────────┐   │
│  │                                                           │   │
│  │  ordeck-nginx :80/:443                                    │   │
│  │    ├─ /api/auth/      → ordeck-auth:8000                 │   │
│  │    ├─ /api/plex/      → ordeck-plex-api:8001             │   │
│  │    ├─ /api/recipes/   → ordeck-recipe-api:8002           │   │
│  │    ├─ /api/beigeboard/→ ordeck-beigeboard-api:8003       │   │
│  │    ├─ /api/lazuros/   → host.docker.internal:8080 ──┐   │   │
│  │    ├─ /plugins/*/     → ordeck-*-plugin:80           │   │   │
│  │    └─ /              → ordeck-shell:80               │   │   │
│  │                                                       │   │   │
│  │  ordeck-shell:80                                      │   │   │
│  │  ordeck-auth:8000                                     │   │   │
│  │  ordeck-plex-api:8001                                 │   │   │
│  │  ordeck-recipe-api:8002                               │   │   │
│  │  ordeck-beigeboard-api:8003                           │   │   │
│  │  ordeck-*-plugin:80 (×4)                              │   │   │
│  │                                                       │   │   │
│  └───────────────────────────────────────────────────────┘   │   │
│                                                               │   │
│  ┌─── Host network ──────────────────────────────────────┐   │   │
│  │  ordeck-lazuros-api :8080 ◄───────────────────────────┘   │   │
│  │    (WoL broadcasts to LAN)                                 │   │
│  └───────────────────────────────────────────────────────┘   │   │
│                                                                  │
│  ┌─── Data volumes ──────────────────────────────────────────┐ │
│  │  /mnt/YOUR_POOL/auth-data/      ← auth.db                 │ │
│  │  /mnt/YOUR_POOL/nginx-logs/     ← access.log, error.log   │ │
│  │  /mnt/YOUR_POOL/ssl/            ← TLS cert + key          │ │
│  │  /mnt/Luna/BeigeBoard-Data/     ← beigeBoard.db           │ │
│  │  /mnt/truenas/plex-data/        ← plex state              │ │
│  │  /mnt/truenas/recipe-data/      ← recipe state            │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                          │ WoL UDP broadcast
                          ▼
              Linux desktop (compute node)
              Running Ollama on :11434
```

---

## Troubleshooting

### LazurOS unreachable from nginx (502 Bad Gateway on /api/lazuros/)
- Confirm LazurOS is running: `curl http://localhost:8080/health`
- Confirm `extra_hosts: ["host.docker.internal:host-gateway"]` is in nginx docker-compose
- Check: `docker inspect ordeck-nginx | grep -A5 HostConfig`

### JWT auth failing (401 on API calls)
- Confirm all `.env` files have the **same** `JWT_SECRET` value
- Regenerate if in doubt (Step 4) and restart all services

### Wake-on-LAN not working
- Desktop NIC must have WoL enabled in BIOS and via `ethtool`
- LazurOS must run on `network_mode: host` — check `docker inspect ordeck-lazuros-api`
- Test manually: `wakeonlan XX:XX:XX:XX:XX:XX` from TrueNAS shell
- Verify `COMPUTE_NODE_MAC` is the correct NIC's MAC (some desktops have multiple NICs)

### OAuth redirect mismatch
- Google Cloud Console redirect URIs must match exactly what's in `.env`
- Include both the ORDECK auth callback AND the BeigeBoard calendar callback

### Module Federation widget not loading
- Check browser console for `remoteEntry.js` load errors
- Confirm plugin container is running: `docker ps | grep plugin`
- Verify nginx `/plugins/*` location blocks point to correct container names

---

## Updating

```bash
cd /mnt/YOUR_POOL/hub/ORDECK
git pull

# Rebuild and restart a specific service:
cd docker/plex && docker compose up -d --build

# Rebuild all:
for dir in auth beigeboard plex recipe lazuros shell; do
  cd /mnt/YOUR_POOL/hub/ORDECK/docker/$dir
  docker compose up -d --build
done
cd /mnt/YOUR_POOL/hub/ORDECK/docker/nginx && docker compose up -d
```

---

## Environment Variable Quick Reference

All services that communicate internally must share the same `JWT_SECRET`.

| Service | Container | Key Env Vars |
|---------|-----------|--------------|
| LazurOS API | `ordeck-lazuros-api` | JWT_SECRET, SHELL_URL, COMPUTE_NODE_IP, COMPUTE_NODE_MAC |
| Auth API | `ordeck-auth` | JWT_SECRET, GOOGLE_CLIENT_ID/SECRET, ALLOWED_EMAILS |
| BeigeBoard API | `ordeck-beigeboard-api` | JWT_SECRET, GOOGLE_*/MICROSOFT_*, LAZUROS_URL, LAZUROS_TOKEN |
| Plex API | `ordeck-plex-api` | JWT_SECRET, LAZUROS_URL, LAZUROS_TOKEN |
| Recipe API | `ordeck-recipe-api` | JWT_SECRET, LAZUROS_URL, LAZUROS_TOKEN |
| Nginx | `ordeck-nginx` | (none — reads nginx.conf; needs YOUR_DOMAIN substituted) |

`LAZUROS_URL` for all Docker services = `http://host.docker.internal:8080`  
`LAZUROS_URL` for local dev = `http://localhost:8080`
