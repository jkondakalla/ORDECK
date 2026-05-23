const express = require('express');
const path    = require('path');
const sqlite3 = require('sqlite3').verbose();
const { google } = require('googleapis');

const PORT    = process.env.PORT    || 8003;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'beigeBoard.db');

const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI  = process.env.GOOGLE_REDIRECT_URI
  || `http://localhost:${PORT}/api/auth/google/callback`;

function makeOAuth2() {
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

/* ── Microsoft / Outlook ───────────────────────────────────────────── */
const MS_CLIENT_ID     = process.env.MICROSOFT_CLIENT_ID;
const MS_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const MS_REDIRECT_URI  = process.env.MICROSOFT_REDIRECT_URI
  || `http://localhost:${PORT}/api/auth/outlook/callback`;
const MS_AUTH_URL  = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const MS_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const MS_GRAPH     = 'https://graph.microsoft.com/v1.0';

async function getMsToken(row) {
  if (!row.expiry_ms || Date.now() < row.expiry_ms - 60000) return row.access_token;
  const r = await fetch(MS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: MS_CLIENT_ID, client_secret: MS_CLIENT_SECRET,
      refresh_token: row.refresh_token, grant_type: 'refresh_token',
    }).toString(),
  });
  const t = await r.json();
  if (t.error) throw new Error(t.error_description || t.error);
  const expiry = Date.now() + (t.expires_in || 3600) * 1000;
  await run(`UPDATE calendar_tokens SET access_token=?, expiry_ms=? WHERE provider='outlook'`,
    [t.access_token, expiry]);
  return t.access_token;
}

