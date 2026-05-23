import { useState, useEffect, useMemo } from 'react';
import { Led, Screw, Vent, LabelTape, DymoTape, useTick } from '../components/hardware';
import type { WidgetProps } from '@hub/types';

// ============== SPINNING REEL ==============

function Reel({ speed = 4, reverse = false }: { speed?: number; reverse?: boolean }) {
  return (
    <div style={{ position: 'relative', width: 72, height: 72 }}>
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 30% 30%, #3a342b, #1a1612 70%, #050402 100%)',
        border: '1px solid var(--hub-line-strong)',
        boxShadow: 'inset 0 0 8px rgba(0,0,0,0.8), 0 1px 2px rgba(0,0,0,0.6)',
      }} />
      <svg viewBox="0 0 100 100" style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        animation: `reel-spin ${speed}s linear infinite${reverse ? ' reverse' : ''}`,
      }}>
        {Array.from({ length: 6 }).map((_, i) => {
          const a = (i * 60) * Math.PI / 180;
          const x1 = 50 + Math.cos(a) * 18;
          const y1 = 50 + Math.sin(a) * 18;
          const x2 = 50 + Math.cos(a) * 40;
          const y2 = 50 + Math.sin(a) * 40;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--hub-cream-faint)" strokeWidth="2.5" strokeLinecap="round" />;
        })}
        <circle cx="50" cy="50" r="6" fill="var(--hub-bg-0)" stroke="var(--hub-amber-dim)" strokeWidth="1" />
        <circle cx="50" cy="50" r="2" fill="var(--hub-amber)" style={{ filter: 'drop-shadow(0 0 4px var(--hub-amber-glow))' }} />
      </svg>
    </div>
  );
}

export function SpinningReelWidget() {
  return (
    <div style={{ height: '100%', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <DymoTape style={{ fontSize: 8 }}>TAPE · A</DymoTape>
        <Led color="amber" size="sm" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flex: 1 }}>
        <Reel speed={4} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <Vent slats={4} width={36} />
          <div style={{ fontSize: 9, color: 'var(--hub-amber)', letterSpacing: '0.15em' }} className="glow-dim">&#9654; PLAY</div>
        </div>
        <Reel speed={4} reverse />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: 'var(--hub-cream-faint)', letterSpacing: '0.15em' }}>
        <span>0000</span>
        <span>00:00:00</span>
        <span>9999</span>
      </div>
    </div>
  );
}

// ============== NIXIE TUBE BANK ==============

function NixieDigit({ char }: { char: string }) {
  return (
    <div style={{
      width: 26, height: 38,
      background: 'radial-gradient(ellipse at center, #281a0d 0%, #110a04 80%)',
      border: '1px solid #2a1a0a',
      borderRadius: '4px 4px 2px 2px',
      display: 'grid', placeItems: 'center',
      position: 'relative',
      boxShadow: 'inset 0 -3px 6px rgba(255,140,40,0.08), inset 0 4px 8px rgba(0,0,0,0.7)',
    }}>
      <span style={{
        position: 'absolute',
        color: 'rgba(255,140,40,0.07)',
        fontFamily: 'var(--hub-font-seg)',
        fontSize: 26, fontWeight: 700, lineHeight: 1,
      }}>8</span>
      <span style={{
        color: '#ff8c28',
        fontFamily: 'var(--hub-font-seg)',
        fontSize: 26, fontWeight: 700, lineHeight: 1,
        textShadow: '0 0 6px #ff8c28, 0 0 12px #ff5a14aa, 0 0 18px #ff5a1466',
        position: 'relative',
      }}>{char}</span>
      <span style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '40%',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.06), transparent)',
        borderRadius: '4px 4px 0 0',
        pointerEvents: 'none',
      }} />
    </div>
  );
}

export function NixieBankWidget() {
  const tick = useTick(160);
  const digits = useMemo(() => {
    const n = Math.floor(tick / 6);
    return String(n).padStart(6, '0').slice(-6);
  }, [tick]);

  return (
    <div style={{
      height: '100%', padding: 14, display: 'flex', flexDirection: 'column', gap: 10,
      justifyContent: 'center', alignItems: 'center',
    }}>
      <DymoTape style={{ fontSize: 8 }}>NIXIE · BANK</DymoTape>
      <div style={{
        display: 'flex', gap: 4, padding: 14,
        background: 'radial-gradient(ellipse at center, #1a1410, #050402)',
        border: '1px solid var(--hub-line-strong)',
        boxShadow: 'inset 0 0 16px rgba(0,0,0,0.9)',
      }}>
        {digits.split('').map((d, i) => <NixieDigit key={i} char={d} />)}
      </div>
      <div style={{ fontSize: 8, color: 'var(--hub-cream-faint)', letterSpacing: '0.2em' }}>// COUNTER · OHM·SEC</div>
    </div>
  );
}

