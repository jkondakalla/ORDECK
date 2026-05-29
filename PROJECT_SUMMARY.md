# jkHUB — Project Summary

**Date:** 2026-05-25  
**Status:** All apps implemented and deployed as standalone subdomains; ORDECK unified portal ready for final bring-up

---

## Vision

jkHUB is a self-hosted, unified life-assistant dashboard running on TrueNAS SCALE. It presents personal productivity tools in a single browser window. Design language: retro-CRT / cassette-futurism. Each capability lives in its own project folder and is surfaced into the dashboard as a Module Federation widget. LazurOS is the centralized AI compute proxy — all services route AI calls through it.

**Two deployment modes:**
- **Standalone subdomains** ← current focus: `beigeboard.jkos.net` and `sylibos.jkos.net` running independently behind a shared nginx
- **Unified ORDECK portal** ← next phase: all apps embedded as Module Federation widgets at a single domain

---

## Repository Layout

```
/media/jag/The Forge/Hub/
├── ORDECK/          ← monorepo shell (Turborepo + pnpm) — github.com/jkondakalla/ORDECK
├── BeigeBoard/      ← calendar + task manager (standalone + widget) — github.com/jkondakalla/BeigeBoard
├── LazurOS/         ← Wake-on-LAN compute proxy + AI gateway — github.com/jkondakalla/LazurOS
└── SylibOS/  ← SylibOS: MIT OCW course importer + AI scheduler — github.com/jkondakalla/SylibOS
```

> The directory on disk is still `SylibOS/` but the app, containers, networks, and subdomains are all branded **SylibOS**.

---

## Standalone Deployment (Current State)

### Infrastructure
- **Pool:** Luna (`/mnt/Luna/`)
- **Domain:** jkos.net (Cloudflare)
- **SSL:** Let's Encrypt SAN cert covering both subdomains, stored at `/mnt/Luna/ssl/live/beigeboard.jkos.net/`
- **Nginx config:** `ORDECK/docker/standalone-nginx/` — two server blocks, joined to `bb-net` and `sylibos-net`

### Subdomains
| App | URL | Container | Network | Data |
|-----|-----|-----------|---------|------|
| BeigeBoard | `https://beigeboard.jkos.net` | `bb-app` | `bb-net` | `/mnt/Luna/BeigeBoard-Data/` |
| SylibOS frontend | `https://sylibos.jkos.net` | `sylibos-frontend` | `sylibos-net` | — |
| SylibOS API | `https://sylibos.jkos.net/api/` | `sylibos-api` | `sylibos-net` | `/mnt/Luna/sylibos-data/` |

### Startup order (TrueNAS shell)
```bash
# 1. LazurOS (host network — needed by BeigeBoard AI task parse)
cd /mnt/Luna/hub/LazurOS && docker compose up -d

# 2. BeigeBoard
cd /mnt/Luna/hub/BeigeBoard
cp .env.example .env && nano .env    # JWT_SECRET, GOOGLE_*, LAZUROS_TOKEN
docker compose up -d --build

# 3. SylibOS
cd /mnt/Luna/hub/SylibOS
cp .env.example .env && nano .env    # AI_PROVIDER, LAZUROS_TOKEN
docker compose up -d --build

# 4. Standalone nginx (last — networks must exist first)
cd /mnt/Luna/hub/ORDECK/docker/standalone-nginx
mkdir -p /mnt/Luna/nginx-standalone-logs
docker compose up -d

# Verify
curl -sk https://beigeboard.jkos.net/health | jq .
curl -sk https://sylibos.jkos.net/health    | jq .
```

---

## ORDECK (Monorepo Shell)

**Tech:** Turborepo · pnpm workspaces · React 18 · TypeScript 5.7 · Vite 5 · Module Federation  
**Design:** Cassette-futurism / retro-CRT via `@hub/ui/tokens.css` CSS custom properties

