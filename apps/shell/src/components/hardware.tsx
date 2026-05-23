import { useState, useEffect, CSSProperties } from 'react';

// ─── LED ──────────────────────────────────────────────────────────────────────

interface LedProps {
  color?: 'amber' | 'cyan' | 'red' | 'green';
  steady?: boolean;
  size?: 'sm' | 'md' | 'lg';
  off?: boolean;
  style?: CSSProperties;
}

export function Led({ color = 'amber', steady, size = 'md', off, style }: LedProps) {
  const cls = [
    'led',
    color,
    steady ? 'steady' : '',
    size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : '',
    off ? 'off' : '',
  ].filter(Boolean).join(' ');
  return <span className={cls} style={style} />;
}

// ─── Screw ────────────────────────────────────────────────────────────────────

interface ScrewProps {
  rot?: number;
  size?: number;
  style?: CSSProperties;
}

export function Screw({ rot = 25, size = 10, style }: ScrewProps) {
  return (
    <span
      className={`screw${size === 7 ? ' sm' : ''}`}
      style={{ '--screw-rot': `${rot}deg`, ...style } as CSSProperties}
    />
  );
}

// ─── Vent (horizontal slats) ──────────────────────────────────────────────────

interface VentProps {
  slats?: number;
  width?: number | string;
  style?: CSSProperties;
}

export function Vent({ slats = 3, width = 60, style }: VentProps) {
  return (
    <div className="vent" style={{ width, ...style }}>
      {Array.from({ length: slats }).map((_, i) => <i key={i} />)}
    </div>
  );
}

// ─── Grille (dot-grid speaker grille) ────────────────────────────────────────

interface GrilleProps {
  cols?: number;
  rows?: number;
  dotSize?: number;
  gap?: number;
  style?: CSSProperties;
}