// ============== STATUS LIGHTS ==============

export function StatusLightsWidget() {
  const tick = useTick(400);
  const labels = ['PWR', 'CLK', 'NET', 'DSK', 'DMA', 'IRQ', 'BUS', 'I/O'];
  const colors: Array<'green' | 'amber' | 'cyan'> = ['green', 'amber', 'amber', 'cyan'];

  return (
    <div style={{ height: '100%', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <DymoTape style={{ fontSize: 8 }}>STATUS · BANK</DymoTape>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {labels.map((l, i) => {
          const on = (tick + i * 3) % (5 + (i % 3)) !== 0;
          const c = colors[i % colors.length];
          return (
            <div key={l} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 8px',
              background: 'var(--hub-bg-0)',
              border: '1px solid var(--hub-line)',
            }}>
              <Led color={on ? c : undefined} off={!on} size="md" steady={on} />
              <span style={{
                fontSize: 9, letterSpacing: '0.18em',
                color: on ? 'var(--hub-cream)' : 'var(--hub-cream-faint)',
              }}>{l}</span>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7, color: 'var(--hub-cream-faint)', letterSpacing: '0.15em' }}>
        <span>BANK · 01</span>
        <span>// MONITOR ONLY</span>
      </div>
    </div>
  );
}

// ============== GRILLE PANEL ==============

export function GrillePanelWidget() {
  return (
    <div style={{ height: '100%', padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, alignSelf: 'stretch' }}>
        <Screw size={7} rot={20} />
        <LabelTape style={{ fontSize: 8, flex: 1, textAlign: 'center' }}>MONITOR · 8&#937;</LabelTape>
        <Screw size={7} rot={-15} />
      </div>
      <div style={{
        flex: 1, width: '100%',
        background: 'radial-gradient(ellipse at 30% 20%, #1a1612, #050402)',
        border: '1px solid #1a1612',
        boxShadow: 'inset 0 0 12px rgba(0,0,0,0.8)',
        padding: 10,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, 6px)',
        gridAutoRows: '6px',
        gap: 3,
        alignContent: 'center',
        justifyContent: 'center',
      }}>
        {Array.from({ length: 200 }).map((_, i) => (
          <span key={i} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, #0a0907 25%, #1a1612 100%)',
            boxShadow: 'inset 0 0 1px rgba(0,0,0,0.9)',
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, alignSelf: 'stretch' }}>
        <Screw size={7} rot={48} />
        <span style={{ flex: 1, textAlign: 'center', fontSize: 7, color: 'var(--hub-cream-faint)', letterSpacing: '0.18em' }}>
          ORDECK · AUDIO
        </span>
        <Screw size={7} rot={-22} />
      </div>
    </div>
  );
}

// ============== LABEL STRIP ==============

export function LabelStripWidget({ widgetId }: WidgetProps) {
  const key = `ordeck-label-${widgetId}`;
  const [text, setText] = useState(() => localStorage.getItem(key) || 'OPERATOR · DECK');
  useEffect(() => { localStorage.setItem(key, text); }, [key, text]);

  return (
    <div style={{
      height: '100%',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
      padding: 14, gap: 12,
      background: 'repeating-linear-gradient(45deg, var(--hub-bg-1) 0px, var(--hub-bg-1) 8px, var(--hub-bg-2) 8px, var(--hub-bg-2) 16px)',
    }}>
      <div style={{ fontSize: 8, color: 'var(--hub-cream-faint)', letterSpacing: '0.2em' }}>
        // EDITABLE LABEL //
      </div>
      <div style={{
        position: 'relative',
        background: '#1f1c16',
        padding: '12px 24px',
        border: '1px solid #0a0907',
        boxShadow: 'inset 0 1px 0 rgba(255,220,160,0.06), 0 2px 4px rgba(0,0,0,0.5)',
        minWidth: 200, maxWidth: '90%',
      }}>
        <span style={{
          position: 'absolute', top: 0, bottom: 0, left: 0, width: 6,
          background: 'radial-gradient(circle at center, #11100d 1.2px, transparent 1.5px)',
          backgroundSize: '6px 6px',
        }} />
        <span style={{
          position: 'absolute', top: 0, bottom: 0, right: 0, width: 6,
          background: 'radial-gradient(circle at center, #11100d 1.2px, transparent 1.5px)',
          backgroundSize: '6px 6px',
        }} />
        <input
          value={text}
          onChange={e => setText(e.target.value.toUpperCase().slice(0, 24))}
          style={{
            background: 'transparent',
            border: 'none', outline: 'none',
            color: 'var(--hub-cream-bright)',
            fontFamily: 'var(--hub-font-mono)',
            fontSize: 16, letterSpacing: '0.25em', fontWeight: 600,
            textAlign: 'center', width: '100%',
            textShadow: '0 -1px 0 rgba(0,0,0,0.8)',
          }}
        />
      </div>
      <div style={{ fontSize: 7, color: 'var(--hub-cream-faint)', letterSpacing: '0.2em', textAlign: 'center' }}>
        DYMO · M-1011 · 24CHR MAX
      </div>
    </div>
  );
}

// ============== SCROLLING TICKER ==============

export function TickerWidget({ widgetId }: WidgetProps) {
  const key = `ordeck-ticker-${widgetId}`;
  const [text, setText] = useState(
    () => localStorage.getItem(key) || 'ORDECK · CONTROL SURFACE · ALL SYSTEMS NOMINAL · CONNECTION POOL HEALTHY · BACKUP COMPLETE 03:47:12Z · NEXT MAINT WINDOW T-04:12:00'
  );
  const [editing, setEditing] = useState(false);
  useEffect(() => { localStorage.setItem(key, text); }, [key, text]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '6px 12px',
        background: 'var(--hub-bg-2)',
        borderBottom: '1px solid var(--hub-line)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Led color="amber" size="sm" />
        <DymoTape style={{ fontSize: 7 }}>NEWSWIRE</DymoTape>
        <span style={{ flex: 1 }} />
        <button
          onClick={() => setEditing(e => !e)}
          style={{
            fontSize: 8, padding: '2px 6px', letterSpacing: '0.15em',
            background: 'var(--hub-bg-0)', border: '1px solid var(--hub-line)',
            color: 'var(--hub-cream-dim)', cursor: 'pointer',
          }}
        >{editing ? 'DONE' : 'EDIT'}</button>
      </div>
      {editing ? (
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          style={{
            flex: 1,
            background: 'var(--hub-bg-0)',
            border: 'none', outline: 'none',
            color: 'var(--hub-amber)',
            fontFamily: 'var(--hub-font-mono)',
            fontSize: 12, padding: 10, resize: 'none', letterSpacing: '0.05em',
          }}
        />
      ) : (
        <div style={{
          flex: 1, overflow: 'hidden', position: 'relative',
          background: 'var(--hub-bg-0)',
          display: 'flex', alignItems: 'center',
        }}>
          <div style={{
            whiteSpace: 'nowrap',
            color: 'var(--hub-amber)',
            fontFamily: 'var(--hub-font-mono)',
            fontSize: 14, letterSpacing: '0.18em', fontWeight: 500,
            textShadow: '0 0 6px var(--hub-amber-glow)',
            paddingLeft: '100%',
            animation: `ticker-scroll ${Math.max(20, text.length * 0.3)}s linear infinite`,
          }}>
            {text} · {text}
          </div>
        </div>
      )}
    </div>
  );
}

// ============== DATA RAIN ==============

const RAIN_CHARS = '01アイウエオカキクABCDEF<>{}[]/*+';

export function DataRainWidget() {
  const tick = useTick(120);
  const cols = 24;
  const rows = 22;

  const grid = useMemo(() => {
    const result: number[][] = [];
    for (let c = 0; c < cols; c++) {
      const offset = (c * 7) % rows;
      const speed = 1 + (c % 4);
      const col: number[] = [];
      for (let r = 0; r < rows; r++) {
        const pos = (tick * speed + offset + r) % (rows * 2);
        let intensity = 0;
        if (pos === 0) intensity = 1.0;
        else if (pos < 4) intensity = 0.7 - pos * 0.18;
        else if (pos < 9) intensity = 0.3 - (pos - 4) * 0.05;
        col.push(intensity);
      }
      result.push(col);
    }
    return result;
  }, [tick]);

  return (
    <div style={{
      height: '100%', overflow: 'hidden',
      background: 'var(--hub-bg-0)',
      padding: 4, position: 'relative',
    }}>
      <div style={{ display: 'flex', height: '100%', justifyContent: 'space-around', alignItems: 'stretch' }}>
        {grid.map((col, c) => (
          <div key={c} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
            {col.map((v, r) => (
              <span key={r} style={{
                fontFamily: 'var(--hub-font-mono)',
                fontSize: 11, lineHeight: 1, textAlign: 'center',
                color: v > 0.9
                  ? 'var(--hub-amber-bright)'
                  : v > 0.4
                    ? 'var(--hub-amber)'
                    : v > 0.1
                      ? 'var(--hub-amber-dim)'
                      : 'transparent',
                textShadow: v > 0.9 ? '0 0 6px var(--hub-amber)' : v > 0.4 ? '0 0 3px var(--hub-amber-glow)' : 'none',
                opacity: v,
              }}>
                {RAIN_CHARS[(c * 13 + r + Math.floor(tick / 2)) % RAIN_CHARS.length]}
              </span>
            ))}
          </div>
        ))}
      </div>
      <div style={{
        position: 'absolute', bottom: 4, right: 6,
        fontSize: 7, color: 'var(--hub-cream-faint)',
        letterSpacing: '0.2em', pointerEvents: 'none',
      }}>// STREAM 0x{Math.floor(tick).toString(16).padStart(4, '0')}</div>
    </div>
  );
}

// ============== ANALOG GAUGE BANK ==============

function AnalogGauge({ label, v }: { label: string; v: number }) {
  const angle = -120 + Math.max(0, Math.min(1, v)) * 240;
  return (
    <div style={{
      background: 'radial-gradient(ellipse at 40% 30%, var(--hub-bg-2), var(--hub-bg-0))',
      border: '1px solid var(--hub-line)',
      borderRadius: '6px 6px 4px 4px',
      padding: 6,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      <svg viewBox="0 0 100 64" style={{ width: '100%' }}>
        <path d="M10,60 A 40,40 0 0 1 90,60" fill="none" stroke="var(--hub-line-strong)" strokeWidth="2" />
        {Array.from({ length: 9 }).map((_, i) => {
          const a = (-120 + (i / 8) * 240) * Math.PI / 180;
          const x1 = 50 + Math.cos(a) * 36;
          const y1 = 60 + Math.sin(a) * 36;
          const x2 = 50 + Math.cos(a) * (i % 4 === 0 ? 28 : 32);
          const y2 = 60 + Math.sin(a) * (i % 4 === 0 ? 28 : 32);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--hub-amber-dim)" strokeWidth={i % 4 === 0 ? 1.2 : 0.6} />;
        })}
        <path d="M65,28 A 40,40 0 0 1 90,60" fill="none" stroke="var(--hub-red-dim)" strokeWidth="2" />
        <g transform={`translate(50,60) rotate(${angle - 90})`} style={{ transition: 'transform 0.4s ease' }}>
          <line x1="0" y1="0" x2="0" y2="-32" stroke="var(--hub-amber)" strokeWidth="1.5"
            style={{ filter: 'drop-shadow(0 0 3px var(--hub-amber))' }} />
        </g>
        <circle cx="50" cy="60" r="2" fill="var(--hub-amber)" />
      </svg>
      <span style={{
        fontSize: 10, letterSpacing: '0.2em',
        color: 'var(--hub-amber)', fontWeight: 600,
        fontFamily: 'var(--hub-font-seg)',
      }} className="glow-dim">{label}</span>
    </div>
  );
}

export function GaugeBankWidget() {
  const tick = useTick(900);
  const gauges = [
    { label: 'V', v: 0.6 + 0.3 * Math.sin(tick * 0.4) },
    { label: 'A', v: 0.5 + 0.4 * Math.sin(tick * 0.55 + 1) },
    { label: 'Ω', v: 0.7 + 0.2 * Math.sin(tick * 0.3 + 2) },
  ];

  return (
    <div style={{ height: '100%', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <DymoTape style={{ fontSize: 8 }}>GAUGE · TRIO</DymoTape>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {gauges.map(g => <AnalogGauge key={g.label} {...g} />)}
      </div>
    </div>
  );
}

// ============== BLANK PERFORATED PANEL ==============

export function BlankPanelWidget() {
  return (
    <div className="perf" style={{
      height: '100%',
      position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Screw size={7} rot={20} style={{ position: 'absolute', top: 10, left: 10 }} />
      <Screw size={7} rot={-15} style={{ position: 'absolute', top: 10, right: 10 }} />
      <Screw size={7} rot={48} style={{ position: 'absolute', bottom: 10, left: 10 }} />
      <Screw size={7} rot={-32} style={{ position: 'absolute', bottom: 10, right: 10 }} />
      <div style={{
        padding: '14px 22px',
        background: 'var(--hub-bg-1)',
        border: '1px solid var(--hub-line-strong)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.6)',
      }}>
        <LabelTape style={{ fontSize: 10 }}>RESERVED · BLANK</LabelTape>
      </div>
    </div>
  );
}
