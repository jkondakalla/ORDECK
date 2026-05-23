import { useEffect, useState, ReactNode } from 'react';

function useUTCClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const fmt = () => {
      const n = new Date();
      return [n.getUTCHours(), n.getUTCMinutes(), n.getUTCSeconds()]
        .map(v => String(v).padStart(2, '0')).join(':');
    };
    setTime(fmt());
    const iv = setInterval(() => setTime(fmt()), 1000);
    return () => clearInterval(iv);
  }, []);
  return time;
}

const SESSION_ID = 'SX-' + String(Math.floor(Math.random() * 9000) + 1000);

export default function Header({ pluginCount = 0 }: { pluginCount?: number }) {
  const utc = useUTCClock();

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      height: 'var(--hub-header-h)',
      background: 'linear-gradient(180deg, var(--hub-bg-2) 0%, var(--hub-bg-1) 100%)',
      borderBottom: '1px solid var(--hub-line-strong)',
      display: 'flex', alignItems: 'center',
      padding: '0 20px',
      zIndex: 100,
      gap: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <div style={{
          width: 28, height: 28,
          border: '1.5px solid var(--hub-amber)',
          color: 'var(--hub-amber)',
          display: 'grid', placeItems: 'center',
          fontWeight: 700, fontSize: 14,
          boxShadow: '0 0 12px var(--hub-amber-glow), inset 0 0 8px rgba(255,176,0,0.15)',
          alignSelf: 'center',
          flexShrink: 0,
        }}>J</div>
        <div>
          <div style={{
            color: 'var(--hub-amber)', fontWeight: 600,
            letterSpacing: '0.08em', fontSize: 13,
            textShadow: '0 0 6px var(--hub-amber-glow)',
          }}>ORDECK</div>
          <div style={{ color: 'var(--hub-cream-dim)', fontSize: 10, letterSpacing: '0.15em' }}>
            // CONTROL SURFACE v1.0.0
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 18, marginLeft: 'auto', alignItems: 'center' }}>
        <Stat label="OPERATOR" value="JAG" />
        <Stat label="MODULES" value={pluginCount} />
        <Stat label="CORE">
          <span className="led green" style={{ marginRight: 6 }} />
          <span style={{ color: 'var(--hub-amber)', textShadow: '0 0 4px var(--hub-amber-glow)' }}>NOMINAL</span>
        </Stat>
        <Stat label="SESSION" value={SESSION_ID} />
        <Stat label="UTC">
          <span style={{ color: 'var(--hub-amber)', textShadow: '0 0 4px var(--hub-amber-glow)', fontVariantNumeric: 'tabular-nums' }}>
            {utc}
          </span>
        </Stat>
      </div>
    </header>
  );
}

function Stat({ label, value, children }: { label: string; value?: string | number; children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
      <span style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--hub-cream-dim)', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontSize: 12, color: 'var(--hub-cream)', fontWeight: 500, letterSpacing: '0.05em', display: 'flex', alignItems: 'center' }}>
        {children ?? value}
      </span>
    </div>
  );
}