### Workspace layout
```
ORDECK/
├── apps/
│   └── shell/                ← dashboard shell, port 3000
├── packages/
│   ├── auth/                 ← shared JWT middleware (@ordeck/auth)
│   ├── types/                ← canonical TypeScript types (@hub/types)
│   └── ui/                   ← shared React components + tokens.css (@hub/ui)
├── plugins/
│   ├── beigeboard/           ← widget wrapper → BeigeBoard/src, port 3003
│   ├── lazuros/              ← widget wrapper → LazurOS/widget, port 3002
│   ├── sylibos/              ← SylibOS widget (iframe tile), port 3005
│   ├── plex/                 ← AI media advisor widget, port 3001 ✓
│   └── recipe/               ← AI recipe generator widget, port 3004 ✓
├── services/
│   ├── auth-api/             ← Google OAuth2 + JWT, port 8000
│   ├── plex-api/             ← FastAPI AI suggest, port 8001
│   └── recipe-api/           ← FastAPI AI recipe, port 8002
└── docker/
    ├── TRUENAS_SETUP.md      ← ORDECK-specific deployment guide
    ├── standalone-nginx/     ← standalone.conf + docker-compose.yml for subdomains
    ├── nginx/                ← ORDECK unified nginx
    ├── sylibos/              ← SylibOS ORDECK-mode docker config
    └── */docker-compose.yml  ← per-service compose files
```

### Port map
| Service | Dev port | Container | Docker internal | Status |
|---------|----------|-----------|----------------|--------|
| shell | 3000 | ordeck-shell | 80 | ✓ |
| plex-plugin | 3001 | ordeck-plex-plugin | 80 | ✓ |
| lazuros-plugin | 3002 | ordeck-lazuros-plugin | 80 | ✓ |
| beigeboard-plugin | 3003 | ordeck-beigeboard-plugin | 80 | ✓ |
| recipe-plugin | 3004 | ordeck-recipe-plugin | 80 | ✓ |
| sylibos-plugin | 3005 | ordeck-sylibos-plugin | 80 | ✓ |
| auth-api | 8000 | ordeck-auth | 8000 | ✓ |
| plex-api | 8001 | ordeck-plex-api | 8001 | ✓ |
| recipe-api | 8002 | ordeck-recipe-api | 8002 | ✓ |
| beigeboard-api | 8003 | ordeck-beigeboard-api | 8003 | ✓ |
| sylibos-api | 8004 | ordeck-sylibos-api | 8004 | ✓ |
| LazurOS API | 8080 | ordeck-lazuros-api | host network | ✓ |

### Nginx routing (ORDECK unified — future)
```
/api/auth/           → ordeck-auth:8000
/api/plex/           → ordeck-plex-api:8001
/api/recipes/        → ordeck-recipe-api:8002
/api/beigeboard/     → ordeck-beigeboard-api:8003   (strips prefix)
/api/sylibos/ → ordeck-sylibos-api:8004 (strips prefix)
/api/lazuros/        → host.docker.internal:8080/    (strips prefix)
/plugins/*/          → ordeck-*-plugin:80
/                    → ordeck-shell:80
```

---

## LazurOS (AI Compute Proxy + Wake-on-LAN)

**Status: Fully implemented**  
**Tech:** Python 3.11 · FastAPI · httpx · wakeonlan · Docker (host network)  
**Location:** `LazurOS/` (standalone) + widget in `ORDECK/plugins/lazuros/`

### Purpose
TrueNAS always-on proxy that:
1. Checks if the sleeping Linux desktop (GPU/compute node) is online
2. If sleeping → sends Wake-on-LAN UDP broadcast to wake it
3. Polls until compute node responds (up to `WAKE_TIMEOUT_SECONDS`)
4. Proxies ALL authenticated requests to Ollama on the compute node

### API
```
GET  /health          → public; compute_online: bool, compute_node: "up"|"sleeping"
POST /wake            → auth; sends WoL packet, returns immediately
GET  /models          → auth; lists Ollama models
GET  /ps              → auth; shows VRAM-loaded models
ANY  /api/{path}      → auth; proxied to Ollama (streaming-aware)
```

### Authentication
Validates JWT in `ordeck_access` cookie OR `Authorization: Bearer` header.

