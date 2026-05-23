'use strict';

const express      = require('express');
const cookieParser = require('cookie-parser');
const jwt          = require('jsonwebtoken');
const { google }   = require('googleapis');
const Database     = require('better-sqlite3');
const crypto       = require('crypto');
const path         = require('path');

// ─── Config ───────────────────────────────────────────────────────────────────

const PORT           = parseInt(process.env.PORT || '8000', 10);
const JWT_SECRET     = process.env.JWT_SECRET || '';
const GOOGLE_ID      = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_SECRET  = process.env.GOOGLE_CLIENT_SECRET || '';
const SHELL_URL      = (process.env.SHELL_URL || 'http://localhost:3000').replace(/\/$/, '');
const AUTH_URL       = (process.env.AUTH_URL  || 'http://localhost:8000').replace(/\/$/, '');
const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean);
const DB_PATH        = process.env.DB_PATH || path.join(__dirname, 'auth.db');
const IS_PROD        = process.env.NODE_ENV === 'production';

if (!JWT_SECRET || JWT_SECRET.length < 64) {
  console.error('FATAL: JWT_SECRET must be at least 64 characters.');
  process.exit(1);
}
if (!GOOGLE_ID || !GOOGLE_SECRET) {
  console.error('FATAL: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required.');
  process.exit(1);
}

// ─── Token TTLs ───────────────────────────────────────────────────────────────

const ACCESS_TTL_SEC  = 15 * 60;
const REFRESH_TTL_SEC = 7 * 24 * 60 * 60;

// ─── Database ─────────────────────────────────────────────────────────────────

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         TEXT PRIMARY KEY,
    email      TEXT NOT NULL UNIQUE,
    name       TEXT NOT NULL,
    picture    TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at   INTEGER NOT NULL,
    created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
    last_used_at INTEGER,
    user_agent   TEXT,
    ip_address   TEXT
  );
