# jkHUB · Standalone Subdomain Deployment Guide

**Platform:** TrueNAS SCALE 25.04+  
**Last updated:** 2026-05-25  
**Status:** Infrastructure complete and committed — fill secrets, then follow steps

This guide covers the **standalone** deployment:
- `https://beigeboard.jkos.net` — BeigeBoard calendar + task manager
- `https://sylibos.jkos.net` — SylibOS MIT OCW course scheduler

For the unified ORDECK portal (all apps as widgets at one domain), see `ORDECK/docker/TRUENAS_SETUP.md`.

---

## Confirmed environment

| Item | Value |
|------|-------|
| TrueNAS pool | `Luna` |
| Domain registrar | Cloudflare |
| Subdomains | `beigeboard.jkos.net`, `sylibos.jkos.net` |
| SSL cert | Let's Encrypt SAN cert (covers both subdomains) |
| Cert path | `/mnt/Luna/ssl/live/beigeboard.jkos.net/` |
| BeigeBoard data | `/mnt/Luna/BeigeBoard-Data/` (already created) |
| SylibOS data | `/mnt/Luna/sylibos-data/` |
| GitHub org | `github.com/jkondakalla` |

---

## Step 0 — Prerequisites

1. TrueNAS SCALE 25.04+ with Docker Compose available (Apps → Manage → Docker)
2. Both subdomains pointed at your TrueNAS IP in Cloudflare DNS
3. Certbot already ran — `/mnt/Luna/ssl/live/beigeboard.jkos.net/fullchain.pem` exists
4. Data directories exist:
   ```bash
   ls /mnt/Luna/BeigeBoard-Data/      # already created
   mkdir -p /mnt/Luna/sylibos-data    # create this
   mkdir -p /mnt/Luna/nginx-standalone-logs
   ```

---

## Step 1 — Clone repositories

```bash
mkdir -p /mnt/Luna/hub && cd /mnt/Luna/hub

git clone https://github.com/jkondakalla/ORDECK.git
git clone https://github.com/jkondakalla/BeigeBoard.git
git clone https://github.com/jkondakalla/LazurOS.git
git clone https://github.com/jkondakalla/OpenCourseFlow.git
```

Expected layout:
```
/mnt/Luna/hub/
├── ORDECK/
├── BeigeBoard/
├── LazurOS/
└── OpenCourseFlow/    ← SylibOS lives here on disk
```

---

## Step 2 — Generate shared secrets

All services that share JWT sessions need the same secret.

```bash
# JWT secret (shared across BeigeBoard, SylibOS, and LazurOS)
openssl rand -hex 64
# Save this output — paste into every .env file below as JWT_SECRET
```

---

## Step 3 — Google OAuth2 (for BeigeBoard calendar sync)

1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID → Web application
3. Add **Authorized redirect URIs**:
   - `https://beigeboard.jkos.net/api/auth/google/callback`
4. Copy the **Client ID** and **Client Secret**

---

## Step 4 — LazurOS setup

BeigeBoard's AI task parse calls LazurOS. Set up LazurOS first.

```bash
cd /mnt/Luna/hub/LazurOS
cp .env.example .env
nano .env
```

| Variable | Value |
|----------|-------|
| `JWT_SECRET` | (from Step 2) |
| `SHELL_URL` | `https://beigeboard.jkos.net` |
| `ALLOWED_EMAILS` | `jaaggruthkondakalla@gmail.com` |
| `COMPUTE_NODE_IP` | IP of your Linux desktop |
| `COMPUTE_NODE_MAC` | MAC of the desktop NIC |
| `COMPUTE_API_PORT` | `11434` |
| `LAZUROS_LISTEN_PORT` | `8080` |
| `WAKE_TIMEOUT_SECONDS` | `45` |

Find MAC address (run on desktop):
```bash
ip link show | grep ether
```

Enable Wake-on-LAN on desktop:
```bash
sudo ethtool -s YOUR_NIC wol g
```