### Required env vars
```
JWT_SECRET, SHELL_URL, ALLOWED_EMAILS
COMPUTE_NODE_IP, COMPUTE_NODE_MAC, COMPUTE_API_PORT
LAZUROS_LISTEN_PORT=8080, WAKE_TIMEOUT_SECONDS=45
```

---

## BeigeBoard (Calendar + Task Manager)

**Status: Fully implemented — standalone + ORDECK widget**  
**Tech:** React 18 · TypeScript 5.6 · Vite 6 · Express.js · SQLite  
**Location:** `BeigeBoard/` · deployed at `https://beigeboard.jkos.net`

### What it does
- Four views: Today, Week, Calendar, Tasks
- Hierarchical task system: year → month → week → day → subtask
- Calendar sync: Google Calendar (OAuth2), Outlook (Microsoft OAuth2), iCloud (CalDAV)
- Drag-and-drop scheduling on time blocks
- AI task parsing: `POST /api/ai/parse-task` — natural language → structured task fields (via LazurOS)

### Backend API surface
```
GET/POST /api/items, PATCH/DELETE /api/items/:id
GET  /api/auth/google/url, /api/auth/google/callback, /api/auth/google/status
GET  /api/auth/outlook/*, /api/auth/icloud/*
POST /api/calendar/*/sync
POST /api/ai/parse-task
```

### Docker (standalone)
- **Dockerfile** (root): multi-stage — builds Vite frontend then serves via Express
- **docker-compose.yml**: single `bb-app` service on `bb-net`, reads from `.env`
- **Healthcheck**: uses `node -e "fetch(...)"` (no curl in node:20-slim)

### Required env vars
```
SHELL_URL=https://beigeboard.jkos.net
JWT_SECRET, GOOGLE_CLIENT_ID/SECRET, GOOGLE_REDIRECT_URI
MICROSOFT_CLIENT_ID/SECRET, MICROSOFT_REDIRECT_URI  (optional)
LAZUROS_URL=http://host.docker.internal:8080
LAZUROS_TOKEN, LAZUROS_DEFAULT_MODEL=llama3.2
```

---

## SylibOS (MIT OCW AI Course Scheduler)

**Status: Fully implemented — frontend + backend + standalone Docker**  
**Tech:** React 19 · TypeScript 6 · Vite 8 · Zustand · Tailwind 4 · Anthropic SDK · React Router 7 + Node.js · SQLite · node-cron  
**Location:** `SylibOS/` (directory) · deployed at `https://sylibos.jkos.net`

> SylibOS is a standalone app — NOT a federated widget (React 19 ≠ React 18 singleton).  
> An iframe tile wraps it in the ORDECK dashboard.

### What it does
- Import MIT OpenCourseWare courses from ZIP files
- Python preprocessor (`preprocessor/`) parses ZIP → `CourseManifest` JSON
- Backend organizes lectures into units via AI, generates quizzes + tasks nightly
- Track daily study progress against a configurable daily goal
- Lesson player with PDF viewer, AI-generated quiz, and 2-minute tasks
- Streak tracking, progress bar, estimated completion

### AI providers (in priority order)
1. **lazuros** — Routes through LazurOS (local Ollama). Configure in Settings UI.
2. **ollama** — Direct Ollama URL
3. **claude** — Anthropic SDK (API key in Settings)
4. **none** — Falls back to mock quizzes

### Frontend Settings UI
All AI provider fields (provider selector, LazurOS URL, LazurOS token, Ollama URL, model, Claude API key) are fully implemented in `src/pages/Settings.tsx`. Settings persist to localStorage and sync to the backend DB when `backendUrl` is configured.

### Backend (`backend/`)
- Express.js REST API on port 8004
- SQLite via `better-sqlite3` — courses, lectures, segments, daily logs, settings
- Nightly cron job (`node-cron`) — processes unprocessed lectures through AI
- `db.js getSettings()` merges env-var defaults with DB values (env vars drive the nightly job out of the box; Settings UI overrides at runtime)
- JWT auth (optional — leave `JWT_SECRET` empty for private LAN use)