`);

// Migrate existing DBs that lack the new columns
['last_used_at INTEGER', 'user_agent TEXT', 'ip_address TEXT'].forEach(colDef => {
  try { db.exec(`ALTER TABLE refresh_tokens ADD COLUMN ${colDef}`); } catch { /* column exists */ }
});

const stmts = {
  upsertUser: db.prepare(`
    INSERT INTO users (id, email, name, picture)
    VALUES (@id, @email, @name, @picture)
    ON CONFLICT(id) DO UPDATE SET
      email   = excluded.email,
      name    = excluded.name,
      picture = excluded.picture
  `),
  insertRefresh: db.prepare(`
    INSERT INTO refresh_tokens (id, user_id, expires_at, user_agent, ip_address)
    VALUES (@id, @userId, @expiresAt, @userAgent, @ipAddress)
  `),
  findRefresh: db.prepare(`
    SELECT rt.id, rt.user_id, rt.expires_at,
           u.email, u.name, u.picture
    FROM refresh_tokens rt
    JOIN users u ON u.id = rt.user_id
    WHERE rt.id = ?
  `),
  deleteRefresh:  db.prepare(`DELETE FROM refresh_tokens WHERE id = ?`),
  findUser:       db.prepare(`SELECT * FROM users WHERE id = ?`),
  purgeExpired:   db.prepare(`DELETE FROM refresh_tokens WHERE expires_at < unixepoch()`),
  touchRefresh:   db.prepare(`UPDATE refresh_tokens SET last_used_at = unixepoch() WHERE id = ?`),
  listSessions:   db.prepare(`
    SELECT id, created_at, last_used_at, user_agent, ip_address
    FROM refresh_tokens
    WHERE user_id = ? AND expires_at > unixepoch()
    ORDER BY last_used_at DESC, created_at DESC
  `),
  deleteSession:  db.prepare(`DELETE FROM refresh_tokens WHERE id = ? AND user_id = ?`),
  deleteOthers:   db.prepare(`DELETE FROM refresh_tokens WHERE user_id = ? AND id != ?`),
};

// ─── Token helpers ─────────────────────────────────────────────────────────────

function issueAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name, picture: user.picture },
    JWT_SECRET,
    { expiresIn: ACCESS_TTL_SEC, issuer: 'ordeck-auth' }
  );
}

function createRefreshToken(userId, req) {
  const id        = crypto.randomUUID();
  const expiresAt = Math.floor(Date.now() / 1000) + REFRESH_TTL_SEC;
  const userAgent = req?.headers?.['user-agent']?.slice(0, 255) ?? null;
  const ipAddress = req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
    ?? req?.socket?.remoteAddress
    ?? null;
  stmts.insertRefresh.run({ id, userId, expiresAt, userAgent, ipAddress });
  return { id, expiresAt };
}

function cookieOpts(maxAgeMs) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure:   IS_PROD,
    path:     '/',
    maxAge:   maxAgeMs,
  };
}

function setAuthCookies(req, res, user) {
  const accessToken              = issueAccessToken(user);
  const { id: refreshId, expiresAt } = createRefreshToken(user.id, req);

  res.cookie('ordeck_access',  accessToken, cookieOpts(ACCESS_TTL_SEC * 1000));
  res.cookie('ordeck_refresh', refreshId,   cookieOpts(REFRESH_TTL_SEC * 1000));
}

function clearAuthCookies(res) {
  res.clearCookie('ordeck_access',  { path: '/' });
  res.clearCookie('ordeck_refresh', { path: '/' });
}

// ─── Auth middleware ──────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  const token = req.cookies.ordeck_access;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.user = jwt.verify(token, JWT_SECRET, { issuer: 'ordeck-auth' });
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ─── OAuth2 client ─────────────────────────────────────────────────────────────

function makeOAuthClient() {
  return new google.auth.OAuth2(
    GOOGLE_ID,
    GOOGLE_SECRET,
    `${AUTH_URL}/api/auth/google/callback`
  );
}

// ─── Cleanup job: delete expired refresh tokens every hour ────────────────────

setInterval(() => {
  try {
    const { changes } = stmts.purgeExpired.run();
    if (changes) console.log(`[auth] Purged ${changes} expired refresh token(s)`);
  } catch (e) {
    console.error('[auth] Purge error:', e);
  }
}, 60 * 60 * 1000);

// ─── Express app ──────────────────────────────────────────────────────────────

const app = express();
app.use(cookieParser());
app.use(express.json());

// ─── GET /health ───────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'auth' });
});

// ─── GET /api/auth/google ── begin OAuth flow ─────────────────────────────────

app.get('/api/auth/google', (req, res) => {
  const state  = crypto.randomBytes(16).toString('hex');
  const client = makeOAuthClient();
  const url    = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    state,
  });

  res.cookie('ordeck_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure:   IS_PROD,
    path:     '/',
    maxAge:   5 * 60 * 1000,
  });

  res.redirect(url);
});

// ─── GET /api/auth/google/callback ────────────────────────────────────────────

app.get('/api/auth/google/callback', async (req, res) => {
  const { code, state, error } = req.query;

  const savedState = req.cookies.ordeck_oauth_state;
  res.clearCookie('ordeck_oauth_state', { path: '/' });

  if (error) {
    console.warn('[auth] OAuth error:', error);
    return res.redirect(`${SHELL_URL}?error=oauth_denied`);
  }
  if (!code || !state || state !== savedState) {
    console.warn('[auth] State mismatch or missing code');
    return res.redirect(`${SHELL_URL}?error=state_mismatch`);
  }

  try {
    const client = makeOAuthClient();
    const { tokens } = await client.getToken(String(code));
    client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const { data } = await oauth2.userinfo.get();

    const email = data.email || '';
    if (ALLOWED_EMAILS.length && !ALLOWED_EMAILS.includes(email)) {
      console.warn('[auth] Rejected email:', email);
      return res.redirect(`${SHELL_URL}?error=not_allowed`);
    }

    const user = {
      id:      data.id || crypto.randomUUID(),
      email,
      name:    data.name    || email,
      picture: data.picture || '',
    };

    stmts.upsertUser.run(user);
    setAuthCookies(req, res, user);

    return res.redirect(SHELL_URL);
  } catch (e) {
    console.error('[auth] Callback error:', e);
    return res.redirect(`${SHELL_URL}?error=server_error`);
  }
});

// ─── POST /api/auth/refresh ────────────────────────────────────────────────────

app.post('/api/auth/refresh', (req, res) => {
  const refreshId = req.cookies.ordeck_refresh;
  if (!refreshId) return res.status(401).json({ error: 'No refresh token' });

  const row = stmts.findRefresh.get(refreshId);
  if (!row) return res.status(401).json({ error: 'Invalid refresh token' });

  if (row.expires_at < Math.floor(Date.now() / 1000)) {
    stmts.deleteRefresh.run(refreshId);
    clearAuthCookies(res);
    return res.status(401).json({ error: 'Refresh token expired' });
  }

  // Rotate: delete old, issue new
  stmts.deleteRefresh.run(refreshId);

  const user = {
    id:      row.user_id,
    email:   row.email,
    name:    row.name,
    picture: row.picture,
  };

  setAuthCookies(req, res, user);
  res.json({ ok: true });
});

// ─── DELETE /api/auth/session ── logout current session ───────────────────────

app.delete('/api/auth/session', (req, res) => {
  const refreshId = req.cookies.ordeck_refresh;
  if (refreshId) stmts.deleteRefresh.run(refreshId);
  clearAuthCookies(res);
  res.json({ ok: true });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

app.get('/api/auth/me', (req, res) => {
  const token = req.cookies.ordeck_access;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const payload = jwt.verify(token, JWT_SECRET, { issuer: 'ordeck-auth' });
    // Touch last_used on the refresh token if present
    const refreshId = req.cookies.ordeck_refresh;
    if (refreshId) stmts.touchRefresh.run(refreshId);

    res.json({
      id:      payload.sub,
      email:   payload.email,
      name:    payload.name,
      picture: payload.picture,
    });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// ─── GET /api/auth/sessions ── list all active sessions ───────────────────────

app.get('/api/auth/sessions', requireAuth, (req, res) => {
  const sessions = stmts.listSessions.all(req.user.sub);
  const currentRefreshId = req.cookies.ordeck_refresh;

  res.json(sessions.map(s => ({
    id:          s.id,
    createdAt:   s.created_at,
    lastUsedAt:  s.last_used_at,
    userAgent:   s.user_agent,
    ipAddress:   s.ip_address,
    isCurrent:   s.id === currentRefreshId,
  })));
});

// ─── DELETE /api/auth/sessions/:id ── revoke a specific session ───────────────

app.delete('/api/auth/sessions/:id', requireAuth, (req, res) => {
  const { changes } = stmts.deleteSession.run(req.params.id, req.user.sub);
  if (!changes) return res.status(404).json({ error: 'Session not found' });

  // If the revoked session is the current one, clear cookies too
  if (req.params.id === req.cookies.ordeck_refresh) {
    clearAuthCookies(res);
  }

  res.json({ ok: true });
});

// ─── DELETE /api/auth/sessions ── revoke all OTHER sessions ──────────────────

app.delete('/api/auth/sessions', requireAuth, (req, res) => {
  const currentRefreshId = req.cookies.ordeck_refresh || '';
  const { changes } = stmts.deleteOthers.run(req.user.sub, currentRefreshId);
  res.json({ ok: true, revoked: changes });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[auth] Listening on port ${PORT}`);
  console.log(`[auth] SHELL_URL: ${SHELL_URL}`);
  console.log(`[auth] AUTH_URL:  ${AUTH_URL}`);
  console.log(`[auth] ALLOWED_EMAILS: ${ALLOWED_EMAILS.length ? ALLOWED_EMAILS.join(', ') : '(any)'}`);
  console.log(`[auth] DB: ${DB_PATH}`);
  console.log(`[auth] Production mode: ${IS_PROD}`);
});
