import { ReactNode, useState } from 'react';
import { WidgetManifest, WidgetType } from '@hub/types';

interface WidgetDef {
  type: WidgetType;
  label: string;
  code: string;
  remote?: boolean;
}

const WIDGET_DEFS: WidgetDef[] = [
  { type: 'clock',       label: 'CHRONO',        code: 'MOD-001' },
  { type: 'plugins',     label: 'PLUGIN GRID',   code: 'MOD-002' },
  { type: 'connections', label: 'CONNECTIONS',   code: 'MOD-003' },
  { type: 'log',         label: 'OPERATOR LOG',  code: 'MOD-004' },
  { type: 'plex',        label: 'PLEX',          code: 'RMT-001', remote: true },
  { type: 'lazuros',     label: 'LAZUROS',       code: 'RMT-002', remote: true },
  { type: 'beigeboard',  label: 'BEIGEBOARD',    code: 'RMT-003', remote: true },
  { type: 'recipe',      label: 'RECIPES',       code: 'RMT-004', remote: true },
];

interface SidebarProps {
  connections?: WidgetManifest[];
  onAddWidget: (type: WidgetType) => void;
  onResetLayout: () => void;
  onClearAll: () => void;
}

export default function Sidebar({
  connections = [],
  onAddWidget,
  onResetLayout,
  onClearAll,
}: SidebarProps) {
  return (
    <aside style={{
      width: '240px',
      background: 'var(--hub-bg-1)',
      borderRight: '1px solid var(--hub-line-strong)',
      overflowY: 'auto',
      padding: '16px 0 24px',
      flexShrink: 0,
    }}>
      <Section title="SHELL WIDGETS">
        {WIDGET_DEFS.filter(d => !d.remote).map(def => (
          <ModuleButton
            key={def.type}
            label={def.label}
            code={def.code}
            onClick={() => onAddWidget(def.type)}
          />
        ))}
      </Section>

      <Section title="REMOTE MODULES">
        {WIDGET_DEFS.filter(d => d.remote).map(def => (
          <ModuleButton
            key={def.type}
            label={def.label}
            code={def.code}
            remote
            onClick={() => onAddWidget(def.type)}
          />
        ))}
      </Section>

      {connections.length > 0 && (
        <Section title="REGISTERED PLUGINS">
          {connections.map(p => (
            <ConnRow
              key={p.id}
              name={p.id.toUpperCase()}
              status={p.remoteUrl ? 'amber' : 'off'}
              code={p.remoteUrl ? '[REG]' : '[OFF]'}
            />
          ))}
        </Section>
      )}

      <Section title="SYSTEM">
        <ModuleButton label="RESET LAYOUT" code="↻" onClick={onResetLayout} />
        <ModuleButton label="CLEAR SURFACE" code="⌫" onClick={onClearAll} />
      </Section>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{
      padding: '0 16px 16px',
      borderBottom: '1px dashed var(--hub-line)',
      marginBottom: 14,
    }}>
      <div style={{
        fontSize: 10,
        letterSpacing: '0.2em',
        color: 'var(--hub-amber)',
        marginBottom: 10,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span>▸</span>{title}
      </div>
      {children}
    </div>
  );
}

function ModuleButton({
  label, code, remote, onClick,
}: {
  label: string;
  code: string;
  remote?: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        background: hovered ? 'var(--hub-bg-3)' : 'var(--hub-bg-2)',
        border: `1px solid ${hovered ? 'var(--hub-amber-dim)' : 'var(--hub-line)'}`,
        color: hovered ? 'var(--hub-amber)' : 'var(--hub-cream)',
        padding: '10px 12px',
        marginBottom: 6,
        fontFamily: 'var(--hub-font-mono)',
        fontSize: 11,
        letterSpacing: '0.06em',
        textAlign: 'left',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        minHeight: 40,
        transition: 'all 0.12s ease',
        cursor: 'pointer',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {remote && <span style={{ color: 'var(--hub-cyan-dim)', fontSize: 9 }}>↗</span>}
        {label}
      </span>
      <span style={{ color: hovered ? 'var(--hub-amber-dim)' : 'var(--hub-cream-dim)', fontSize: 9, letterSpacing: '0.1em' }}>
        {code}
      </span>
    </button>
  );
}

function ConnRow({ name, status, code }: { name: string; status: string; code: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '7px 10px',
      background: 'var(--hub-bg-2)',
      border: '1px solid var(--hub-line)',
      marginBottom: 4,
      fontSize: 11,
    }}>
      <span className={`led ${status}`} />
      <span style={{ flex: 1, color: 'var(--hub-cream)', letterSpacing: '0.04em' }}>{name}</span>
      <span style={{ color: 'var(--hub-cream-dim)', fontSize: 9 }}>{code}</span>
    </div>
  );
}