export function Grille({ cols = 8, rows = 5, dotSize = 2, gap = 3, style }: GrilleProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, ${dotSize}px)`,
      gridAutoRows: `${dotSize}px`,
      gap,
      padding: 6,
      background: 'var(--hub-bg-0)',
      border: '1px solid var(--hub-line)',
      boxShadow: 'inset 0 0 4px rgba(0,0,0,0.6)',
      ...style,
    }}>
      {Array.from({ length: cols * rows }).map((_, i) => (
        <span key={i} style={{
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #0a0907 30%, #1a1612 100%)',
        }} />
      ))}
    </div>
  );
}

// ─── Tape labels ──────────────────────────────────────────────────────────────

interface TapeProps {
  children?: React.ReactNode;
  style?: CSSProperties;
}

export function LabelTape({ children, style }: TapeProps) {
  return <span className="label-tape" style={style}>{children}</span>;
}

export function DymoTape({ children, style }: TapeProps) {
  return <span className="dymo-tape" style={style}>{children}</span>;
}

// ─── Panel (corner-screwed surface) ──────────────────────────────────────────

interface PanelProps {
  children?: React.ReactNode;
  screws?: boolean;
  screwSize?: number;
  style?: CSSProperties;
}

export function Panel({ children, screws = true, screwSize = 7, style }: PanelProps) {
  return (
    <div style={{
      position: 'relative',
      background: 'var(--hub-bg-1)',
      border: '1px solid var(--hub-line-strong)',
      ...style,
    }}>
      {screws && (
        <>
          <Screw size={screwSize} rot={15}  style={{ position: 'absolute', top: 4, left: 4 }} />
          <Screw size={screwSize} rot={-22} style={{ position: 'absolute', top: 4, right: 4 }} />
          <Screw size={screwSize} rot={62}  style={{ position: 'absolute', bottom: 4, left: 4 }} />
          <Screw size={screwSize} rot={-48} style={{ position: 'absolute', bottom: 4, right: 4 }} />
        </>
      )}
      {children}
    </div>
  );
}

// ─── 7-segment digit ──────────────────────────────────────────────────────────

const SEG_MAP: Record<string, number[]> = {
  '0': [1,1,1,1,1,1,0],
  '1': [0,1,1,0,0,0,0],
  '2': [1,1,0,1,1,0,1],
  '3': [1,1,1,1,0,0,1],
  '4': [0,1,1,0,0,1,1],
  '5': [1,0,1,1,0,1,1],
  '6': [1,0,1,1,1,1,1],
  '7': [1,1,1,0,0,0,0],
  '8': [1,1,1,1,1,1,1],
  '9': [1,1,1,1,0,1,1],
  '-': [0,0,0,0,0,0,1],
  ' ': [0,0,0,0,0,0,0],
};

interface SegDigitProps {
  char?: string;
  size?: number;
  color?: string;
  dim?: string;
}

export function SegDigit({
  char = '0',
  size = 32,
  color = 'var(--hub-amber)',
  dim = 'var(--hub-amber-deep)',
}: SegDigitProps) {
  const w = size * 0.55;
  const h = size;
  const t = Math.max(2, size * 0.09);
  const m = Math.max(1, size * 0.04);
  const segs = SEG_MAP[char] ?? SEG_MAP[' '];

  function path(which: string): string {
    switch (which) {
      case 'a': return `M${m+t/2},${m} L${w-m-t/2},${m} L${w-m-t},${m+t/2} L${m+t},${m+t/2} Z`;
      case 'g': return `M${m+t/2},${h/2} L${m+t},${h/2-t/2} L${w-m-t},${h/2-t/2} L${w-m-t/2},${h/2} L${w-m-t},${h/2+t/2} L${m+t},${h/2+t/2} Z`;
      case 'd': return `M${m+t/2},${h-m} L${m+t},${h-m-t/2} L${w-m-t},${h-m-t/2} L${w-m-t/2},${h-m} Z`;
      case 'f': return `M${m},${m+t/2} L${m+t/2},${m+t} L${m+t/2},${h/2-t} L${m},${h/2-t/2} Z`;
      case 'b': return `M${w-m},${m+t/2} L${w-m-t/2},${m+t} L${w-m-t/2},${h/2-t} L${w-m},${h/2-t/2} Z`;
      case 'e': return `M${m},${h-m-t/2} L${m+t/2},${h-m-t} L${m+t/2},${h/2+t} L${m},${h/2+t/2} Z`;
      case 'c': return `M${w-m},${h-m-t/2} L${w-m-t/2},${h-m-t} L${w-m-t/2},${h/2+t} L${w-m},${h/2+t/2} Z`;
      default:  return '';
    }
  }

  const order = ['a','b','c','d','e','f','g'];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      {order.map((s, i) => (
        <path
          key={s}
          d={path(s)}
          fill={segs[i] ? color : dim}
          style={segs[i] ? { filter: `drop-shadow(0 0 ${size * 0.12}px ${color}aa)` } : undefined}
        />
      ))}
    </svg>
  );
}

interface SegDisplayProps {
  value: string | number;
  length?: number;
  size?: number;
  separator?: boolean;
  style?: CSSProperties;
}

export function SegDisplay({ value, length = 6, size = 32, separator, style }: SegDisplayProps) {
  const str = String(value).padStart(length, ' ').slice(-length);
  const chars = str.split('');
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: size * 0.08,
      padding: size * 0.18,
      background: 'var(--hub-bg-0)',
      border: '1px solid var(--hub-line)',
      boxShadow: 'inset 0 0 8px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(0,0,0,0.4)',
      ...style,
    }}>
      {chars.map((c, i) => (
        <span key={i} style={{ display: 'contents' }}>
          <SegDigit char={c} size={size} />
          {separator && (i + 1) % 2 === 0 && i < chars.length - 1 && (
            <span style={{
              color: 'var(--hub-amber)',
              fontSize: size * 0.5,
              textShadow: '0 0 6px var(--hub-amber-glow)',
              transform: `translateY(-${size * 0.05}px)`,
              animation: 'blink 1s steps(2) infinite',
            }}>:</span>
          )}
        </span>
      ))}
    </div>
  );
}

// ─── VU Meter ─────────────────────────────────────────────────────────────────

interface VuMeterProps {
  value?: number;
  label?: string;
  height?: number;
  width?: number;
  color?: string;
}

export function VuMeter({ value = 0, label, height = 90, width = 14, color = 'var(--hub-amber)' }: VuMeterProps) {
  const v = Math.max(0, Math.min(1, value));
  const bars = 12;
  const litCount = Math.round(v * bars);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{
        width,
        height,
        background: 'var(--hub-bg-0)',
        border: '1px solid var(--hub-line)',
        padding: 2,
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: 1,
        boxShadow: 'inset 0 0 4px rgba(0,0,0,0.6)',
      }}>
        {Array.from({ length: bars }).map((_, i) => {
          const isLit = i < litCount;
          const isWarn = i >= bars - 3;
          const c = isLit ? (isWarn ? 'var(--hub-red)' : color) : 'var(--hub-bg-2)';
          return (
            <div key={i} style={{
              flex: 1,
              background: c,
              boxShadow: isLit ? `0 0 3px ${isWarn ? 'var(--hub-red-glow)' : 'var(--hub-amber-glow)'}` : 'none',
            }} />
          );
        })}
      </div>
      {label && (
        <div style={{ fontSize: 8, color: 'var(--hub-cream-dim)', letterSpacing: '0.1em' }}>
          {label}
        </div>
      )}
    </div>
  );
}

// ─── Knob ─────────────────────────────────────────────────────────────────────

interface KnobProps {
  value?: number;
  size?: number;
  label?: string;
  color?: string;
}

export function Knob({ value = 0.4, size = 36, label, color = 'var(--hub-amber)' }: KnobProps) {
  const angle = -135 + value * 270;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 30% 30%, #4a4234, #1a1612 80%)',
        boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.7), inset 0 2px 2px rgba(255,220,160,0.06), 0 1px 2px rgba(0,0,0,0.6)',
        position: 'relative',
      }}>
        <span style={{
          position: 'absolute',
          top: 3,
          left: '50%',
          width: 2,
          height: size * 0.4,
          background: color,
          boxShadow: `0 0 4px ${color}`,
          transform: `translateX(-50%) rotate(${angle}deg)`,
          transformOrigin: `50% ${size * 0.5 - 3}px`,
        }} />
      </div>
      {label && (
        <div style={{ fontSize: 8, color: 'var(--hub-cream-dim)', letterSpacing: '0.12em' }}>
          {label}
        </div>
      )}
    </div>
  );
}

// ─── Rocker Switch ────────────────────────────────────────────────────────────

interface RockerSwitchProps {
  on?: boolean;
  onToggle?: () => void;
  label?: string;
  width?: number;
}

export function RockerSwitch({ on = false, onToggle, label, width = 38 }: RockerSwitchProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <button onClick={onToggle} style={{
        width,
        height: 22,
        background: 'linear-gradient(180deg, #2c2820, #1a1612)',
        border: '1px solid #0a0907',
        boxShadow: 'inset 0 0 3px rgba(0,0,0,0.7)',
        position: 'relative',
        padding: 0,
        cursor: 'pointer',
      }}>
        <span style={{
          position: 'absolute',
          top: 2,
          bottom: 2,
          left: on ? width / 2 - 2 : 2,
          width: width / 2,
          background: on
            ? 'linear-gradient(180deg, #5a5040, #2a2620)'
            : 'linear-gradient(180deg, #3a342b, #1a1612)',
          borderTop: '1px solid rgba(255,220,160,0.1)',
          borderBottom: '1px solid rgba(0,0,0,0.6)',
          transition: 'left 0.12s ease',
        }} />
        <span style={{
          position: 'absolute',
          top: '50%',
          left: on ? width - 8 : 4,
          transform: 'translateY(-50%)',
          color: on ? 'var(--hub-amber)' : 'var(--hub-cream-faint)',
          fontSize: 8,
          fontWeight: 700,
          textShadow: on ? '0 0 4px var(--hub-amber-glow)' : 'none',
          transition: 'all 0.12s ease',
        }}>{on ? '|' : 'O'}</span>
      </button>
      {label && (
        <div style={{ fontSize: 8, color: 'var(--hub-cream-dim)', letterSpacing: '0.12em' }}>
          {label}
        </div>
      )}
    </div>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

interface SparklineProps {
  points: number[];
  width?: number;
  height?: number;
  color?: string;
  area?: boolean;
}

export function Sparkline({ points, width = 80, height = 24, color = 'var(--hub-amber)', area = true }: SparklineProps) {
  if (points.length < 2) return null;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const pathD = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((p - min) / range) * (height - 2) - 1;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const areaD = area ? `${pathD} L${width},${height} L0,${height} Z` : null;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {area && areaD && <path d={areaD} fill={color} opacity={0.15} />}
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.25}
        style={{ filter: `drop-shadow(0 0 2px ${color})` }} />
    </svg>
  );
}

// ─── Corner Brackets ──────────────────────────────────────────────────────────

interface CornerBracketsProps {
  inset?: number;
  size?: number;
  color?: string;
  thickness?: number;
}

export function CornerBrackets({
  inset = 6,
  size = 10,
  color = 'var(--hub-amber-dim)',
  thickness = 1.5,
}: CornerBracketsProps) {
  const base: CSSProperties = {
    position: 'absolute',
    width: size,
    height: size,
    borderColor: color,
    borderStyle: 'solid',
    pointerEvents: 'none',
  };
  return (
    <>
      <div style={{ ...base, top: inset, left: inset,    borderWidth: `${thickness}px 0 0 ${thickness}px` }} />
      <div style={{ ...base, top: inset, right: inset,   borderWidth: `${thickness}px ${thickness}px 0 0` }} />
      <div style={{ ...base, bottom: inset, left: inset, borderWidth: `0 0 ${thickness}px ${thickness}px` }} />
      <div style={{ ...base, bottom: inset, right: inset,borderWidth: `0 ${thickness}px ${thickness}px 0` }} />
    </>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useTick(ms = 1000): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setT(x => x + 1), ms);
    return () => clearInterval(iv);
  }, [ms]);
  return t;
}

export function useWaveform(length = 60, ms = 200): number[] {
  const [data, setData] = useState<number[]>(() =>
    Array.from({ length }, () => Math.random() * 0.5 + 0.25)
  );
  useEffect(() => {
    const iv = setInterval(() => {
      setData(d => [
        ...d.slice(1),
        Math.max(0.05, Math.min(0.95, d[d.length - 1] + (Math.random() - 0.5) * 0.4)),
      ]);
    }, ms);
    return () => clearInterval(iv);
  }, [ms, length]);
  return data;
}