### Backend API
```
GET  /health
GET/POST /api/courses, GET/DELETE /api/courses/:id
GET/POST /api/segments, PATCH /api/segments/:id
GET/POST /api/daily-logs
GET/PUT  /api/settings
GET      /api/summary          ← ORDECK widget feed
POST     /api/import-manifest  ← accepts CourseManifest JSON from preprocessor
POST     /api/admin/run-nightly
```

### Python Preprocessor (`preprocessor/`)
```bash
python -m preprocessor path/to/course.zip [--push-to http://sylibos-api:8004/api]
```
Detects ZIP layout (legacy MIT, modern, seminar, video-only, flat, scholar), extracts PDFs + HTML navigation, produces a `CourseManifest` JSON that the backend's `/api/import-manifest` accepts.

### Docker (standalone)
- `Dockerfile`: multi-stage Vite build → nginx:alpine, SPA try_files fallback
- `backend/Dockerfile`: node:20-alpine, production deps only
- `docker-compose.yml`: `sylibos-frontend` + `sylibos-api` on `sylibos-net`
- Volume: `/mnt/Luna/sylibos-data:/data`

### Required env vars (backend)
```
JWT_SECRET          (optional — leave empty for open access)
AI_PROVIDER=lazuros|ollama|none
LAZUROS_URL=http://host.docker.internal:8080
LAZUROS_TOKEN
OLLAMA_URL=http://host.docker.internal:11434
OLLAMA_MODEL=llama3.2
NIGHTLY_CRON=0 2 * * *
```

---

## Shared Packages

### `@hub/types` (`ORDECK/packages/types/src/index.ts`)
```typescript
WidgetManifest, WidgetStatus, WidgetInstance
WidgetType  // 'clock' | 'plugins' | 'connections' | 'log' | 'plex' | 'lazuros'
            // | 'beigeboard' | 'recipe' | 'sylibos'
HubUser, WidgetProps
Item          // BeigeBoard task/goal/event (full schema)
CalendarAccount  // google | outlook | icloud | bb
```

### `@hub/ui` (`ORDECK/packages/ui/src/`)
- Shared React components + hardware chrome (Screw, Vent, Led, DymoTape)
- `tokens.css` — full CSS custom property design system

---

## What's Done vs. Remaining

| Feature | Status | Notes |
|---------|--------|-------|
| ORDECK shell + boot sequence | ✓ | BootSequence → Dashboard |
| Dashboard grid (drag/resize) | ✓ | localStorage persistence |
| Cassette-futurism design system | ✓ | `@hub/ui/tokens.css` |
| AI Console panel (shell) | ✓ | Streaming, model select, stop/clear |
| BeigeBoard full app | ✓ | Today/Week/Calendar/Tasks, OAuth, SQLite |
| BeigeBoard → ORDECK widget | ✓ | Thin wrapper |
| BeigeBoard AI task parse | ✓ | NL → structured task fields via LazurOS |
| BeigeBoard standalone Docker | ✓ | bb-app on bb-net, beigeboard.jkos.net |
| LazurOS widget | ✓ | Status dot + wake button |
| LazurOS API (WoL + AI proxy) | ✓ | FastAPI, host network |
| Plex widget + API | ✓ | AI mood → media recommendations |
| Recipe widget + API | ✓ | AI ingredient → recipe |
| SylibOS UI (5 pages) | ✓ | Home, Import, Lesson, Progress, Settings |
| SylibOS LazurOS provider (logic + UI) | ✓ | aiService.ts + Settings.tsx both complete |
| SylibOS backend (Node.js/SQLite) | ✓ | REST API + nightly AI job |
| SylibOS Python preprocessor | ✓ | 6 ZIP layout adapters, CourseManifest output |
| SylibOS standalone Docker | ✓ | sylibos-net, sylibos.jkos.net |
| Standalone nginx (both subdomains) | ✓ | ORDECK/docker/standalone-nginx/, Let's Encrypt |
| SylibOS → ORDECK widget | ✓ | iframe tile in plugins/sylibos/ |
| ORDECK unified portal bring-up | ✗ next | Fill ORDECK .env files, start all services |

---

