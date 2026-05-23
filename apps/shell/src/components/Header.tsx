import { useEffect, useState, ReactNode } from 'react';
import { Led, Screw, Vent, DymoTape } from './hardware';
import { ConfigButton } from './settings';

// ─── Hooks ────────────────────────────────────────────────────────────────────

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

// ─── Header ───────────────────────────────────────────────────────────────────

interface HeaderProps {
  pluginCount?: number;
  widgetCount?: number;
  totalLoad?: number;
  alerts?: number;
  onOpenConfig?: () => void;
  configOpen?: boolean;
}

export default function Header({
  pluginCount = 0,
  widgetCount,
  totalLoad = 0,
  alerts = 0,
  onOpenConfig,
  configOpen = false,
}: HeaderProps) {
  const utc = useUTCClock();
  const count = widgetCount ?? pluginCount;

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      height: 'var(--hub-header-h)',
      background: 'linear-gradient(180deg, var(--hub-bg-3) 0%, var(--hub-bg-1) 100%)',
      borderBottom: '1px solid var(--hub-line-strong)',
      boxShadow: '0 1px 0 rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,220,160,0.04)',
      display: 'flex', alignItems: 'stretch',
      zIndex: 100,
    }}>
      {/* Logo / brand block */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '0 18px 0 16px',
        borderRight: '1px solid var(--hub-line)',
        background: 'linear-gradient(180deg, var(--hub-bg-3), var(--hub-bg-2))',
        minWidth: 'var(--hub-sidebar-w)',
        flexShrink: 0,
      }}>
        <div style={{ position: 'relative' }}>
          <Screw size={7} rot={20} style={{ position: 'absolute', top: -10, left: -8 }} />
          <Screw size={7} rot={-15} style={{ position: 'absolute', bottom: -10, left: -8 }} />
          <div style={{
            width: 34, height: 34,
            border: '1.5px solid var(--hub-amber)',
            color: 'var(--hub-amber)',
            display: 'grid', placeItems: 'center',
            fontWeight: 800, fontSize: 16, letterSpacing: '0.02em',
            boxShadow: '0 0 12px var(--hub-amber-glow), inset 0 0 8px color-mix(in srgb, var(--hub-amber) 20%, transparent)',
            background: 'radial-gradient(circle at 30% 25%, var(--hub-bg-3), var(--hub-bg-0))',
            fontFamily: 'var(--hub-font-seg)',
          }}>JK</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{
            color: 'var(--hub-amber)', fontWeight: 700,
            letterSpacing: '0.18em', fontSize: 16,
            textShadow: '0 0 6px var(--hub-amber-glow)',
            fontFamily: 'var(--hub-font-seg)',
            lineHeight: 1,
          }}>ORDECK</div>
          <div style={{ color: 'var(--hub-cream-dim)', fontSize: 9, letterSpacing: '0.22em', marginTop: 4 }}>
            CONTROL SURFACE · v1.2.0
          </div>
        </div>
        <DymoTape style={{ marginLeft: 'auto', fontSize: 9 }}>OP-DECK</DymoTape>
      </div>

      {/* Stat cluster */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 22 }}>
        <Stat label="OPERATOR" value="JAG" />
        <Divider />
        <Stat label="MODULES" value={String(count).padStart(2, '0')} />
        <Divider />
        <Stat label="CORE">
          <Led color="green" size="sm" style={{ marginRight: 6 }} />
          <span style={{ color: 'var(--hub-amber)' }} className="glow-dim">NOMINAL</span>
        </Stat>
        <Divider />
        <Stat label="LOAD">
          <span style={{ color: 'var(--hub-amber)', fontVariantNumeric: 'tabular-nums' }} className="glow-dim">
            {Math.round(totalLoad * 100).toString().padStart(2, '0')}%
          </span>
        </Stat>
        <Divider />
        <Stat label="ALERTS">
          {alerts > 0 ? (
            <>
              <Led color="red" size="sm" style={{ marginRight: 6 }} />
              <span style={{ color: 'var(--hub-red)' }}>{alerts}</span>
            </>
          ) : (
            <>
              <Led off size="sm" style={{ marginRight: 6 }} />
              <span style={{ color: 'var(--hub-cream-dim)' }}>—</span>
            </>
          )}
        </Stat>
      </div>

      {/* Right cluster: session + UTC + config + vent */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '0 16px',
        borderLeft: '1px solid var(--hub-line)',
        background: 'linear-gradient(180deg, var(--hub-bg-3), var(--hub-bg-1))',
      }}>
        <Stat label="SESSION" value={SESSION_ID} />
        <div style={{
          padding: '5px 10px',
          background: 'var(--hub-bg-0)',
          border: '1px solid var(--hub-line)',
          boxShadow: 'inset 0 0 6px rgba(0,0,0,0.7)',
          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
        }}>
          <span className="mono-eyebrow">UTC</span>
          <span style={{
            color: 'var(--hub-amber)', fontSize: 16, fontWeight: 500,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.08em',
            fontFamily: 'var(--hub-font-seg)',
          }} className="glow">{utc || '00:00:00'}</span>
        </div>
        {onOpenConfig && (
          <ConfigButton open={configOpen} onClick={onOpenConfig} />
        )}
        <Vent slats={4} width={32} />
      </div>
    </header>
  );
}

// ─── Internals ────────────────────────────────────────────────────────────────

function Divider() {
  return <span style={{ width: 1, height: 32, background: 'var(--hub-line)', flexShrink: 0 }} />;
}

function Stat({ label, value, children, style }: {
  label: string;
  value?: string | number;
  children?: ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15, gap: 2, flexShrink: 0, ...style }}>
      <span className="mono-eyebrow">{label}</span>
      <span style={{
        fontSize: 12, color: 'var(--hub-cream)', fontWeight: 500,
        letterSpacing: '0.05em', display: 'flex', alignItems: 'center', minHeight: 16,
      }}>
        {children ?? value}
      </span>
    </div>
  );
}
