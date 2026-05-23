import type { CSSProperties, ReactNode } from 'react';
import { Led, Screw, Vent, LabelTape } from '../hardware';
import type { Settings } from './types';
import { PHOSPHOR_GROUPS, STYLES, SHELLS } from './data';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  set: (k: keyof Settings, v: Settings[keyof Settings]) => void;
  reset: () => void;
}

export function SettingsPanel({ open, onClose, settings, set, reset }: SettingsPanelProps) {
  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed',
        inset: 0,
        background: open ? 'rgba(0,0,0,0.5)' : 'transparent',
        backdropFilter: open ? 'blur(2px)' : 'none',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 0.25s ease, backdrop-filter 0.25s ease',
        zIndex: 199,
      }} />
      <aside style={{
        position: 'fixed',
        top: 0,
        right: 0,
        height: '100vh',
        width: 360,
        background: 'linear-gradient(180deg, var(--hub-bg-1) 0%, var(--hub-bg-2) 100%)',
        borderLeft: '1px solid var(--hub-line-strong)',
        boxShadow: '-12px 0 32px rgba(0,0,0,0.6)',
        transform: open ? 'translateX(0)' : 'translateX(105%)',
        transition: 'transform 0.32s cubic-bezier(.4,.2,.2,1)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{
          height: 48,
          background: 'linear-gradient(180deg, var(--hub-bg-3), var(--hub-bg-1))',
          borderBottom: '1px solid var(--hub-line-strong)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 14px',
          gap: 12,
          flexShrink: 0,
        }}>
          <Screw size={7} rot={28} />
          <Led color="amber" size="sm" />
          <span style={{
            color: 'var(--hub-amber)',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.18em',
            fontFamily: 'var(--hub-font-seg)',
          }} className="glow-dim">CONFIG · AESTHETICS</span>
          <Vent slats={3} width={28} style={{ marginLeft: 'auto' }} />
          <button onClick={onClose} style={{
            width: 20,
            height: 20,
            background: 'var(--hub-bg-0)',
            border: '1px solid var(--hub-line-strong)',
            color: 'var(--hub-cream-dim)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            padding: 0,
          }}>✕</button>
          <Screw size={7} rot={-22} />
        </div>

        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}>
          <SettingsSection title="VISUAL STYLE" code="01">
            <StyleGrid
              options={STYLES}
              value={settings.style}
              onChange={v => set('style', v as Settings['style'])}
            />
          </SettingsSection>

          <SettingsSection title="PHOSPHOR · COLOR" code="02">
            {PHOSPHOR_GROUPS.map(g => (
              <PhosphorGroup
                key={g.title}
                title={g.title}
                items={g.items}
                value={settings.phosphor}
                onChange={v => set('phosphor', v)}
              />
            ))}
          </SettingsSection>

          <SettingsSection title="SHELL · TONE" code="03">
            <SwatchGrid
              options={SHELLS}
              value={settings.shell}
              onChange={v => set('shell', v as Settings['shell'])}
              cols={5}
            />
          </SettingsSection>

          <SettingsSection title="CRT · EFFECTS" code="04">
            <SettingsSlider
              label="SCANLINES"
              value={settings.scanlines}
              min={0} max={0.08} step={0.002}
              fmt={v => Math.round((v / 0.08) * 100) + '%'}
              onChange={v => set('scanlines', v)}
            />
            <SettingsSlider
              label="VIGNETTE"
              value={settings.vignette}
              min={0} max={0.8} step={0.02}
              fmt={v => Math.round((v / 0.8) * 100) + '%'}
              onChange={v => set('vignette', v)}
            />
            <SettingsSlider
              label="CANVAS GRID"
              value={settings.gridDensity}
              min={0} max={2} step={0.1}
              fmt={v => (v * 100).toFixed(0) + '%'}
              onChange={v => set('gridDensity', v)}
            />
          </SettingsSection>

          <SettingsSection title="HARDWARE" code="05">
            <SettingsToggle label="BOLD GLOW"        hint="thicker phosphor halo"    value={settings.boldGlow}    onChange={v => set('boldGlow', v)} />
            <SettingsToggle label="WIDGET SCREWS"    hint="show panel hardware"      value={settings.showScrews}  onChange={v => set('showScrews', v)} />
            <SettingsToggle label="SYSTEM BUS STRIP" hint="top telemetry waveform"   value={settings.showBus}     onChange={v => set('showBus', v)} />
            <SettingsToggle label="RIGHT VU RAIL"    hint="meters + knobs panel"     value={settings.showRail}    onChange={v => set('showRail', v)} />
          </SettingsSection>

          <SettingsSection title="RESET" code="06">
            <ResetButton onReset={reset} />
          </SettingsSection>

          <div style={{
            marginTop: 8,
            padding: 10,
            border: '1px dashed var(--hub-line)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 8,
            color: 'var(--hub-cream-faint)',
            letterSpacing: '0.15em',
          }}>
            <Led color="green" size="sm" />
            SETTINGS PERSIST IN BROWSER · LOCALSTORAGE
          </div>
        </div>
      </aside>
    </>
  );
}

