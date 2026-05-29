# jkHUB · Standalone Subdomain Deployment Guide

**Platform:** TrueNAS SCALE 25.04+  
**Last updated:** 2026-05-29  
**Status:** Infrastructure complete and committed — fill secrets, then follow steps

This guide covers the **standalone** deployment:
- `https://auth.jkos.net`       — jkOS Auth (SSO, deploy first)
- `https://beigeboard.jkos.net` — BeigeBoard calendar + task manager
- `https://sylibos.jkos.net`    — SylibOS MIT OCW course scheduler

For the unified ORDECK portal (all apps as widgets at one domain), see `ORDECK/docker/TRUENAS_SETUP.md`.

---

## Confirmed environment

| Item | Value |
|------|-------|
| TrueNAS pool | `Luna` |
| Code location | `/mnt/Luna/Webhost/jkOS/` (Webhost dataset) |
| Data volumes | `/mnt/Luna/Backends/` (Backends dataset) |
| Domain registrar | Cloudflare |
| Subdomains | `auth.jkos.net`, `beigeboard.jkos.net`, `sylibos.jkos.net` |
| SSL cert | Cloudflare Origin Certificate — wildcard `*.jkos.net` + apex `jkos.net`, 15-year validity |
| Cert path | `/mnt/Luna/Backends/ssl/live/jkos.net/fullchain.pem` |
| BeigeBoard data | `/mnt/Luna/Backends/BeigeBoard-Data/` (already exists) |
| SylibOS data | `/mnt/Luna/Backends/SylibOS-Data/` (already exists) |
| jkOS Auth data | `/mnt/Luna/Backends/jkos-auth-data/` (create in Step 0) |

---

## Step 0 — Prerequisites

1. TrueNAS SCALE 25.04+ with Docker Compose available (Apps → Manage → Docker)
2. All subdomains pointed at your TrueNAS IP in Cloudflare DNS
3. Cloudflare Origin Certificate placed at the correct path (see Step 2)
4. Missing data directories created (run on TrueNAS shell):

```bash
mkdir -p /mnt/Luna/Backends/jkos-auth-data
mkdir -p /mnt/Luna/Backends/ssl/live/jkos.net
mkdir -p /mnt/Luna/Backends/nginx-standalone-logs
mkdir -p /mnt/Luna/Backends/nginx-ordeck-logs
```

---

## Step 1 — Code location

Code already lives on TrueNAS at:

```
/mnt/Luna/Webhost/jkOS/
├── SylibOS/
├── BeigeBoard/
├── LazurOS/
└── ORDECK/
```

To pull latest from this dev machine or GitHub:

```bash
BASE=/mnt/Luna/Webhost/jkOS
git -C $BASE/BeigeBoard pull
git -C $BASE/SylibOS pull
git -C $BASE/LazurOS pull
git -C $BASE/ORDECK pull
```

---

## Step 2 — SSL Certificate

Place the Cloudflare Origin Certificate files at:

```
/mnt/Luna/Backends/ssl/live/jkos.net/fullchain.pem
/mnt/Luna/Backends/ssl/live/jkos.net/privkey.pem
```

The wildcard cert (`*.jkos.net`) covers `auth.jkos.net`, `beigeboard.jkos.net`, and
`sylibos.jkos.net` automatically — no per-subdomain cert needed.

The standalone nginx mounts `/mnt/Luna/Backends/ssl → /etc/letsencrypt` (read-only).
The nginx config reads certs from `/etc/letsencrypt/live/jkos.net/{fullchain,privkey}.pem`.
No certbot or renewal cron needed for Cloudflare Origin certs (15-year validity).

---

## Step 3 — Deploy jkOS Auth (first — all other services depend on it)

jkOS Auth is the SSO service. It issues `jkos_token` RS256 JWT cookies scoped to `.jkos.net`.
All backend services validate these locally — no round-trip to the auth server per request.

```bash
cd /mnt/Luna/Webhost/jkOS/jkos-auth
cp .env.example .env && nano .env
```

Fill in:

| Variable | Value |
|----------|-------|
| `PORT` | `3100` |
| `DB_PATH` | `/data/jkos-auth.db` |
| `SHELL_URL` | `https://auth.jkos.net` |
| `JWT_ISSUER` | `jkos-auth` |
| `ADMIN_SEED_EMAIL` | `jaaggruthkondakalla@gmail.com` |
| `ADMIN_SEED_PASSWORD` | (strong password — first-run seed only) |
| `GOOGLE_CLIENT_ID` | (from Google Cloud Console) |
| `GOOGLE_CLIENT_SECRET` | (from Google Cloud Console) |
| `GOOGLE_REDIRECT_URI` | `https://auth.jkos.net/auth/google/callback` |

The RSA keypair is auto-generated on first boot. After first start, get the public key:

```bash
docker compose up -d --build
docker logs jkos-auth 2>&1 | grep PUBLIC_KEY
# OR:
cat /mnt/Luna/Backends/jkos-auth-data/jkos-auth.db   # public key is stored in DB, also in .env after init
```

**After generating the keypair**, add `JKOS_AUTH_PUBLIC_KEY=` to the `.env` files for every
other service (BeigeBoard, SylibOS). Copy the full RS256 public key value from `jkos-auth/.env`.

---

## Step 4 — LazurOS setup

BeigeBoard and SylibOS call LazurOS for AI tasks. Set up LazurOS first.

```bash
cd /mnt/Luna/Webhost/jkOS/LazurOS
cp .env.example .env && nano .env
```

| Variable | Value |
|----------|-------|
| `LAZUROS_TOKEN` | (generate: `openssl rand -hex 32`) |
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
cd /mnt/Luna/Webhost/jkOS/LazurOS
docker compose up -d
curl http://localhost:8080/health
```

Save the `LAZUROS_TOKEN` value — paste it into both BeigeBoard and SylibOS `.env` files as `LAZUROS_TOKEN`.

---

## Step 5 — BeigeBoard

```bash
cd /mnt/Luna/Webhost/jkOS/BeigeBoard
cp .env.example .env && nano .env
```

| Variable | Value |
|----------|-------|
| `JKOS_AUTH_PUBLIC_KEY` | (RS256 public key from Step 3) |
| `SHELL_URL` | `https://beigeboard.jkos.net` |
| `GOOGLE_CLIENT_ID` | (from Google Cloud Console — for calendar sync) |
| `GOOGLE_CLIENT_SECRET` | (from Google Cloud Console) |
| `GOOGLE_REDIRECT_URI` | `https://beigeboard.jkos.net/api/auth/google/callback` |
| `LAZUROS_URL` | `http://host.docker.internal:8080` |
| `LAZUROS_TOKEN` | (from Step 4) |
| `LAZUROS_DEFAULT_MODEL` | `llama3.2` |

Build and start:
```bash
docker compose up -d --build
curl http://localhost:3001/health
```

---

## Step 6 — SylibOS

```bash
cd /mnt/Luna/Webhost/jkOS/SylibOS
cp .env.example .env && nano .env
```

| Variable | Value |
|----------|-------|
| `JKOS_AUTH_PUBLIC_KEY` | (RS256 public key from Step 3) |
| `LIBRARY_DB_PATH` | `/data/library.db` |
| `AI_PROVIDER` | `lazuros` |
| `LAZUROS_URL` | `http://host.docker.internal:8080` |
| `LAZUROS_TOKEN` | (from Step 4) |
| `NIGHTLY_CRON` | `0 2 * * *` |

Build and start:
```bash
docker compose up -d --build
curl http://localhost:8004/health
```

> **library.db note:** The API boots successfully even without `library.db` — it auto-seeds an
> empty schema on first start. To add courses to the library, run the Python ingest pipeline:
> ```bash
> cd /mnt/Luna/Webhost/jkOS/SylibOS
> python -m preprocessor.library_cli build COURSE.zip --course-number 18.01SC --term "Fall 2010"
> python -m preprocessor.library_cli load ./build/18-01sc-fall-2010
> ```

---

## Step 7 — Standalone nginx

```bash
cd /mnt/Luna/Webhost/jkOS/Hub/docker/nginx
docker compose up -d
```

The compose file:
- Mounts `/mnt/Luna/Backends/ssl → /etc/letsencrypt` (read-only)
- Mounts `/mnt/Luna/Backends/nginx-standalone-logs → /var/log/nginx`
- Joins `bb-net`, `sylibos-net`, and `jkos-auth-net` as external networks

No config edits needed — certs and subdomain names are already configured.

---

## Step 8 — Verify

