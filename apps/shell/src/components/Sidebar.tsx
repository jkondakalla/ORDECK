import { useState } from 'react';
import { WidgetType } from '@hub/types';
import { Led, Screw, Grille, Knob, LabelTape } from './hardware';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SidebarEntry {
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

interface SidebarProps {
  registry?: SidebarEntry[];
  sessions?: ActiveSession[];
  onAddWidget: (type: WidgetType) => void;
  onResetLayout: () => void;
  onClearAll: () => void;
}

export default function Sidebar({
  registry = [],
  sessions = [],
  onAddWidget,
  onResetLayout,
  onClearAll,
}: SidebarProps) {
  const shell   = registry.filter(d => !d.remote && !d.tool && !d.deco);
  const tools   = registry.filter(d => d.tool);
  const deco    = registry.filter(d => d.deco);
  const remotes = registry.filter(d => d.remote);

  return (
    <aside style={{
      width: 'var(--hub-sidebar-w)',
      background: 'linear-gradient(90deg, var(--hub-bg-2) 0%, var(--hub-bg-1) 100%)',
      borderRight: '1px solid var(--hub-line-strong)',
      overflowY: 'auto',
      padding: '14px 0 60px',
      flexShrink: 0,
      position: 'relative',
    }}>
      <RackHeader />

      {shell.length > 0 && (
        <Section title="SHELL · MOD" code="LOCAL">
          {shell.map(def => (
            <ModuleSlot key={def.type} def={def} onAdd={() => onAddWidget(def.type)} />
          ))}
        </Section>
      )}

      {tools.length > 0 && (
        <Section title="TOOLS · MOD" code="UTIL">
          {tools.map(def => (
            <ModuleSlot key={def.type} def={def} onAdd={() => onAddWidget(def.type)} />
          ))}
        </Section>
      )}

      {deco.length > 0 && (
        <Section title="DECO · MOD" code="AESTH">
          {deco.map(def => (
            <ModuleSlot key={def.type} def={def} onAdd={() => onAddWidget(def.type)} />
          ))}
        </Section>
      )}

      {remotes.length > 0 && (
        <Section title="REMOTE · MOD" code="RMT">
          {remotes.map(def => (
            <ModuleSlot key={def.type} def={def} onAdd={() => onAddWidget(def.type)} remote />
          ))}
        </Section>
      )}

      <Section title="ACTIVE SESSIONS" code={String(sessions.length).padStart(2, '0')}>
        {sessions.length === 0 ? (
          <div style={{
            fontSize: 9, color: 'var(--hub-cream-faint)',
            padding: '8px 4px', letterSpacing: '0.15em',
          }}>NO ACTIVE WIDGETS</div>
        ) : sessions.map(s => (
          <div key={s.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 8px',
            background: 'var(--hub-bg-2)',
            border: '1px solid var(--hub-line)',
            marginBottom: 4, fontSize: 10,
            letterSpacing: '0.05em',
          }}>
            <Led color="green" size="sm" />
            <span style={{ flex: 1, color: 'var(--hub-cream)' }}>{s.label}</span>
            <span style={{ color: 'var(--hub-cream-dim)', fontSize: 8 }}>
              #{String(s.id).padStart(3, '0')}
            </span>
          </div>
        ))}
      </Section>

      <Section title="SYSTEM" code="SYS">
        <SystemButton onClick={onResetLayout} label="RESET LAYOUT" glyph="↻" />
        <SystemButton onClick={onClearAll} label="CLEAR SURFACE" glyph="⌫" />
      </Section>

      <RackFooter />
    </aside>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RackHeader() {
  return (
    <div style={{
      padding: '0 14px 12px',
      borderBottom: '1px solid var(--hub-line)',
      marginBottom: 12,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <Screw size={7} rot={18} />
      <LabelTape style={{ flex: 1, textAlign: 'center' }}>MODULE RACK</LabelTape>
      <Screw size={7} rot={-22} />
    </div>
  );
}

function RackFooter() {
  return (
    <div style={{
      padding: '12px 14px 0',
      borderTop: '1px dashed var(--hub-line)',
      marginTop: 16,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <Grille cols={5} rows={3} dotSize={2} gap={2} style={{ padding: 4 }} />
      <div style={{
        flex: 1, fontSize: 8, color: 'var(--hub-cream-faint)',
        letterSpacing: '0.15em', lineHeight: 1.4,
      }}>
        AUDIO BUS<br />ON HOLD
      </div>
      <Knob value={0.7} size={26} />
    </div>
  );
}

function Section({ title, code, children }: { title: string; code: string; children: React.ReactNode }) {
  return (
    <div style={{
      padding: '0 14px 14px',
      borderBottom: '1px dashed var(--hub-line)',
      marginBottom: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{
          color: 'var(--hub-amber)', fontSize: 9, letterSpacing: '0.22em', fontWeight: 600,
        }} className="glow-dim">▸ {title}</span>
        <span style={{ flex: 1, height: 1, background: 'var(--hub-line)' }} />
        <span style={{ fontSize: 8, color: 'var(--hub-cream-faint)', letterSpacing: '0.18em' }}>{code}</span>
      </div>
      {children}
    </div>
  );
}

function ModuleSlot({ def, onAdd, remote }: { def: SidebarEntry; onAdd: () => void; remote?: boolean }) {
  const [hover, setHover] = useState(false);
  const ledColor = def.led ?? (remote ? 'amber' : 'green');
  return (
    <button
      onClick={onAdd}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        background: hover ? 'var(--hub-bg-3)' : 'var(--hub-bg-2)',
        border: `1px solid ${hover ? 'var(--hub-amber-dim)' : 'var(--hub-line)'}`,
        color: hover ? 'var(--hub-amber)' : 'var(--hub-cream)',
        padding: '8px 10px',
        marginBottom: 5,
        fontFamily: 'var(--hub-font-mono)',
        fontSize: 10.5,
        letterSpacing: '0.08em',
        textAlign: 'left',
        display: 'grid',
        gridTemplateColumns: '20px 1fr auto',
        gap: 8,
        alignItems: 'center',
        transition: 'all 0.12s ease',
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      <span style={{
        fontSize: 13,
        color: hover ? def.color : `${def.color}aa`,
        textShadow: hover ? `0 0 6px ${def.color}` : 'none',
        textAlign: 'center',
      }}>{def.glyph}</span>
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
        <span style={{ fontWeight: 500 }}>{def.label}</span>
        {def.subtitle && (
          <span style={{
            fontSize: 8,
            color: hover ? 'var(--hub-amber-dim)' : 'var(--hub-cream-faint)',
            letterSpacing: '0.15em',
          }}>{def.subtitle}</span>
        )}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
        <span style={{
          fontSize: 8, letterSpacing: '0.12em',
          color: hover ? 'var(--hub-amber-dim)' : 'var(--hub-cream-faint)',
        }}>{def.code}</span>
        <Led color={ledColor} size="sm" steady={!remote} />
      </span>
    </button>
  );
}

function SystemButton({ label, glyph, onClick }: { label: string; glyph: string; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        background: hover ? '#3a2a1c' : 'var(--hub-bg-2)',
        border: `1px solid ${hover ? 'var(--hub-red-dim)' : 'var(--hub-line)'}`,
        color: hover ? 'var(--hub-red)' : 'var(--hub-cream-dim)',
        padding: '8px 10px',
        marginBottom: 5,
        fontFamily: 'var(--hub-font-mono)',
        fontSize: 10,
        letterSpacing: '0.15em',
        textAlign: 'left',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'all 0.1s',
      }}
    >
      <span>{label}</span>
      <span style={{ fontSize: 13 }}>{glyph}</span>
    </button>
  );
}