## AI Integration Architecture

```
┌─── ORDECK Shell ─────────────────────────────────────────────┐
│  AI Console (AiPanel.tsx)                                     │
│  → POST /api/lazuros/api/chat  (streaming NDJSON)            │
└───────────────────────────────────────────────────────────────┘

┌─── BeigeBoard Backend ────────────────────────────────────────┐
│  POST /api/ai/parse-task                                       │
│  → POST LAZUROS_URL/api/chat  (service-to-service)           │
└───────────────────────────────────────────────────────────────┘

┌─── SylibOS Backend (nightly job) ─────────────────────────────┐
│  node-cron → generateSegmentContent(settings, ...)            │
│  → POST LAZUROS_URL/api/generate  (service-to-service)       │
└───────────────────────────────────────────────────────────────┘

┌─── SylibOS Frontend (browser) ────────────────────────────────┐
│  aiService.ts: lazuros provider                               │
│  → GET/POST LAZUROS_URL/api/generate  (browser fetch+Bearer) │
└───────────────────────────────────────────────────────────────┘

┌─── Plex API / Recipe API ──────────────────────────────────────┐
│  → POST LAZUROS_URL/api/chat  (service-to-service)            │
└───────────────────────────────────────────────────────────────┘

All roads lead to:

┌─── LazurOS API ────────────────────────────────────────────────┐
│  FastAPI on host network :8080                                  │
│  JWT auth: cookie OR Authorization: Bearer                     │
│  → Wakes compute node if sleeping (WoL UDP)                    │
│  → Proxies to Ollama :11434                                    │
└────────────────────────────────────────────────────────────────┘
```

---

## Running Everything (Development)

```bash
# Terminal 1 — LazurOS API
cd "/media/jag/The Forge/Hub/LazurOS"
cp .env.example .env && nano .env
uvicorn main:app --port 8080

# Terminal 2 — BeigeBoard backend
cd "/media/jag/The Forge/Hub/BeigeBoard/backend"
node server.js   # port 3001

# Terminal 3 — BeigeBoard frontend
cd "/media/jag/The Forge/Hub/BeigeBoard"
npm run dev      # port 5173, proxies /api → 3001

# Terminal 4 — SylibOS backend
cd "/media/jag/The Forge/Hub/SylibOS/backend"
node index.js    # port 8004

# Terminal 5 — SylibOS frontend
cd "/media/jag/The Forge/Hub/SylibOS"
npm run dev      # port 5173

# Terminal 6 — Auth API
cd "/media/jag/The Forge/Hub/ORDECK/services/auth-api"
node server.js   # port 8000

# Terminal 7 — ORDECK shell + all plugins
cd "/media/jag/The Forge/Hub/ORDECK"
pnpm install && pnpm dev
# shell:3000, plex:3001, lazuros:3002, beigeboard:3003, recipe:3004, sylibos:3005
```

---

## Key File Index