```bash
# All containers running:
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
# Expected: jkos-auth, bb-app, sylibos-frontend, sylibos-api, standalone-nginx, lazuros

# Health checks:
curl -s https://auth.jkos.net/health | jq .
curl -s https://beigeboard.jkos.net/health | jq .
curl -s https://sylibos.jkos.net/health | jq .
# → {"status":"ok","service":"..."}
```

---

## Network Architecture

```
Cloudflare DNS → TrueNAS SCALE host :80/:443
                          │
                 ┌────────▼────────┐
                 │ standalone-nginx │ (nginx:alpine)
                 └──┬────┬──────┬──┘
                    │    │      │
              auth  │ bb │ sylibos
         .jkos.net  │    │  .jkos.net
                    │    │      │
         ┌──────────▼┐  ┌▼──┐  ┌▼──────────────────┐
         │ jkos-auth │  │bb │  │  sylibos-net       │
         │ :3100     │  │net│  │                    │
         └───────────┘  │   │  │  sylibos-frontend  │
                        │bb │  │  :80 (nginx SPA)   │
                        │app│  │                    │
                        │:  │  │  sylibos-api       │
                        │30 │  │  :8004 (Node.js)   │
                        │01 │  └──────────┬─────────┘
                        └───┘             │
                             └────────────┤
                                          │ host.docker.internal:8080
                                          ▼
                               ┌────────────────┐
                               │   LazurOS API  │ (host network)
                               │   :8080        │
                               └────────────────┘

SSL:  /mnt/Luna/Backends/ssl/live/jkos.net/{fullchain,privkey}.pem
      Wildcard — covers auth, beigeboard, sylibos subdomains

Code: /mnt/Luna/Webhost/jkOS/{SylibOS,BeigeBoard,LazurOS,ORDECK}/

Data volumes:
  /mnt/Luna/Backends/BeigeBoard-Data/       ← beigeBoard.db
  /mnt/Luna/Backends/SylibOS-Data/          ← sylibos.db, library.db (after pipeline run)
  /mnt/Luna/Backends/jkos-auth-data/        ← jkos-auth.db, RSA keypair
  /mnt/Luna/Backends/nginx-standalone-logs/ ← access.log, error.log
```

---

## Updating

```bash
BASE=/mnt/Luna/Webhost/jkOS

git -C $BASE/BeigeBoard pull
git -C $BASE/SylibOS pull
git -C $BASE/ORDECK pull

cd $BASE/BeigeBoard && docker compose up -d --build
cd $BASE/SylibOS    && docker compose up -d --build

# Reload nginx (config-only change):
docker exec standalone-nginx nginx -s reload
```

---

## Troubleshooting

### 502 on beigeboard.jkos.net
- `docker logs bb-app` — check Express started on port 3001
- `docker network inspect bb-net` — confirm `bb-app` and `standalone-nginx` are listed

### 502 on sylibos.jkos.net/api/
- `docker logs sylibos-api` — check Node.js started on port 8004
- `docker network inspect sylibos-net` — confirm `sylibos-api` and `standalone-nginx` present

### Auth failing (401)
- Confirm `JKOS_AUTH_PUBLIC_KEY` is set identically in BeigeBoard and SylibOS `.env`
- Confirm the key matches what jkOS Auth generated (check `jkos-auth/.env` or `docker logs jkos-auth`)
- Confirm `jkos_token` cookie exists in browser: DevTools → Application → Cookies → auth.jkos.net
- Confirm jkOS Auth is running: `curl https://auth.jkos.net/health`

### SSL cert errors
- Confirm files exist: `ls /mnt/Luna/Backends/ssl/live/jkos.net/`
- Check nginx can read: `docker exec standalone-nginx cat /etc/letsencrypt/live/jkos.net/fullchain.pem | head -1`

### LazurOS not reachable
- `curl http://localhost:8080/health` from TrueNAS shell
- `docker exec bb-app curl http://host.docker.internal:8080/health`

### Library page empty (no courses)
- Expected — library.db starts empty. Run the Python pipeline to ingest courses.
- `docker logs sylibos-api | grep library` — should see "seeding empty schema" on first boot

### Nightly AI job not running
- `docker logs sylibos-api | grep nightly`
- Check `AI_PROVIDER` in `.env` — must be `lazuros` or `ollama`, not `none`
- Trigger manually: `curl -X POST https://sylibos.jkos.net/api/admin/run-nightly`