Start LazurOS:
```bash
cd /mnt/Luna/hub/LazurOS
docker compose up -d
# Verify: curl http://localhost:8080/health
```

---

## Step 5 — Generate LazurOS API token

BeigeBoard and SylibOS backend both call LazurOS with a Bearer token.

```bash
# With LazurOS running:
node -e "const jwt=require('jsonwebtoken'); \
  console.log(jwt.sign({sub:'service',iss:'ordeck-auth'}, 'YOUR_JWT_SECRET_HERE'))"
```

Save this token as `LAZUROS_TOKEN` in both `.env` files below.

---

## Step 6 — BeigeBoard

```bash
cd /mnt/Luna/hub/BeigeBoard
cp .env.example .env
nano .env
```

Fill in:

| Variable | Value |
|----------|-------|
| `SHELL_URL` | `https://beigeboard.jkos.net` |
| `JWT_SECRET` | (from Step 2) |
| `GOOGLE_CLIENT_ID` | (from Step 3) |
| `GOOGLE_CLIENT_SECRET` | (from Step 3) |
| `GOOGLE_REDIRECT_URI` | `https://beigeboard.jkos.net/api/auth/google/callback` |
| `MICROSOFT_CLIENT_ID` | (Azure portal — optional, for Outlook sync) |
| `MICROSOFT_CLIENT_SECRET` | (Azure portal — optional) |
| `MICROSOFT_REDIRECT_URI` | `https://beigeboard.jkos.net/api/auth/outlook/callback` |
| `LAZUROS_URL` | `http://host.docker.internal:8080` |
| `LAZUROS_TOKEN` | (from Step 5) |
| `LAZUROS_DEFAULT_MODEL` | `llama3.2` |

Build and start:
```bash
docker compose up -d --build
# Verify: curl http://localhost:3001/health  (or check docker logs bb-app)
```

---

## Step 7 — SylibOS

```bash
cd /mnt/Luna/hub/OpenCourseFlow
cp .env.example .env
nano .env
```

Fill in:

| Variable | Value |
|----------|-------|
| `JWT_SECRET` | (from Step 2, or leave empty for open LAN access) |
| `AI_PROVIDER` | `lazuros` |
| `LAZUROS_URL` | `http://host.docker.internal:8080` |
| `LAZUROS_TOKEN` | (from Step 5) |
| `OLLAMA_MODEL` | `llama3.2` |
| `NIGHTLY_CRON` | `0 2 * * *` |

Build and start:
```bash
mkdir -p /mnt/Luna/sylibos-data
docker compose up -d --build
# Verify: curl http://localhost:8004/health
```