async function syncOutlookEvents(token) {
  const now = new Date();
  const end = new Date(now.getTime() + 90 * 86400000);
  const url = `${MS_GRAPH}/me/calendarView` +
    `?startDateTime=${now.toISOString()}&endDateTime=${end.toISOString()}` +
    `&$top=500&$select=subject,start,end,isAllDay,location,bodyPreview`;
  const r    = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.timezone="UTC"' } });
  const data = await r.json();
  if (data.error) throw new Error(data.error.message);

  await run("DELETE FROM items WHERE source='outlook'");
  for (const ev of data.value || []) {
    const isAllDay = !!ev.isAllDay;
    const sd = new Date(ev.start.dateTime + (ev.start.timeZone === 'UTC' ? 'Z' : ''));
    const ed = new Date(ev.end.dateTime   + (ev.end.timeZone   === 'UTC' ? 'Z' : ''));
    const due_date = isoDateStr(sd);
    let end_date = null;
    if (isAllDay) {
      const adj = new Date(ed); adj.setDate(adj.getDate() - 1);
      const s = isoDateStr(adj); if (s !== due_date) end_date = s;
    }
    await run(
      `INSERT INTO items (kind,scope,title,notes,source,due_date,scheduled_time,scheduled_end,location,end_date)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      ['event','day', ev.subject||'(No title)', ev.bodyPreview||null, 'outlook',
       due_date, isAllDay?null:fmt24(sd), isAllDay?null:fmt24(ed),
       ev.location?.displayName||null, end_date]
    );
  }
  return (data.value||[]).length;
}

/* ── iCloud CalDAV ─────────────────────────────────────────────────── */
const ICLOUD_CALDAV = 'https://caldav.icloud.com';

function basicAuth(u, p) { return 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64'); }

async function caldavReq(url, method, body, username, password, depth = '0') {
  const r = await fetch(url, {
    method,
    headers: {
      Authorization: basicAuth(username, password),
      'Content-Type': 'application/xml; charset=utf-8',
      Depth: depth,
    },
    body,
  });
  if (r.status === 401) { const e = new Error('Unauthorized'); e.status = 401; throw e; }
  if (!r.ok && r.status !== 207) throw new Error(`CalDAV ${method} ${r.status}: ${r.statusText}`);
  return { text: await r.text(), finalUrl: r.url };
}

function xmlTag(xml, tag) {
  const m = xml.match(new RegExp(`<(?:[^:>]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[^:>]+:)?${tag}>`, 'i'));
  return m ? m[1].trim() : null;
}

function xmlTagAll(xml, tag) {
  const re = new RegExp(`<(?:[^:>]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[^:>]+:)?${tag}>`, 'gi');
  const out = []; let m;
  while ((m = re.exec(xml)) !== null) out.push(m[1].trim());
  return out;
}

function xmlHref(block) {
  const m = block.match(/<(?:[^:>]+:)?href[^>]*>([^<]+)<\/(?:[^:>]+:)?href>/i);
  return m ? m[1].trim() : null;
}

function resolveHref(base, href) {
  if (/^https?:\/\//i.test(href)) return href;
  const u = new URL(base); return `${u.protocol}//${u.host}${href}`;
}

function parseVEvents(ical) {
  const text = ical.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const events = []; let ev = null;
  for (const line of text.split(/\r?\n/)) {
    if (line === 'BEGIN:VEVENT') { ev = {}; continue; }
    if (line === 'END:VEVENT')   { if (ev) events.push(ev); ev = null; continue; }
    if (!ev) continue;
    const ci = line.indexOf(':'); if (ci < 0) continue;
    const key = line.slice(0, ci), val = line.slice(ci + 1);
    const base = key.split(';')[0].toUpperCase();
    ev[base] = { val, params: key.slice(base.length) };
  }
  return events;
}

function icalDate(prop) {
  if (!prop) return null;
  const allDay = /VALUE=DATE/i.test(prop.params) || /^\d{8}$/.test(prop.val.trim());
  const v   = prop.val.trim().replace(/Z$/, '');
  const iso = `${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}`;
  return allDay
    ? { iso, time: null, allDay: true }
    : { iso, time: `${v.slice(9,11)}:${v.slice(11,13)}`, allDay: false };
}

function icalText(prop) {
  if (!prop?.val) return null;
  return prop.val.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}

async function syncICloudEvents(username, password) {
  /* 1 — discover principal URL */
  const { text: p0, finalUrl: base0 } = await caldavReq(
    ICLOUD_CALDAV,
    'PROPFIND',
    `<?xml version="1.0"?><D:propfind xmlns:D="DAV:"><D:prop><D:current-user-principal/></D:prop></D:propfind>`,
    username, password, '0'
  );
  const principalHref = xmlHref(xmlTag(p0, 'current-user-principal') || '');
  if (!principalHref) throw new Error('iCloud CalDAV: could not discover principal');

  /* 2 — discover calendar-home-set */
  const principalUrl = resolveHref(base0, principalHref);
  const { text: p1, finalUrl: base1 } = await caldavReq(
    principalUrl,
    'PROPFIND',
    `<?xml version="1.0"?><D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav"><D:prop><C:calendar-home-set/></D:prop></D:propfind>`,
    username, password, '0'
  );
  const homeHref = xmlHref(xmlTag(p1, 'calendar-home-set') || '');
  if (!homeHref) throw new Error('iCloud CalDAV: could not discover calendar home');

  /* 3 — list calendars (Depth:1 on home) */
  const homeUrl = resolveHref(base1, homeHref);
  const { text: p2 } = await caldavReq(
    homeUrl,
    'PROPFIND',
    `<?xml version="1.0"?><D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav"><D:prop><D:resourcetype/><D:displayname/></D:prop></D:propfind>`,
    username, password, '1'
  );
  const calUrls = xmlTagAll(p2, 'response')
    .filter(b => /<(?:[^:>]+:)?calendar\s*\/>/i.test(b))
    .map(b => xmlHref(b))
    .filter(Boolean)
    .map(href => resolveHref(homeUrl, href));

  if (!calUrls.length) throw new Error('iCloud CalDAV: no calendars found');

  /* 4 — REPORT each calendar for events in the next 90 days */
  const now = new Date(), far = new Date(now.getTime() + 90 * 86400000);
  const startZ = now.toISOString().replace(/[-:]/g,'').slice(0,15) + 'Z';
  const endZ   = far.toISOString().replace(/[-:]/g,'').slice(0,15) + 'Z';

  await run("DELETE FROM items WHERE source='icloud'");
  let total = 0;

  for (const calUrl of calUrls) {
    let reportText;
    try {
      const { text } = await caldavReq(calUrl, 'REPORT',
        `<?xml version="1.0"?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop><D:getetag/><C:calendar-data/></D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="${startZ}" end="${endZ}"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`,
        username, password, '1');
      reportText = text;
    } catch (e) { console.warn(`iCloud: skipping ${calUrl}: ${e.message}`); continue; }

    const calDatas = xmlTagAll(reportText, 'calendar-data')
      .map(s => s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&#13;/g,'\r'));

    for (const icalRaw of calDatas) {
      for (const ev of parseVEvents(icalRaw)) {
        if (ev['RRULE']) {
          console.warn(`iCloud: recurring event "${icalText(ev['SUMMARY'])}" — only the next occurrence will appear; full recurrence expansion not supported`);
        }
        const start = icalDate(ev['DTSTART']);
        const end   = icalDate(ev['DTEND']);
        if (!start) continue;

        let end_date = null;
        if (start.allDay && end) {
          const ed = new Date(end.iso + 'T00:00:00Z'); ed.setDate(ed.getDate() - 1);
          const s = isoDateStr(ed); if (s !== start.iso) end_date = s;
        } else if (!start.allDay && end && end.iso !== start.iso) {
          end_date = end.iso;
        }

        await run(
          `INSERT INTO items (kind,scope,title,notes,source,due_date,scheduled_time,scheduled_end,location,end_date)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
          ['event','day',
           icalText(ev['SUMMARY']) || '(No title)',
           icalText(ev['DESCRIPTION']),
           'icloud', start.iso, start.time, end?.time||null,
           icalText(ev['LOCATION']), end_date]
        );
        total++;
      }
    }
  }
  return total;
}

const app = express();

/* ── CORS — widget (3003) calls API (8003) ─────────────────────────── */
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());

/* ── Database ──────────────────────────────────────────────────────── */
const db = new sqlite3.Database(DB_PATH);

const run = (sql, p = []) => new Promise((res, rej) =>
  db.run(sql, p, function (e) { e ? rej(e) : res(this); }));
const all = (sql, p = []) => new Promise((res, rej) =>
  db.all(sql, p, (e, r) => e ? rej(e) : res(r)));
const get = (sql, p = []) => new Promise((res, rej) =>
  db.get(sql, p, (e, r) => e ? rej(e) : res(r)));

function isoDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function fmt24(d) {
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

async function syncGoogleEvents(auth) {
  const calendar = google.calendar({ version: 'v3', auth });
  const now = new Date();
  const { data } = await calendar.events.list({
    calendarId: 'primary',
    timeMin: now.toISOString(),
    timeMax: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 500,
  });

  await run("DELETE FROM items WHERE source = 'google'");

  for (const ev of (data.items || [])) {
    const start    = ev.start?.dateTime || ev.start?.date;
    if (!start) continue;
    const isAllDay = !!ev.start?.date;
    const sd       = new Date(start);
    const due_date = isoDateStr(sd);

    let end_date = null;
    if (ev.end) {
      const rawEnd = ev.end.dateTime || ev.end.date;
      if (rawEnd) {
        const edObj = new Date(rawEnd);
        if (isAllDay) edObj.setDate(edObj.getDate() - 1);
        const endStr = isoDateStr(edObj);
        if (endStr !== due_date) end_date = endStr;
      }
    }

    await run(
      `INSERT INTO items (kind,scope,title,notes,source,due_date,scheduled_time,scheduled_end,location,end_date)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      ['event','day', ev.summary || '(No title)', ev.description || null, 'google',
       due_date,
       isAllDay ? null : fmt24(sd),
       (ev.end?.dateTime && !isAllDay) ? fmt24(new Date(ev.end.dateTime)) : null,
       ev.location || null, end_date]
    );
  }
  return (data.items || []).length;
}

async function init() {
  await run(`CREATE TABLE IF NOT EXISTS calendar_tokens (
    provider      TEXT PRIMARY KEY,
    access_token  TEXT,
    refresh_token TEXT,
    expiry_ms     INTEGER,
    email         TEXT
  )`);

  await run(`CREATE TABLE IF NOT EXISTS items (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    kind           TEXT    NOT NULL DEFAULT 'task',
    scope          TEXT    NOT NULL DEFAULT 'day',
    title          TEXT    NOT NULL,
    notes          TEXT,
    parent_id      INTEGER,
    accent         TEXT,
    source         TEXT    DEFAULT 'bb',
    completed      INTEGER DEFAULT 0,
    year           INTEGER,
    month          INTEGER,
    week_start     TEXT,
    due_date       TEXT,
    scheduled_time TEXT,
    scheduled_end  TEXT,
    end_date       TEXT,
    location       TEXT,
    attendees      INTEGER,
    target         TEXT,
    created_at     TEXT    DEFAULT (datetime('now'))
  )`);

  try { await run('ALTER TABLE items ADD COLUMN end_date TEXT'); } catch(e) {
    if (!String(e).includes('duplicate column name')) throw e;
  }

  const count = await get('SELECT COUNT(*) as n FROM items');
  if (count.n === 0) await seedDefaults();
}

async function seedDefaults() {
  const now = new Date();
  const yr  = now.getFullYear();
  const mo  = now.getMonth() + 1;

  const d = new Date(now);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const weekStr = d.toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  const ins = async (data) => {
    const cols = Object.keys(data).join(', ');
    const phs  = Object.keys(data).map(() => '?').join(', ');
    const r = await run(`INSERT INTO items (${cols}) VALUES (${phs})`, Object.values(data));
    return r.lastID;
  };

  const g1 = await ins({ kind: 'goal', scope: 'year', title: 'Build something meaningful', accent: '#B85C3A', year: yr, source: 'bb' });
  const g2 = await ins({ kind: 'goal', scope: 'year', title: 'Stay healthy and consistent', accent: '#5A8A5A', year: yr, source: 'bb' });

  const m1 = await ins({ kind: 'goal', scope: 'month', title: 'Ship a working prototype', accent: '#B85C3A', parent_id: g1, year: yr, month: mo, source: 'bb' });
  const m2 = await ins({ kind: 'goal', scope: 'month', title: 'Establish a daily routine', accent: '#5A8A5A', parent_id: g2, year: yr, month: mo, source: 'bb' });

  const w1 = await ins({ kind: 'goal', scope: 'week', title: 'Foundation — get the basics running', accent: '#B85C3A', parent_id: m1, week_start: weekStr, source: 'bb' });
  const w2 = await ins({ kind: 'goal', scope: 'week', title: 'First week of the new routine', accent: '#5A8A5A', parent_id: m2, week_start: weekStr, source: 'bb' });

  await ins({ kind: 'task', scope: 'day', title: 'Define the core feature set', accent: '#B85C3A', parent_id: w1, due_date: todayStr, source: 'bb' });
  await ins({ kind: 'task', scope: 'day', title: 'Set up the project structure', accent: '#B85C3A', parent_id: w1, due_date: todayStr, source: 'bb' });
  await ins({ kind: 'task', scope: 'day', title: 'Morning stretch — 15 min', accent: '#5A8A5A', parent_id: w2, due_date: todayStr, scheduled_time: '07:00', scheduled_end: '07:15', source: 'bb' });
}

function toRow(raw) {
  if (!raw) return null;
  return { ...raw, completed: raw.completed === 1 };
}

async function cascadeDelete(id) {
  const children = await all('SELECT id FROM items WHERE parent_id = ?', [id]);
  for (const c of children) await cascadeDelete(c.id);
  await run('DELETE FROM items WHERE id = ?', [id]);
}

/* ── Routes ────────────────────────────────────────────────────────── */
app.get('/api/items', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM items ORDER BY id ASC');
    res.json(rows.map(toRow));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/items', async (req, res) => {
  try {
    const d = req.body;
    const cols = Object.keys(d).filter(k => k !== 'id').join(', ');
    const phs  = Object.keys(d).filter(k => k !== 'id').map(() => '?').join(', ');
    const vals = Object.keys(d).filter(k => k !== 'id').map(k =>
      typeof d[k] === 'boolean' ? (d[k] ? 1 : 0) : d[k]);
    const r = await run(`INSERT INTO items (${cols}) VALUES (${phs})`, vals);
    const row = await get('SELECT * FROM items WHERE id = ?', [r.lastID]);
    res.status(201).json(toRow(row));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const d = req.body;
    const sets = Object.keys(d).map(k => `${k} = ?`).join(', ');
    const vals = Object.keys(d).map(k =>
      typeof d[k] === 'boolean' ? (d[k] ? 1 : 0) : d[k]);
    await run(`UPDATE items SET ${sets} WHERE id = ?`, [...vals, id]);
    const row = await get('SELECT * FROM items WHERE id = ?', [id]);
    res.json(toRow(row));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/items/:id', async (req, res) => {
  try {
    await cascadeDelete(parseInt(req.params.id, 10));
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ── Google Calendar OAuth ─────────────────────────────────────────── */
app.get('/api/auth/google', (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(501).send(
      'Google credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars.'
    );
  }
  const url = makeOAuth2().generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    prompt: 'consent',
  });
  res.redirect(url);
});

app.get('/api/auth/google/callback', async (req, res) => {
  const { code, error } = req.query;
  const close = (msg) => res.send(
    `<script>window.opener?.postMessage(${JSON.stringify(msg)},'*');window.close();</script>`
  );
  if (error) return close({ type: 'google-auth-error', error });
  try {
    const oauth2 = makeOAuth2();
    const { tokens } = await oauth2.getToken(code);
    oauth2.setCredentials(tokens);

    const { data: u } = await google.oauth2({ version: 'v2', auth: oauth2 }).userinfo.get();

    await run(
      `INSERT OR REPLACE INTO calendar_tokens (provider,access_token,refresh_token,expiry_ms,email)
       VALUES (?,?,?,?,?)`,
      ['google', tokens.access_token, tokens.refresh_token || null, tokens.expiry_date || null, u.email]
    );

    oauth2.on('tokens', async t => {
      const fields = t.refresh_token
        ? `access_token=?,refresh_token=?,expiry_ms=?`
        : `access_token=?,expiry_ms=?`;
      const vals = t.refresh_token
        ? [t.access_token, t.refresh_token, t.expiry_date]
        : [t.access_token, t.expiry_date];
      await run(`UPDATE calendar_tokens SET ${fields} WHERE provider='google'`, vals);
    });

    await syncGoogleEvents(oauth2);
    close({ type: 'google-auth-success', email: u.email });
  } catch (e) {
    console.error('Google auth callback error:', e);
    close({ type: 'google-auth-error', error: e.message });
  }
});

app.get('/api/auth/google/status', async (req, res) => {
  try {
    const row = await get('SELECT email FROM calendar_tokens WHERE provider = ?', ['google']);
    res.json({ connected: !!row, email: row?.email || null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/auth/google', async (req, res) => {
  try {
    await run("DELETE FROM calendar_tokens WHERE provider = 'google'");
    await run("DELETE FROM items WHERE source = 'google'");
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/calendar/google/sync', async (req, res) => {
  try {
    const row = await get('SELECT * FROM calendar_tokens WHERE provider = ?', ['google']);
    if (!row) return res.status(401).json({ error: 'Not connected' });
    const oauth2 = makeOAuth2();
    oauth2.setCredentials({ access_token: row.access_token, refresh_token: row.refresh_token, expiry_date: row.expiry_ms });
    oauth2.on('tokens', async t => {
      const fields = t.refresh_token ? `access_token=?,refresh_token=?,expiry_ms=?` : `access_token=?,expiry_ms=?`;
      const vals   = t.refresh_token ? [t.access_token, t.refresh_token, t.expiry_date] : [t.access_token, t.expiry_date];
      await run(`UPDATE calendar_tokens SET ${fields} WHERE provider='google'`, vals);
    });
    const count = await syncGoogleEvents(oauth2);
    res.json({ ok: true, synced: count });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ── Outlook / Microsoft Calendar OAuth ───────────────────────────── */
app.get('/api/auth/outlook', (req, res) => {
  if (!MS_CLIENT_ID || !MS_CLIENT_SECRET) {
    return res.status(501).send(
      'Microsoft credentials not configured. Set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET env vars.'
    );
  }
  const params = new URLSearchParams({
    client_id: MS_CLIENT_ID,
    response_type: 'code',
    redirect_uri: MS_REDIRECT_URI,
    scope: 'offline_access Calendars.Read User.Read',
    response_mode: 'query',
  });
  res.redirect(`${MS_AUTH_URL}?${params}`);
});

app.get('/api/auth/outlook/callback', async (req, res) => {
  const { code, error } = req.query;
  const close = (msg) => res.send(
    `<script>window.opener?.postMessage(${JSON.stringify(msg)},'*');window.close();</script>`
  );
  if (error) return close({ type: 'outlook-auth-error', error });
  try {
    const r = await fetch(MS_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: MS_CLIENT_ID, client_secret: MS_CLIENT_SECRET,
        code, redirect_uri: MS_REDIRECT_URI, grant_type: 'authorization_code',
      }).toString(),
    });
    const t = await r.json();
    if (t.error) return close({ type: 'outlook-auth-error', error: t.error_description || t.error });

    const expiry = Date.now() + (t.expires_in || 3600) * 1000;
    const me = await fetch(`${MS_GRAPH}/me?$select=mail,userPrincipalName`, {
      headers: { Authorization: `Bearer ${t.access_token}` },
    }).then(r => r.json());
    const email = me.mail || me.userPrincipalName || '';

    await run(
      `INSERT OR REPLACE INTO calendar_tokens (provider,access_token,refresh_token,expiry_ms,email)
       VALUES (?,?,?,?,?)`,
      ['outlook', t.access_token, t.refresh_token || null, expiry, email]
    );

    await syncOutlookEvents(t.access_token);
    close({ type: 'outlook-auth-success', email });
  } catch (e) {
    console.error('Outlook auth callback error:', e);
    close({ type: 'outlook-auth-error', error: e.message });
  }
});

app.get('/api/auth/outlook/status', async (req, res) => {
  try {
    const row = await get('SELECT email FROM calendar_tokens WHERE provider = ?', ['outlook']);
    res.json({ connected: !!row, email: row?.email || null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/auth/outlook', async (req, res) => {
  try {
    await run("DELETE FROM calendar_tokens WHERE provider = 'outlook'");
    await run("DELETE FROM items WHERE source = 'outlook'");
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/calendar/outlook/sync', async (req, res) => {
  try {
    const row = await get('SELECT * FROM calendar_tokens WHERE provider = ?', ['outlook']);
    if (!row) return res.status(401).json({ error: 'Not connected' });
    const token = await getMsToken(row);
    const count = await syncOutlookEvents(token);
    res.json({ ok: true, synced: count });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ── iCloud CalDAV credential auth ────────────────────────────────── */
app.post('/api/auth/icloud', async (req, res) => {
  const { username, appPassword } = req.body || {};
  if (!username || !appPassword) return res.status(400).json({ error: 'username and appPassword required' });
  try {
    const count = await syncICloudEvents(username, appPassword);
    await run(
      `INSERT OR REPLACE INTO calendar_tokens (provider,access_token,refresh_token,expiry_ms,email)
       VALUES (?,?,?,?,?)`,
      ['icloud', appPassword, null, null, username]
    );
    res.json({ ok: true, synced: count, email: username });
  } catch (e) {
    const status = e.status === 401 ? 401 : 500;
    res.status(status).json({ error: e.message });
  }
});

app.get('/api/auth/icloud/status', async (req, res) => {
  try {
    const row = await get('SELECT email FROM calendar_tokens WHERE provider = ?', ['icloud']);
    res.json({ connected: !!row, email: row?.email || null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/auth/icloud', async (req, res) => {
  try {
    await run("DELETE FROM calendar_tokens WHERE provider = 'icloud'");
    await run("DELETE FROM items WHERE source = 'icloud'");
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/calendar/icloud/sync', async (req, res) => {
  try {
    const row = await get('SELECT * FROM calendar_tokens WHERE provider = ?', ['icloud']);
    if (!row) return res.status(401).json({ error: 'Not connected' });
    const count = await syncICloudEvents(row.email, row.access_token);
    res.json({ ok: true, synced: count });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ── Health check ──────────────────────────────────────────────────── */
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'beigeboard' }));
app.get('/status', async (req, res) => {
  try {
    const count = await get('SELECT COUNT(*) as n FROM items');
    res.json({ online: true, label: `${count.n} items` });
  } catch { res.json({ online: false, label: 'DB error' }); }
});

/* ── Boot ──────────────────────────────────────────────────────────── */
init().then(() => {
  app.listen(PORT, () => console.log(`BeigeBoard API running on :${PORT}`));
}).catch(e => { console.error('DB init failed:', e); process.exit(1); });
