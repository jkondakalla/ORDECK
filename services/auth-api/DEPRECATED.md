# auth-api — DEPRECATED

This service has been replaced by **jkOS Auth** (`/jkos-auth/` in the Hub).

**Do not deploy this service.** Its container (`ordeck-auth:8000`) is no longer referenced
by nginx or any backend. The docker-compose entry for `ordeck-auth` should be removed
when the ORDECK unified portal is brought up.

## What replaced it

| Old | New |
|-----|-----|
| `ordeck-auth:8000` | `auth.jkos.net` (jkOS Auth service) |
| `ordeck_access` cookie (HS256 JWT) | `jkos_token` cookie (RS256 JWT) |
| `issuer: ordeck-auth` | `issuer: jkos-auth` |
| `JWT_SECRET` env var | `JKOS_AUTH_PUBLIC_KEY` env var (RSA public key only) |
| `/api/auth/*` proxied through nginx | Browser calls `auth.jkos.net` directly |

## Why kept

The source code is preserved for reference in case any endpoint behavior needs to be
replicated. Delete this folder once the ORDECK unified portal is stable.
