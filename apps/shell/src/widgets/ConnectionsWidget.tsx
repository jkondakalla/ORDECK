import { useEffect, useState, ReactNode } from 'react';
import { WidgetManifest, WidgetStatus } from '@hub/types';
import usePlugins from '../hooks/usePlugins';

export default function ConnectionsWidget() {
  const { plugins, loading, error } = usePlugins(8000);
  const [statuses, setStatuses] = useState<Record<string, WidgetStatus>>({});

  useEffect(() => {
    if (!plugins.length) return;

    plugins.forEach(async (p: WidgetManifest) => {
      try {
        const res = await fetch(`/api/plugins/${p.id}/status`);
        if (res.ok) {
          const data: WidgetStatus = await res.json();
          setStatuses(s => ({ ...s, [p.id]: data }));
        }
      } catch {
        setStatuses(s => ({ ...s, [p.id]: { online: false } }));
      }
    });
  }, [plugins]);

  if (loading) return <Empty>POLLING CONNECTIONS...</Empty>;
  if (error) return <Empty warn>BACKEND UNREACHABLE</Empty>;
  if (!plugins.length) return <Empty>NO PLUGINS REGISTERED</Empty>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {plugins.map((p: WidgetManifest) => {
        const st = statuses[p.id];
        const online = st?.online ?? null;
        const ledClass = online === null ? 'amber' : online ? 'green' : 'red';
        const statusLabel = online === null ? 'CHK' : online ? 'ACT' : 'OFF';

        return (
          <div key={p.id} style={{
            display: 'flex', alignItems: 'center',
            padding: '8px 10px',
            background: 'var(--hub-bg-2)',
            border: '1px solid var(--hub-line)',
            gap: 10, fontSize: 11,
          }}>
            <span className={`led ${ledClass}`} />
            <div style={{ flex: 1 }}>
              <div style={{ color: 'var(--hub-cream)', fontWeight: 500 }}>
                {p.id.toUpperCase()}
              </div>
              <div style={{ color: 'var(--hub-cream-dim)', fontSize: 9, letterSpacing: '0.1em' }}>
                {p.description || p.version || '—'}
              </div>
            </div>
            <span style={{
              fontSize: 9, letterSpacing: '0.12em',
              padding: '2px 6px',
              border: `1px solid currentColor`,
              color: online === null ? 'var(--hub-amber)' : online ? 'var(--hub-green)' : 'var(--hub-red)',
            }}>
              {statusLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Empty({ children, warn }: { children: ReactNode; warn?: boolean }) {
  return (
    <div style={{
      height: '100%', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontSize: 10, letterSpacing: '0.1em',
      color: warn ? 'var(--hub-red)' : 'var(--hub-cream-dim)',
    }}>
      {children}
    </div>
  );
}