// ─── Private sub-components ───────────────────────────────────────────────────

function SettingsSection({ title, code, children }: { title: string; code: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <LabelTape style={{ fontSize: 8 }}>{title}</LabelTape>
        <span style={{ flex: 1, height: 1, background: 'var(--hub-line)' }} />
        <span style={{ fontSize: 8, color: 'var(--hub-cream-faint)', letterSpacing: '0.18em' }}>§{code}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {children}
      </div>
    </div>
  );
}

function StyleGrid({ options, value, onChange }: {
  options: typeof STYLES;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
      {options.map(o => {
        const active = value === o.id;
        return (
          <button key={o.id} onClick={() => onChange(o.id)}
            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.borderColor = 'var(--hub-amber-dim)'; }}
            onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.borderColor = 'var(--hub-line)'; }}
            style={{
              background: active ? `linear-gradient(135deg, ${o.accent}, var(--hub-bg-2))` : 'var(--hub-bg-2)',
              border: `1px solid ${active ? o.swatch : 'var(--hub-line)'}`,
              padding: '8px 10px',
              display: 'grid',
              gridTemplateColumns: '14px 1fr',
              gap: 10,
              alignItems: 'center',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.12s',
              boxShadow: active ? `inset 0 0 8px ${o.swatch}33` : 'none',
              position: 'relative',
              minHeight: 44,
            }}
          >
            <span style={{
              width: 14, height: 14,
              background: o.swatch,
              boxShadow: active ? `0 0 8px ${o.swatch}` : `0 0 3px ${o.swatch}55`,
              border: '1px solid rgba(0,0,0,0.4)',
            }} />
            <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, gap: 2 }}>
              <span style={{
                fontSize: 10, letterSpacing: '0.14em', fontWeight: 600,
                color: active ? 'var(--hub-amber)' : 'var(--hub-cream)',
                fontFamily: 'var(--hub-font-mono)',
              }}>{o.label}</span>
              <span style={{
                fontSize: 7.5, color: 'var(--hub-cream-faint)', letterSpacing: '0.12em',
              }}>{o.desc}</span>
            </span>
            {active && (
              <span style={{
                position: 'absolute', top: 3, right: 4,
                fontSize: 7, color: o.swatch, letterSpacing: '0.1em',
              }}>●</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function PhosphorGroup({ title, items, value, onChange }: {
  title: string;
  items: { id: string; label: string; swatch: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{
        fontSize: 7, letterSpacing: '0.25em',
        color: 'var(--hub-cream-faint)',
        marginBottom: 5, padding: '2px 0',
      }}>· {title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 3 }}>
        {items.map(o => {
          const active = value === o.id;
          return (
            <button key={o.id} onClick={() => onChange(o.id)} title={o.label}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.borderColor = o.swatch + '88'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.borderColor = 'var(--hub-line)'; }}
              style={{
                background: active ? 'var(--hub-bg-0)' : 'var(--hub-bg-2)',
                border: `1px solid ${active ? o.swatch : 'var(--hub-line)'}`,
                padding: '6px 4px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                cursor: 'pointer', transition: 'all 0.12s',
                boxShadow: active ? `inset 0 0 8px ${o.swatch}44` : 'none',
                position: 'relative',
              }}
            >
              <div style={{
                width: 16, height: 16,
                background: o.swatch,
                borderRadius: '50%',
                border: '1px solid rgba(0,0,0,0.5)',
                boxShadow: active ? `0 0 8px ${o.swatch}` : `0 0 3px ${o.swatch}66`,
                position: 'relative',
              }}>
                <span style={{
                  position: 'absolute', inset: 0,
                  background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.5), transparent 55%)',
                  borderRadius: '50%',
                }} />
              </div>
              <span style={{
                fontSize: 6.5, letterSpacing: '0.06em',
                color: active ? 'var(--hub-amber)' : 'var(--hub-cream-dim)',
                fontFamily: 'var(--hub-font-mono)',
                lineHeight: 1, textAlign: 'center',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                maxWidth: '100%',
              }}>{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SwatchGrid({ options, value, onChange, cols = 4 }: {
  options: typeof SHELLS;
  value: string;
  onChange: (v: string) => void;
  cols?: number;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 4 }}>
      {options.map(o => {
        const active = value === o.id;
        return (
          <button key={o.id} onClick={() => onChange(o.id)}
            onMouseEnter={e => {
              if (!active) {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = 'var(--hub-amber-dim)';
                el.style.background = 'var(--hub-bg-3)';
              }
            }}
            onMouseLeave={e => {
              if (!active) {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = 'var(--hub-line)';
                el.style.background = 'var(--hub-bg-2)';
              }
            }}
            style={{
              background: active ? 'var(--hub-bg-0)' : 'var(--hub-bg-2)',
              border: `1px solid ${active ? 'var(--hub-amber)' : 'var(--hub-line)'}`,
              padding: '8px 6px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              cursor: 'pointer', transition: 'all 0.12s',
              boxShadow: active ? 'inset 0 0 6px var(--hub-amber-glow)' : 'none',
              position: 'relative',
            }}
          >
            <div style={{
              width: 22, height: 22,
              background: o.swatch,
              border: '1px solid rgba(0,0,0,0.4)',
              boxShadow: active ? `0 0 10px ${o.swatch}` : `0 0 4px ${o.swatch}66`,
              borderRadius: '50%',
              position: 'relative',
            }}>
              <span style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.5), transparent 50%)',
                borderRadius: '50%',
              }} />
            </div>
            <span style={{
              fontSize: 7.5, letterSpacing: '0.1em',
              color: active ? 'var(--hub-amber)' : 'var(--hub-cream)',
              lineHeight: 1.1, textAlign: 'center',
              fontFamily: 'var(--hub-font-mono)',
            }}>{o.label}</span>
            {active && (
              <span style={{
                position: 'absolute', top: 3, right: 4,
                fontSize: 7, color: 'var(--hub-amber)', letterSpacing: '0.1em',
              }} className="glow-dim">●</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function SettingsSlider({ label, value, min, max, step, fmt, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  fmt?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{
      background: 'var(--hub-bg-0)',
      border: '1px solid var(--hub-line)',
      padding: '8px 10px',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--hub-cream-dim)' }}>{label}</span>
        <span style={{
          fontSize: 11, color: 'var(--hub-amber)',
          fontFamily: 'var(--hub-font-seg)', fontWeight: 700, letterSpacing: '0.05em',
        }} className="glow-dim">{fmt ? fmt(value) : value}</span>
      </div>
      <div style={{ position: 'relative', height: 18 }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, top: '50%',
          transform: 'translateY(-50%)',
          height: 4,
          background: 'var(--hub-bg-2)',
          border: '1px solid var(--hub-line-strong)',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)',
        }}>
          <div style={{
            height: '100%', width: pct + '%',
            background: 'linear-gradient(90deg, var(--hub-amber-dim), var(--hub-amber))',
            boxShadow: '0 0 6px var(--hub-amber-glow)',
          }} />
        </div>
        {[0, 25, 50, 75, 100].map(p => (
          <span key={p} style={{
            position: 'absolute', top: 0, bottom: 0, left: p + '%',
            width: 1, background: 'var(--hub-line)', opacity: 0.5,
          }} />
        ))}
        <span style={{
          position: 'absolute', top: '50%', left: pct + '%',
          transform: 'translate(-50%, -50%)',
          width: 12, height: 16,
          background: 'linear-gradient(180deg, #5a5040, #2a2620)',
          border: '1px solid #1a1612',
          boxShadow: 'inset 0 1px 0 rgba(255,220,160,0.15), 0 1px 2px rgba(0,0,0,0.6), 0 0 4px var(--hub-amber-glow)',
          pointerEvents: 'none',
        }} />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
        />
      </div>
    </div>
  );
}

function SettingsToggle({ label, hint, value, onChange }: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div style={{
      background: 'var(--hub-bg-0)',
      border: '1px solid var(--hub-line)',
      padding: '8px 10px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--hub-cream)' }}>{label}</span>
        {hint && <span style={{ fontSize: 8, color: 'var(--hub-cream-faint)', letterSpacing: '0.1em' }}>{hint}</span>}
      </div>
      <button onClick={() => onChange(!value)} style={{
        width: 44, height: 22,
        background: 'linear-gradient(180deg, #1a1612, #11100d)',
        border: `1px solid ${value ? 'var(--hub-amber-dim)' : 'var(--hub-line-strong)'}`,
        boxShadow: value ? 'inset 0 0 6px var(--hub-amber-glow)' : 'inset 0 0 4px rgba(0,0,0,0.6)',
        position: 'relative', padding: 0, cursor: 'pointer', transition: 'all 0.15s',
      }}>
        <span style={{
          position: 'absolute', top: 2, bottom: 2, left: value ? 24 : 2, width: 18,
          background: value
            ? 'linear-gradient(180deg, var(--hub-amber-bright), var(--hub-amber-dim))'
            : 'linear-gradient(180deg, #4a4234, #2a2620)',
          border: '1px solid #1a1612',
          boxShadow: value
            ? 'inset 0 1px 0 rgba(255,255,255,0.2), 0 0 6px var(--hub-amber-glow)'
            : 'inset 0 1px 0 rgba(255,220,160,0.08), 0 1px 2px rgba(0,0,0,0.6)',
          transition: 'left 0.18s cubic-bezier(.4,.2,.2,1), background 0.15s',
        }} />
        <span style={{
          position: 'absolute', top: '50%',
          left: value ? 6 : 'auto',
          right: value ? 'auto' : 6,
          transform: 'translateY(-50%)',
          fontSize: 7, fontWeight: 700,
          color: value ? 'var(--hub-amber)' : 'var(--hub-cream-faint)',
          letterSpacing: '0.1em',
          textShadow: value ? '0 0 4px var(--hub-amber-glow)' : 'none',
          pointerEvents: 'none',
        }}>{value ? 'ON' : 'OFF'}</span>
      </button>
    </div>
  );
}

function ResetButton({ onReset }: { onReset: () => void }) {
  const handleReset = () => {
    if (window.confirm('Reset all aesthetic settings?')) onReset();
  };
  return (
    <button
      onClick={handleReset}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = '0 0 8px var(--hub-red-glow)';
        el.style.borderColor = 'var(--hub-red)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = '';
        el.style.borderColor = 'var(--hub-red-dim)';
      }}
      style={{
        width: '100%',
        padding: '10px 12px',
        background: 'var(--hub-bg-0)',
        border: '1px solid var(--hub-red-dim)',
        color: 'var(--hub-red)',
        fontFamily: 'var(--hub-font-mono)',
        fontSize: 10,
        letterSpacing: '0.18em',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.12s',
      } as CSSProperties}
    >⌫ RESTORE FACTORY DEFAULTS</button>
  );
}
