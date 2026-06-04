# ORDECK — Service Documentation

**Location:** `ORDECK/`  
**TrueNAS path:** `/mnt/Luna/Webhost/jkOS/ORDECK/`  
**URL:** `https://jkos.net` (apex domain)  
**Container:** `ordeck-shell` on `jkos-internal`  
**Status:** Deployed — the jkOS portal  
**Tech:** Turborepo · pnpm workspaces · React 18 · TypeScript · Vite · Module Federation  
**Last updated:** 2026-06-04 (portal redesign + unified aesthetics)

---

## 1. Purpose

ORDECK at `jkos.net` is the front door to the jkOS suite. It serves two roles:

1. **Portal** — an `AppLauncher` section (hero, above the canvas) fetches registered apps from jkAuth `GET /auth/apps` and presents them as large card tiles. Users land here after login and click through to other apps.
2. **Dashboard** — a draggable/resizable widget canvas below the launcher for clocks, logs, scopes, and tools.

The design philosophy is **portal-first**: the app launcher is the primary content, the widget canvas is secondary.

---

## 2. Repository Structure

```
ORDECK/
├── apps/
│   └── shell/               ← React 18 SPA (the deployed app)
│       └── src/
│           ├── App.tsx
│           ├── pages/
│           │   ├── Dashboard.tsx      ← Portal layout: AppLauncher + WidgetPalette + Canvas
│           │   └── LoginPage.tsx      ← Auth prompt (Google SSO)
│           ├── hooks/
│           │   ├── useAuth.ts         ← Auth state + jkAuth API calls
│           │   └── useJkOSPreferences.ts ← Suite theme + effects + lazuros fetch/apply/patch
│           ├── components/
│           │   ├── AppLauncher.tsx    ← Hero app grid (fetches /auth/apps)
│           │   ├── WidgetPalette.tsx  ← Collapsible sidebar: widget slots + active sessions
│           │   ├── Overlays.tsx       ← FilmGrain, Halation, ScanLines, Artifacts
│           │   ├── AuthGuard.tsx
│           │   ├── BootSequence.tsx
│           │   ├── settings/
│           │   │   ├── SettingsPanel.tsx       ← Canvas config: CRT, hardware, sessions, tokens
│           │   │   ├── UnifiedSettingsPanel.tsx ← Suite-wide glass panel (profile icon trigger)
│           │   │   ├── SessionsPanel.tsx
│           │   │   ├── TokensPanel.tsx
│           │   │   └── useSettings.ts    ← ORDECK canvas settings (scanlines, vignette…)
│           │   └── hardware/        ← Led, Screw, Vent primitives
│           └── widgets/
│               ├── core/
│               │   ├── AppsWidget.tsx    ← Optional canvas widget (AppLauncher is the default)
│               │   ├── ClockWidget.tsx
│               │   ├── ConnectionsWidget.tsx
│               │   ├── LogWidget.tsx
│               │   ├── ScopeWidget.tsx
│               │   └── MemMapWidget.tsx
│               ├── tools/           ← Stopwatch, WorldClocks, Calc, Pomodoro, Calendar
│               └── deco/            ← Reel, Nixie, Gauges, DataRain, etc.
├── packages/
│   ├── types/               ← @hub/types — WidgetType, WidgetInstance, etc.
│   └── ui/                  ← @hub/ui — CSS design tokens (tokens.css), shared components
├── docker/
│   └── shell/
│       ├── docker-compose.yml   ← ordeck-shell on jkos-internal (no host port)
│       ├── Dockerfile           ← pnpm build → nginx:alpine static
│       └── nginx.conf           ← SPA fallback (try_files)
└── docs/ORDECK.md
```

---

## 3. Authentication

ORDECK calls `auth.jkos.net` directly — no backend of its own.

**`useAuth.ts` flow:**
1. `GET auth.jkos.net/auth/me` with `credentials: 'include'`
2. If 401 → `POST auth.jkos.net/auth/refresh` → retry `/auth/me`
3. If still 401 → show `LoginPage`

**`loginWithGoogle()`** — redirects to `auth.jkos.net/auth/login?redirect_to=https://jkos.net`. After login, jkAuth redirects back.

**`logout()`** — `POST auth.jkos.net/auth/logout` → redirect to `auth.jkos.net`.

---

## 4. Suite Preferences System

ORDECK owns the cross-suite preferences (theme, effects, AI). Dashboard calls `useJkOSPreferences()` once — a single `GET auth.jkos.net/auth/profile` fetch that covers all preferences. The hook is passed as props to `UnifiedSettingsPanel`.

### `hooks/useJkOSPreferences.ts`

- On mount: `GET auth.jkos.net/auth/profile` → reads `preferences.{theme, effects, lazuros}`
- `applyOrdeckTheme(theme)`:
  - `theme.primary` → `--hub-amber` + derived (`--hub-amber-bright/dim/deep/glow`) + `--accent-base`
  - `theme.secondary` → `--hub-cyan` + derived (`--hub-cyan-dim/glow`) + `--accent-secondary`
- Returns `{ theme, effects, lazuros, user, saving, patchTheme, patchEffects, patchLazuros }`
- `patchX()` — optimistic local update + PATCH jkAuth

### `JkOSTheme` (simplified)

```typescript
{ mode: 'system' | 'light' | 'dark'; primary: string; secondary: string }
```
One color pair applied to both modes. CSS `color-mix()` adapts the derived tokens.

