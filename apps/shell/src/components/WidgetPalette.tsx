import { useState } from 'react';
import { WidgetType } from '@hub/types';
import { Led } from './hardware';

export interface PaletteEntry {
  type: WidgetType;
  label: string;
  subtitle?: string;
  code: string;
  glyph: string;
  color: string;
  led?: 'amber' | 'cyan' | 'green' | 'red';
  tool?: boolean;
  deco?: boolean;
  remote?: boolean;
}

export interface ActiveSession {
  id: number;
  label: string;
}

interface Props {
  registry?: PaletteEntry[];
  sessions?: ActiveSession[];
  collapsed?: boolean;
  onToggle?: () => void;
  onAddWidget: (type: WidgetType) => void;
  onResetLayout: () => void;
  onClearAll: () => void;
}

export default function WidgetPalette({
  registry = [],
  sessions = [],
  collapsed = false,
  onToggle,
  onAddWidget,
  onResetLayout,
  onClearAll,
}: Props) {
  const shell   = registry.filter(d => !d.remote && !d.tool && !d.deco);
  const tools   = registry.filter(d => d.tool);
  const deco    = registry.filter(d => d.deco);
  const remotes = registry.filter(d => d.remote);

  return (
    <aside style={{
      width: collapsed ? 'var(--hub-sidebar-collapsed, 40px)' : 'var(--hub-sidebar-w)',
      background: 'linear-gradient(90deg, var(--hub-bg-2) 0%, var(--hub-bg-1) 100%)',
      borderRight: '1px solid var(--hub-line)',
      overflowY: collapsed ? 'hidden' : 'auto',
      overflowX: 'hidden',
      flexShrink: 0,
      position: 'relative',
      transition: 'width 0.22s cubic-bezier(0.4, 0.2, 0.2, 1)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        title={collapsed ? 'Expand widget palette' : 'Collapse widget palette'}
        style={{
          width: '100%', height: 36, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-end',
          padding: collapsed ? 0 : '0 12px',
          background: 'transparent', border: 'none',
          borderBottom: '1px solid var(--hub-line)',
          color: 'var(--hub-cream-faint)', cursor: 'pointer',
          fontFamily: 'var(--hub-font-mono)', fontSize: 10,
          transition: 'color 0.12s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--hub-amber)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--hub-cream-faint)'; }}
      >
        {collapsed ? '›' : '‹'}
      </button>

      {/* When collapsed: just glyphs */}
      {collapsed ? (
        <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          {registry.map(def => (
            <button key={def.type} onClick={() => onAddWidget(def.type)} title={def.label}
              style={{
                width: 36, height: 30,
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontSize: 13, color: `${def.color}aa`,
                display: 'grid', placeItems: 'center',
                transition: 'color 0.12s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.color = def.color;
                el.style.textShadow = `0 0 6px ${def.color}`;
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.color = `${def.color}aa`;
                el.style.textShadow = 'none';
              }}
            >
              {def.glyph}
            </button>
          ))}
        </div>
      ) : (
        <div style={{ padding: '12px 0 60px', flex: 1, overflowY: 'auto' }}>
          {shell.length > 0 && (
            <Section title="CORE">
              {shell.map(def => (
                <ModuleSlot key={def.type} def={def} onAdd={() => onAddWidget(def.type)} />
              ))}
            </Section>
          )}
          {tools.length > 0 && (
            <Section title="TOOLS">
              {tools.map(def => (
                <ModuleSlot key={def.type} def={def} onAdd={() => onAddWidget(def.type)} />
              ))}
            </Section>
          )}
          {deco.length > 0 && (
            <Section title="DECO">
              {deco.map(def => (
                <ModuleSlot key={def.type} def={def} onAdd={() => onAddWidget(def.type)} />
              ))}
            </Section>
          )}
          {remotes.length > 0 && (
            <Section title="REMOTE">
              {remotes.map(def => (
                <ModuleSlot key={def.type} def={def} onAdd={() => onAddWidget(def.type)} remote />
              ))}
            </Section>
          )}

          <Section title={`ACTIVE (${sessions.length})`}>
            {sessions.length === 0 ? (
              <div style={{ fontSize: 9, color: 'var(--hub-cream-faint)', padding: '6px 4px', letterSpacing: '0.15em' }}>
                SURFACE CLEAR
              </div>
            ) : sessions.map(s => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 8px', marginBottom: 3,
                background: 'var(--hub-bg-2)', border: '1px solid var(--hub-line)',
                fontSize: 9, letterSpacing: '0.05em',
              }}>
                <Led color="green" size="sm" />
                <span style={{ flex: 1, color: 'var(--hub-cream)' }}>{s.label}</span>
                <span style={{ color: 'var(--hub-cream-faint)', fontSize: 7 }}>#{String(s.id).padStart(3, '0')}</span>
              </div>
            ))}
          </Section>

          <div style={{ padding: '0 12px', display: 'flex', gap: 6 }}>
            <SystemButton onClick={onResetLayout} label="RESET" />
            <SystemButton onClick={onClearAll} label="CLEAR" />
          </div>
        </div>
      )}
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '0 12px 12px', borderBottom: '1px dashed var(--hub-line)', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 8, color: 'var(--hub-amber)', letterSpacing: '0.22em' }} className="glow-dim">▸ {title}</span>
        <span style={{ flex: 1, height: 1, background: 'var(--hub-line)' }} />
      </div>
      {children}
    </div>
  );
}

function ModuleSlot({ def, onAdd, remote }: { def: PaletteEntry; onAdd: () => void; remote?: boolean }) {
  const [hover, setHover] = useState(false);
  const ledColor = def.led ?? (remote ? 'amber' : 'green');
  return (
    <button onClick={onAdd} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        background: hover ? 'var(--hub-bg-3)' : 'var(--hub-bg-2)',
        border: `1px solid ${hover ? 'var(--hub-amber-dim)' : 'var(--hub-line)'}`,
        color: hover ? 'var(--hub-amber)' : 'var(--hub-cream)',
        padding: '7px 8px', marginBottom: 4,
        fontFamily: 'var(--hub-font-mono)',
        fontSize: 10, letterSpacing: '0.08em', textAlign: 'left',
        display: 'grid', gridTemplateColumns: '18px 1fr auto', gap: 7, alignItems: 'center',
        transition: 'all 0.12s', cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: 13, color: hover ? def.color : `${def.color}aa`, textShadow: hover ? `0 0 6px ${def.color}` : 'none', textAlign: 'center' }}>{def.glyph}</span>
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
        <span style={{ fontWeight: 500 }}>{def.label}</span>
        {def.subtitle && <span style={{ fontSize: 7.5, color: hover ? 'var(--hub-amber-dim)' : 'var(--hub-cream-faint)', letterSpacing: '0.15em' }}>{def.subtitle}</span>}
      </span>
      <Led color={ledColor} size="sm" steady={!remote} />
    </button>
  );
}

function SystemButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{
        flex: 1, padding: '6px 8px',
        background: 'var(--hub-bg-0)', border: '1px solid var(--hub-line)',
        color: 'var(--hub-cream-dim)',
        fontFamily: 'var(--hub-font-mono)', fontSize: 8, letterSpacing: '0.18em',
        cursor: 'pointer', transition: 'all 0.12s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--hub-red-dim)';
        (e.currentTarget as HTMLElement).style.color = 'var(--hub-red)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--hub-line)';
        (e.currentTarget as HTMLElement).style.color = 'var(--hub-cream-dim)';
      }}
    >{label}</button>
  );
}
