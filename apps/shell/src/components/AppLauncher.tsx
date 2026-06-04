import { useState, useEffect } from 'react';

const AUTH_URL =
  (import.meta.env.VITE_JKOS_AUTH_URL as string | undefined) ?? 'https://auth.jkos.net';

interface App {
  id:            string;
  name:          string;
  origin:        string;
  icon_url:      string | null;
  allowed_roles: string;
}

interface Props {
  user?: { role?: string } | null;
}

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

function AppCard({ app }: { app: App }) {
  const [hovered, setHovered] = useState(false);
  const domain = (() => {
    try { return new URL(app.origin).hostname; } catch { return app.origin; }
  })();

  return (
    <a
      href={app.origin}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '14px 16px',
        background: hovered ? 'var(--hub-bg-3)' : 'var(--hub-bg-2)',
        border: `1px solid ${hovered ? 'var(--hub-amber)' : 'var(--hub-line)'}`,
        boxShadow: hovered ? '0 0 14px var(--hub-amber-glow)' : 'none',
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'all 0.15s ease',
        textDecoration: 'none',
        minHeight: 100,
        position: 'relative',
      }}
    >
      {/* Accent LED */}
      <div style={{
        position: 'absolute', top: 10, left: 10,
        width: 6, height: 6, borderRadius: '50%',
        background: 'var(--hub-amber)',
        boxShadow: '0 0 6px var(--hub-amber-glow)',
        opacity: hovered ? 1 : 0.6,
        transition: 'opacity 0.15s',
      }} />

      {/* App icon / initials */}
      <div style={{
        width: 28, height: 28, marginLeft: 4, flexShrink: 0,
        background: 'var(--hub-amber-deep)',
        border: `1px solid ${hovered ? 'var(--hub-amber)' : 'var(--hub-line-strong)'}`,
        display: 'grid', placeItems: 'center',
        color: hovered ? 'var(--hub-amber-bright)' : 'var(--hub-amber-dim)',
        fontFamily: 'var(--hub-font-mono)',
        fontSize: 11, fontWeight: 700,
        transition: 'all 0.15s',
      }}>
        {app.icon_url
          ? <img src={app.icon_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          : initials(app.name)}
      </div>

      {/* App info */}
      <div style={{ marginTop: 10 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, letterSpacing: '0.08em',
          color: hovered ? 'var(--hub-cream-bright)' : 'var(--hub-cream)',
          fontFamily: 'var(--hub-font-mono)',
          transition: 'color 0.15s',
          lineHeight: 1.2,
        }}>
          {app.name}
        </div>
        <div style={{
          fontSize: 9, letterSpacing: '0.1em',
          color: 'var(--hub-cream-faint)',
          marginTop: 3,
          fontFamily: 'var(--hub-font-mono)',
        }}>
          {domain}
        </div>
      </div>

      {/* Arrow (visible on hover) */}
      {hovered && (
        <div style={{
          position: 'absolute', bottom: 12, right: 14,
          fontSize: 12, color: 'var(--hub-amber)',
          fontFamily: 'var(--hub-font-mono)',
        }}>↗</div>
      )}
    </a>
  );
}

export function AppLauncher({ user }: Props) {
  const [apps, setApps] = useState<App[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('ordeck-launcher-collapsed') === '1'; } catch { return false; }
  });

  useEffect(() => {
    fetch(`${AUTH_URL}/auth/apps`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        const filtered = (data.apps as App[]).filter(a =>
          a.allowed_roles === 'all' || !user?.role || a.allowed_roles === user.role
        );
        setApps(filtered);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [user?.role]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem('ordeck-launcher-collapsed', next ? '1' : '0'); } catch { /* ignore */ }
  };

  return (
    <div style={{
      flexShrink: 0,
      borderBottom: '1px solid var(--hub-line)',
      background: 'linear-gradient(180deg, var(--hub-bg-1), var(--hub-bg-0))',
    }}>
      {collapsed ? (
        /* Collapsed bar */
        <button
          onClick={toggleCollapsed}
          style={{
            width: '100%', height: 32,
            display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--hub-cream-dim)',
            fontFamily: 'var(--hub-font-mono)', fontSize: 9, letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          <span style={{ color: 'var(--hub-amber)' }}>▸</span>
          APPS {apps.length > 0 ? `(${apps.length})` : ''}
        </button>
      ) : (
        /* Expanded launcher */
        <div style={{ padding: '16px 16px 12px' }}>
          {/* Section header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 12,
          }}>
            <span style={{
              fontSize: 8, letterSpacing: '0.22em',
              color: 'var(--hub-cream-faint)',
              fontFamily: 'var(--hub-font-mono)',
              textTransform: 'uppercase',
            }}>
              APPS · SUITE
            </span>
            <button
              onClick={toggleCollapsed}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--hub-cream-faint)',
                fontFamily: 'var(--hub-font-mono)', fontSize: 9,
                letterSpacing: '0.1em', padding: '2px 6px',
              }}
            >▾</button>
          </div>

          {/* App grid */}
          {status === 'loading' && (
            <div style={{ fontSize: 9, color: 'var(--hub-cream-faint)', letterSpacing: '0.18em', fontFamily: 'var(--hub-font-mono)', padding: '8px 0' }}>
              POLLING REGISTRY…
            </div>
          )}
          {status === 'error' && (
            <div style={{ fontSize: 9, color: 'var(--hub-red)', letterSpacing: '0.12em', fontFamily: 'var(--hub-font-mono)', padding: '8px 0' }}>
              REGISTRY UNREACHABLE
            </div>
          )}
          {status === 'ready' && apps.length === 0 && (
            <div style={{ fontSize: 9, color: 'var(--hub-cream-faint)', letterSpacing: '0.12em', fontFamily: 'var(--hub-font-mono)', padding: '8px 0' }}>
              NO APPS REGISTERED
            </div>
          )}
          {status === 'ready' && apps.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 8,
            }}>
              {apps.map(app => <AppCard key={app.id} app={app} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