### `UnifiedSettingsPanel.tsx` (profile-icon triggered)

Glass dark slide-in panel (380px). Accepts all prefs as props from Dashboard. Contains:
- **Profile** — avatar initials, name, email
- **Appearance** — mode toggle + primary/secondary color pickers + 6 preset pairs
- **Effects** — grain (slider), halation, scan lines (slider), artifacts
- **AI · LazurOS** — URL + model
- **Account** — manage link + sign out

### ORDECK canvas settings (`useSettings.ts`)

Separate from suite preferences — ORDECK-only canvas config in `localStorage`:
- `scanlines`, `vignette`, `gridDensity` — CRT overlay strength for the canvas specifically
- `showBus`, `showRail`, `showScrews` — chrome visibility toggles
- No `style`/`phosphor`/`shell` switcher — ORDECK has one unified aesthetic

---

## 5. Widget Registry

All widgets registered in `pages/Dashboard.tsx`. Default layout: `clock`, `connections`, `log`, `scope`. The app launcher (`AppLauncher` component) is the portal hero section above the canvas — not a widget.

| Type | Label | Purpose |
|------|-------|---------|
| `apps` | APP REGISTRY | Optional canvas widget (AppLauncher is the default launcher) |
| `clock` | CHRONOMETER | UTC + local + Julian day |
| `connections` | CONNECTIONS | Plugin status |
| `log` | OPERATOR LOG | System log stream |
| `scope` | OSCILLOSCOPE | Live waveform display |
| `memmap` | MEMORY MAP | Memory map visualization |
| `stopwatch` | STOPWATCH | Lap timer |
| `worldclocks` | WORLD CLOCKS | 6 timezone display |
| `calc` | CALCULATOR | 4-function |
| `pomodoro` | POMODORO | Focus timer |
| `calendar` | CALENDAR | Month view |
| `reel`, `nixie`, `gauges`, `datarain`, … | — | Decorative hardware widgets |

Remote widgets (`plex`, `lazuros`, `beigeboard`, `recipe`) are registered with `component: null` — require separate plugin backend services not yet deployed.

---

## 6. Docker

**`docker/shell/Dockerfile`:** pnpm monorepo build (shell + packages only) → `nginx:alpine` serving `dist/` with SPA try_files fallback.

**`docker/shell/docker-compose.yml`:**
```yaml
name: jkos-prod-ordeck
services:
  ordeck-shell:
    container_name: ordeck-shell
    networks: [jkos-internal]
    # No host port — nginx proxies jkos.net → ordeck-shell:80
networks:
  jkos-internal:
    external: true
    name: jkos-internal
```

Included in root `docker-compose.yml` via:
```yaml
include:
  - path: ORDECK/docker/shell/docker-compose.yml
```

---

## 7. nginx Routing

`infra/nginx/standalone.conf`:
```nginx
server {
  server_name jkos.net;
  location / {
    proxy_pass http://ordeck-shell:80;
    ...
  }
}
```

---

## 8. Environment Variables

### `apps/shell/.env.production` (build-time)

| Variable | Value |
|----------|-------|
| `VITE_JKOS_AUTH_URL` | `https://auth.jkos.net` |
| `VITE_APP_ORIGIN` | `https://jkos.net` |

---

## 9. Design Token System

`packages/ui/src/tokens.css` — single source of truth. Key variables set at runtime by `applyOrdeckTheme()`:

| Variable | Default | Source |
|----------|---------|--------|
| `--hub-amber` + family | `#ffb000` | `theme.primary` via `applyOrdeckTheme()` |
| `--hub-cyan` + family | `#4ecdc4` | `theme.secondary` via `applyOrdeckTheme()` |
| `--accent-base` | same as `--hub-amber` | shared protocol var for UnifiedSettingsPanel components |
| `--accent-secondary` | same as `--hub-cyan` | shared protocol var |
| `--color-paper/ink/card/…` | aliased from `--hub-bg-*` / `--hub-cream*` | computed aliases for components that use shared token names |

The old `data-phosphor` / `data-style` / `data-shell` CSS attribute selectors have been removed. ORDECK has one aesthetic; colors are set dynamically at runtime, not via CSS class switching.

---

## 10. Pending

- **`jkos.net` DNS record** — apex A record needs adding in Cloudflare to point at TrueNAS.
- **ORDECK deployment** — `docker compose up --build ordeck-shell` via jkos-deploy once DNS is live.
- **Remote widgets** — plex, lazuros, beigeboard, recipe require backend plugin infrastructure.

---

## 11. Key Notes

- **ORDECK has no backend** — static SPA. All data from `auth.jkos.net` directly.
- **One profile fetch per page load** — `useJkOSPreferences()` is called in Dashboard only. Props are passed down. No hooks call `GET /auth/profile` independently.
- **AppLauncher is the portal hero** — `AppsWidget` is still in the widget registry for users who want to pin it, but is not in the default canvas layout.
- **`ordeck-net` is gone** — current compose uses `jkos-internal`.
- **jkAuth dashboard removed** — `PORTAL_URL=https://jkos.net` routes post-login to ORDECK.
- **`@hub/types` `WidgetType`** must be updated when adding new widget types.
- **Module Federation remotes** are wired in `vite.config.ts` but remote containers are not running.