After the app is live, open `https://sylibos.jkos.net`, go to **Settings**, and set:
- AI Provider: `lazuros`
- LazurOS URL: `https://beigeboard.jkos.net/api/lazuros` (if routing through BB's nginx)
  OR `http://YOUR_TRUENAS_IP:8080` (direct, LAN only)
- API token: (the LAZUROS_TOKEN value)
- Backend API URL: `https://sylibos.jkos.net`

---

## Step 8 — Standalone nginx

```bash
cd /mnt/Luna/hub/ORDECK/docker/standalone-nginx
mkdir -p /mnt/Luna/nginx-standalone-logs
docker compose up -d
```

The compose file mounts `/mnt/Luna/ssl → /etc/letsencrypt` and joins both `bb-net` and `sylibos-net`. It is pre-configured for the correct cert paths and subdomain names — no edits needed.

---

## Step 9 — Verify

```bash
# All containers running:
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
# Expected: bb-app, sylibos-frontend, sylibos-api, standalone-nginx, ordeck-lazuros-api (host)

# Health checks:
curl -s https://beigeboard.jkos.net/health | jq .
# → {"status":"ok","service":"beigeboard"}

curl -s https://sylibos.jkos.net/health | jq .
# → {"status":"ok","service":"opencourseflow-api"}

# BeigeBoard app loads:
curl -s https://beigeboard.jkos.net/ -o /dev/null -w "%{http_code}"
# → 200

# SylibOS app loads:
curl -s https://sylibos.jkos.net/ -o /dev/null -w "%{http_code}"
# → 200
```

---

## Network Architecture

```
Cloudflare DNS → TrueNAS SCALE host :80/:443
                          │
                 ┌────────▼────────┐
                 │ standalone-nginx │
                 │ (nginx:alpine)   │
                 └───┬─────────┬───┘
                     │         │
           beigeboard │         │ sylibos
            .jkos.net │         │ .jkos.net
                     │         │
          ┌──────────▼──┐  ┌───▼──────────────┐
          │   bb-net    │  │   sylibos-net     │
          │             │  │                   │
          │  bb-app     │  │  sylibos-frontend │
          │  :3001      │  │  :80 (nginx SPA)  │
          │  (Express)  │  │                   │
          └──────────┬──┘  │  sylibos-api      │
                     │     │  :8004 (Node.js)  │
                     │     └───────┬───────────┘
                     │             │
                     └──────┬──────┘
                            │ host.docker.internal:8080
                            ▼
                   ┌────────────────┐
                   │  LazurOS API   │
                   │  host network  │
                   │  :8080         │
                   │  (FastAPI)     │
                   └────────┬───────┘
                            │ WoL + Ollama proxy
                            ▼
                 Linux desktop :11434 (Ollama)

SSL: /mnt/Luna/ssl/live/beigeboard.jkos.net/{fullchain,privkey}.pem
     SAN cert — covers both beigeboard.jkos.net and sylibos.jkos.net

Data volumes:
  /mnt/Luna/BeigeBoard-Data/       ← beigeBoard.db
  /mnt/Luna/sylibos-data/          ← sylibos.db
  /mnt/Luna/nginx-standalone-logs/ ← access.log, error.log
  /mnt/Luna/ssl/                   ← Let's Encrypt certs (read-only mount)
```

---

## Updating

```bash
BASE=/mnt/Luna/hub

# Pull latest code
git -C $BASE/BeigeBoard pull
git -C $BASE/OpenCourseFlow pull
git -C $BASE/ORDECK pull

# Rebuild individual services
cd $BASE/BeigeBoard     && docker compose up -d --build
cd $BASE/OpenCourseFlow && docker compose up -d --build

# Reload nginx (config-only change, no rebuild needed)
docker exec standalone-nginx nginx -s reload

# Restart nginx container (if compose file changed)
cd $BASE/ORDECK/docker/standalone-nginx && docker compose up -d
```

---

## Troubleshooting

### 502 Bad Gateway on beigeboard.jkos.net
- `docker logs bb-app` — check Express started on port 3001
- `docker network inspect bb-net` — confirm `bb-app` and `standalone-nginx` are both listed

### 502 on sylibos.jkos.net/api/
- `docker logs sylibos-api` — check Node.js started on port 8004
- `docker network inspect sylibos-net` — confirm `sylibos-api` and `standalone-nginx` present

### SSL cert errors
- Cert is mounted read-only from `/mnt/Luna/ssl` → `/etc/letsencrypt`
- Confirm file exists: `ls /mnt/Luna/ssl/live/beigeboard.jkos.net/fullchain.pem`
- Check nginx can read it: `docker exec standalone-nginx cat /etc/letsencrypt/live/beigeboard.jkos.net/fullchain.pem | head -1`

### LazurOS not reachable from containers
- Confirm `extra_hosts: host.docker.internal:host-gateway` is in both app composes ✓
- `curl http://localhost:8080/health` from TrueNAS shell
- `docker exec bb-app curl http://host.docker.internal:8080/health`

### Nightly AI job not running (SylibOS)
- `docker logs sylibos-api | grep nightly`
- Check `AI_PROVIDER` in `.env` — must be `lazuros` or `ollama` (not `none`)
- Trigger manually: `curl -X POST https://sylibos.jkos.net/api/admin/run-nightly`

### JWT auth failing (401)
- All services sharing sessions must have the same `JWT_SECRET` in their `.env`
- BeigeBoard and SylibOS share the same JWT secret as LazurOS