```
Hub/
├── PROJECT_SUMMARY.md
├── TRUENAS_SETUP.md                      ← standalone subdomain deployment guide
│
├── ORDECK/
│   ├── apps/shell/src/
│   │   ├── App.tsx                       ← boot → dashboard
│   │   ├── pages/Dashboard.tsx           ← widget grid + AI panel state
│   │   ├── components/Header.tsx         ← status bar + AI toggle (◎)
│   │   ├── components/AiPanel.tsx        ← streaming AI chat panel
│   │   └── components/settings/          ← settings panel + API tokens
│   ├── plugins/
│   │   ├── beigeboard/src/Widget.tsx
│   │   ├── lazuros/src/Widget.tsx
│   │   ├── sylibos/src/Widget.tsx ← iframe tile → sylibos.jkos.net
│   │   ├── plex/src/Widget.tsx
│   │   └── recipe/src/Widget.tsx
│   ├── packages/
│   │   ├── types/src/index.ts            ← ALL shared TypeScript types
│   │   └── ui/src/tokens.css             ← CSS custom properties
│   ├── services/
│   │   ├── auth-api/server.js            ← Google OAuth2 + JWT (port 8000)
│   │   ├── plex-api/main.py              ← mood → AI suggestions (port 8001)
│   │   └── recipe-api/main.py            ← prompt → AI recipe (port 8002)
│   └── docker/
│       ├── TRUENAS_SETUP.md              ← ORDECK unified deployment guide
│       ├── standalone-nginx/             ← beigeboard.jkos.net + sylibos.jkos.net
│       │   ├── standalone.conf
│       │   └── docker-compose.yml
│       ├── nginx/nginx.conf              ← ORDECK unified reverse proxy
│       └── */docker-compose.yml
│
├── BeigeBoard/
│   ├── Dockerfile                        ← multi-stage: Vite build + Express serve
│   ├── docker-compose.yml                ← bb-app on bb-net
│   ├── .env.example                      ← all standalone vars
│   ├── src/App.tsx                       ← main component (apiUrl prop)
│   ├── src/views/TodayView.tsx           ← Today view + AI parse button
│   ├── backend/server.js                 ← Express API (port 3001)
│   └── backend/.env.example
│
├── LazurOS/
│   ├── main.py                           ← FastAPI: WoL + Ollama proxy
│   ├── auth.py                           ← JWT dependency injection
│   ├── widget/index.tsx                  ← React status + wake button
│   └── Dockerfile                        ← python:3.11-slim, port 8080
│
└── SylibOS/                       ← SylibOS on disk
    ├── Dockerfile                        ← multi-stage: Vite build → nginx:alpine
    ├── docker-compose.yml                ← sylibos-frontend + sylibos-api on sylibos-net
    ├── .env.example                      ← all standalone vars
    ├── src/
    │   ├── main.tsx                      ← BrowserRouter entry (5 routes)
    │   ├── pages/Settings.tsx            ← AI provider config (all fields present)
    │   ├── lib/aiService.ts              ← lazuros + ollama + claude providers
    │   ├── lib/api.ts                    ← backend sync client
    │   ├── lib/db.ts                     ← localStorage persistence
    │   ├── store/appStore.ts             ← Zustand store (hydrates from backend)
    │   └── types/index.ts                ← AppSettings (lazurosUrl/Token included)
    ├── backend/
    │   ├── index.js                      ← Express API + nightly cron (port 8004)
    │   ├── db.js                         ← SQLite + env-var defaults for settings
    │   ├── ai.js                         ← LazurOS + Ollama AI drivers
    │   ├── Dockerfile
    │   └── .env.example
    └── preprocessor/                     ← Python ZIP → CourseManifest pipeline
        ├── __main__.py                   ← CLI entry point
        ├── detect.py                     ← ZIP layout detection
        ├── pipeline.py                   ← orchestration
        └── adapters/                     ← legacy, modern, seminar, video-only, flat, scholar
```

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| LazurOS as central AI gateway | All services call one place; no direct Ollama access from widgets |
| Bearer token for service-to-service | BeigeBoard/Plex/Recipe/SylibOS backend call LazurOS with `Authorization: Bearer` |
| Host network for LazurOS Docker | Required for WoL UDP broadcast — can't use bridge for raw UDP broadcast |
| host.docker.internal for bridge→host | Containers on bb-net/sylibos-net reach LazurOS on host via Docker host gateway |
| Module Federation for ORDECK widgets | Each widget independently deployable; shell doesn't rebuild on widget change |
| Standalone-first subdomains | BeigeBoard and SylibOS usable immediately without ORDECK; ORDECK embeds them later |
| SylibOS env-var defaults in getSettings() | Nightly job works out of the box from docker-compose env; Settings UI overrides at runtime |
| React 19 for SylibOS | Standalone, never federated — safe to use latest; ORDECK widget uses iframe |
| SQLite everywhere | Single-user, local-first; no Postgres overhead |
| SAN cert for subdomains | One Let's Encrypt cert covers beigeboard.jkos.net + sylibos.jkos.net |

---

*Updated 2026-05-25. Standalone deployment guide: `TRUENAS_SETUP.md`. ORDECK unified deployment: `ORDECK/docker/TRUENAS_SETUP.md`.*
