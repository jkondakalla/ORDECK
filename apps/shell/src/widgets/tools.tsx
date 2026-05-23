import { useState, useEffect, useMemo, CSSProperties } from 'react';
import { DymoTape, Led, SegDisplay } from '../components/hardware';

// ─── Shared helpers ───────────────────────────────────────────────────────────

function MiniLabel({ children, color, style }: { children: React.ReactNode; color?: string; style?: CSSProperties }) {
  return (
    <span style={{ fontSize: 8, letterSpacing: '0.2em', color: color || 'var(--hub-cream-faint)', ...style }}>
      {children}
    </span>
  );
}

function ToolButton({ children, onClick, color, secondary, disabled }: {
  children: React.ReactNode;
  onClick?: () => void;
  color?: string;
  secondary?: boolean;
  disabled?: boolean;
}) {
  const baseBg = secondary ? 'var(--hub-bg-1)' : 'linear-gradient(180deg, var(--hub-bg-3), var(--hub-bg-2))';
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '8px 6px',
      background: baseBg,
      border: `1px solid ${color ? color + '88' : 'var(--hub-line-strong)'}`,
      color: disabled ? 'var(--hub-cream-faint)' : (color || 'var(--hub-cream)'),
      fontFamily: 'var(--hub-font-mono)',
      fontSize: 10, letterSpacing: '0.1em', fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      transition: 'all 0.08s',
      boxShadow: 'inset 0 1px 0 rgba(255,220,160,0.06), 0 1px 0 rgba(0,0,0,0.6)',
    }}>{children}</button>
  );
}

// ─── Stopwatch ────────────────────────────────────────────────────────────────

interface SwState {
  running: boolean;
  elapsed: number;
  startedAt: number | null;
  laps: number[];
}

function fmtTime(ms: number) {
  const t = Math.floor(ms / 1000);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const cs = Math.floor((ms % 1000) / 10);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
}

export function StopwatchWidget({ widgetId }: { widgetId: number }) {
  const key = `ordeck-stopwatch-${widgetId}`;
  const [state, setState] = useState<SwState>(() => {
    try { return JSON.parse(localStorage.getItem(key) || '') || { running: false, elapsed: 0, startedAt: null, laps: [] }; }
    catch { return { running: false, elapsed: 0, startedAt: null, laps: [] }; }
  });
  const [, force] = useState(0);

  useEffect(() => { localStorage.setItem(key, JSON.stringify(state)); }, [key, state]);
  useEffect(() => {
    if (!state.running) return;
    const iv = setInterval(() => force(t => t + 1), 50);
    return () => clearInterval(iv);
  }, [state.running]);

  const totalMs = state.elapsed + (state.running && state.startedAt ? Date.now() - state.startedAt : 0);
  const totalSec = Math.floor(totalMs / 1000);
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;
  const cs = Math.floor((totalMs % 1000) / 10);

  const toggle = () => setState(s => s.running
    ? { ...s, running: false, elapsed: s.elapsed + (Date.now() - (s.startedAt ?? 0)), startedAt: null }
    : { ...s, running: true, startedAt: Date.now() });
  const reset = () => setState({ running: false, elapsed: 0, startedAt: null, laps: [] });
  const lap   = () => setState(s => ({ ...s, laps: [totalMs, ...s.laps].slice(0, 20) }));

  const timeStr = `${String(hh).padStart(2,'0')}${String(mm).padStart(2,'0')}${String(ss).padStart(2,'0')}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <DymoTape style={{ fontSize: 8 }}>STOPWATCH</DymoTape>
        <Led color={state.running ? 'green' : 'amber'} off={!state.running} size="sm" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 4, alignItems: 'baseline' }}>
        <SegDisplay value={timeStr} length={6} size={26} separator />
        <span style={{
          color: 'var(--hub-amber-dim)', fontSize: 18,
          fontFamily: 'var(--hub-font-seg)', fontWeight: 700,
          marginLeft: 4, minWidth: 28,
        }} className="glow-dim">.{String(cs).padStart(2,'0')}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        <ToolButton onClick={toggle} color={state.running ? 'var(--hub-red)' : 'var(--hub-green)'}>
          {state.running ? '■ STOP' : '▶ START'}
        </ToolButton>
        <ToolButton onClick={lap} disabled={!state.running}>↻ LAP</ToolButton>
        <ToolButton onClick={reset} secondary>⌫ RESET</ToolButton>
      </div>
      <div style={{ flex: 1, minHeight: 60, overflow: 'auto', background: 'var(--hub-bg-0)', border: '1px solid var(--hub-line)', padding: 4 }}>
        {state.laps.length === 0
          ? <div style={{ padding: 8, fontSize: 9, color: 'var(--hub-cream-faint)', letterSpacing: '0.15em', textAlign: 'center' }}>// NO LAPS RECORDED</div>
          : state.laps.map((lapMs, i) => {
              const idx = state.laps.length - i;
              const next = state.laps[i + 1] ?? 0;
              return (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '24px 1fr 1fr',
                  gap: 6, fontSize: 10, padding: '3px 6px',
                  borderBottom: '1px dotted var(--hub-bg-2)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  <span style={{ color: 'var(--hub-cream-faint)' }}>#{String(idx).padStart(2,'0')}</span>
                  <span style={{ color: 'var(--hub-cream)' }}>{fmtTime(lapMs)}</span>
                  <span style={{ color: 'var(--hub-amber-dim)' }}>+{fmtTime(lapMs - next)}</span>
                </div>
              );
            })}
      </div>
    </div>
  );
}

// ─── World Clocks ─────────────────────────────────────────────────────────────

const ZONES = [
  { id: 'sfo', label: 'SFO', name: 'San Francisco', tz: 'America/Los_Angeles' },
  { id: 'nyc', label: 'NYC', name: 'New York',       tz: 'America/New_York' },
  { id: 'lhr', label: 'LHR', name: 'London',          tz: 'Europe/London' },
  { id: 'sin', label: 'SIN', name: 'Singapore',       tz: 'Asia/Singapore' },
  { id: 'syd', label: 'SYD', name: 'Sydney',          tz: 'Australia/Sydney' },
  { id: 'utc', label: 'UTC', name: 'Universal',       tz: 'UTC' },
];

export function WorldClocksWidget() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <div style={{
        padding: '7px 12px', background: 'var(--hub-bg-2)',
        borderBottom: '1px solid var(--hub-line)',
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
      }}>
        <DymoTape style={{ fontSize: 8 }}>WORLD · TIME</DymoTape>
        <MiniLabel style={{ marginLeft: 'auto' }}>{ZONES.length} ZONES</MiniLabel>
      </div>
      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {ZONES.map(z => {
          const t = new Date(now.toLocaleString('en-US', { timeZone: z.tz }));
          const hh = String(t.getHours()).padStart(2, '0');
          const mm = String(t.getMinutes()).padStart(2, '0');
          const ss = String(t.getSeconds()).padStart(2, '0');
          const isNight = t.getHours() < 6 || t.getHours() >= 20;
          return (
            <div key={z.id} style={{
              display: 'grid', gridTemplateColumns: '36px 1fr auto auto',
              alignItems: 'center', gap: 10, padding: '6px 10px',
              background: 'var(--hub-bg-0)', border: '1px solid var(--hub-line)',
            }}>
              <span style={{ fontFamily: 'var(--hub-font-seg)', fontWeight: 700, fontSize: 14, color: 'var(--hub-amber)' }} className="glow-dim">
                {z.label}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                <span style={{ fontSize: 9.5, color: 'var(--hub-cream)' }}>{z.name}</span>
                <span style={{ fontSize: 8, color: 'var(--hub-cream-faint)', letterSpacing: '0.12em' }}>{z.tz}</span>
              </div>
              <span style={{ fontSize: 14, color: isNight ? 'var(--hub-cyan)' : 'var(--hub-amber)' }}>{isNight ? '◑' : '◐'}</span>
              <span style={{
                fontFamily: 'var(--hub-font-seg)', color: 'var(--hub-amber)',
                fontSize: 18, fontVariantNumeric: 'tabular-nums', fontWeight: 600,
              }} className="glow-dim">
                {hh}<span style={{ animation: 'blink 1s steps(2) infinite', color: 'var(--hub-amber-dim)' }}>:</span>{mm}
                <span style={{ color: 'var(--hub-amber-dim)', fontSize: 13 }}>:{ss}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Calculator ───────────────────────────────────────────────────────────────

function compute(a: number, b: number, op: string): number {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b === 0 ? NaN : a / b;
    default:  return b;
  }
}
function formatNum(n: number): string {
  if (!isFinite(n)) return 'ERR';
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
  return parseFloat(n.toFixed(8)).toString();
}

export function CalcWidget({ widgetId }: { widgetId: number }) {
  const key = `ordeck-calc-${widgetId}`;
  const [display, setDisplay] = useState('0');
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [doReset, setDoReset] = useState(false);
  const [history, setHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(history)); }, [key, history]);

  const press = (n: number) => {
    if (doReset || display === '0') setDisplay(String(n));
    else setDisplay(d => d.length > 14 ? d : d + n);
    setDoReset(false);
  };
  const pressDot = () => {
    if (doReset) { setDisplay('0.'); setDoReset(false); return; }
    if (!display.includes('.')) setDisplay(d => d + '.');
  };
  const setOperator = (newOp: string) => {
    const cur = parseFloat(display);
    if (acc != null && op && !doReset) {
      const result = compute(acc, cur, op);
      setAcc(result); setDisplay(formatNum(result));
    } else { setAcc(cur); }
    setOp(newOp); setDoReset(true);
  };
  const equals = () => {
    if (acc == null || op == null) return;
    const cur = parseFloat(display);
    const result = compute(acc, cur, op);
    const fmt = formatNum(result);
    setHistory(h => [`${formatNum(acc)} ${op} ${formatNum(cur)} = ${fmt}`, ...h].slice(0, 30));
    setDisplay(fmt); setAcc(null); setOp(null); setDoReset(true);
  };
  const clear  = () => { setDisplay('0'); setAcc(null); setOp(null); setDoReset(false); };
  const back   = () => setDisplay(d => d.length <= 1 ? '0' : d.slice(0, -1));
  const negate = () => setDisplay(d => d === '0' ? d : d.startsWith('-') ? d.slice(1) : '-' + d);
  const pct    = () => setDisplay(d => formatNum(parseFloat(d) / 100));

  const btn = (label: string, action: () => void, color?: string) => (
    <button key={label} onClick={action}
      onMouseDown={e => { (e.currentTarget as HTMLElement).style.background = 'var(--hub-bg-0)'; }}
      onMouseUp={e => { (e.currentTarget as HTMLElement).style.background = 'linear-gradient(180deg, var(--hub-bg-3), var(--hub-bg-2))'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'linear-gradient(180deg, var(--hub-bg-3), var(--hub-bg-2))'; }}
      style={{
        padding: '10px 6px',
        background: 'linear-gradient(180deg, var(--hub-bg-3), var(--hub-bg-2))',
        border: '1px solid var(--hub-line-strong)',
        color: color || 'var(--hub-cream)',
        fontFamily: 'var(--hub-font-mono)',
        fontSize: 12, letterSpacing: '0.06em', fontWeight: 500,
        cursor: 'pointer',
        boxShadow: 'inset 0 1px 0 rgba(255,220,160,0.06), 0 1px 0 rgba(0,0,0,0.6)',
      }}
    >{label}</button>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '6px 10px', background: 'var(--hub-bg-0)', borderBottom: '1px solid var(--hub-line)',
        display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, letterSpacing: '0.08em',
      }}>
        <span style={{ color: 'var(--hub-amber)', letterSpacing: '0.15em', fontWeight: 600 }} className="glow-dim">CALC · 64-BIT</span>
        <MiniLabel style={{ marginLeft: 'auto' }}>{history.length} HIST</MiniLabel>
      </div>
      <div style={{ padding: 8, background: 'var(--hub-bg-0)', borderBottom: '1px solid var(--hub-line)' }}>
        <div style={{ fontSize: 8, color: 'var(--hub-cream-faint)', letterSpacing: '0.15em', minHeight: 12, textAlign: 'right' }}>
          {acc != null ? `${formatNum(acc)} ${op || ''}` : ' '}
        </div>
        <div style={{
          color: 'var(--hub-amber)', fontSize: 28, fontWeight: 600,
          fontFamily: 'var(--hub-font-seg)', textShadow: '0 0 8px var(--hub-amber-glow)',
          letterSpacing: '0.04em', textAlign: 'right',
          overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{display}</div>
      </div>
      <div style={{
        flex: 1, padding: 6, background: 'var(--hub-bg-1)',
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gridAutoRows: '1fr', gap: 4,
      }}>
        {btn('AC', clear, 'var(--hub-red)')}
        {btn('±',  negate)}
        {btn('%',  pct)}
        {btn('÷',  () => setOperator('/'), 'var(--hub-amber)')}
        {btn('7',  () => press(7))}{btn('8', () => press(8))}{btn('9', () => press(9))}
        {btn('×',  () => setOperator('*'), 'var(--hub-amber)')}
        {btn('4',  () => press(4))}{btn('5', () => press(5))}{btn('6', () => press(6))}
        {btn('−',  () => setOperator('-'), 'var(--hub-amber)')}
        {btn('1',  () => press(1))}{btn('2', () => press(2))}{btn('3', () => press(3))}
        {btn('+',  () => setOperator('+'), 'var(--hub-amber)')}
        {btn('⌫',  back)}
        {btn('0',  () => press(0))}
        {btn('.',  pressDot)}
        {btn('=',  equals, 'var(--hub-amber-bright)')}
      </div>
    </div>
  );
}

// ─── Pomodoro ─────────────────────────────────────────────────────────────────

interface PomState {
  phase: 'work' | 'break';
  running: boolean;
  endsAt: number | null;
  remaining: number;
  completed: number;
  workMin: number;
  breakMin: number;
}

export function PomodoroWidget({ widgetId }: { widgetId: number }) {
  const key = `ordeck-pomodoro-${widgetId}`;
  const [state, setState] = useState<PomState>(() => {
    try { return JSON.parse(localStorage.getItem(key) || '') || { phase: 'work', running: false, endsAt: null, remaining: 25 * 60 * 1000, completed: 0, workMin: 25, breakMin: 5 }; }
    catch { return { phase: 'work', running: false, endsAt: null, remaining: 25 * 60 * 1000, completed: 0, workMin: 25, breakMin: 5 }; }
  });
  const [, force] = useState(0);

  useEffect(() => { localStorage.setItem(key, JSON.stringify(state)); }, [key, state]);

  useEffect(() => {
    if (!state.running || !state.endsAt) return;
    const iv = setInterval(() => {
      force(t => t + 1);
      if (state.endsAt! - Date.now() <= 0) {
        const newPhase = state.phase === 'work' ? 'break' : 'work';
        const newMin = newPhase === 'work' ? state.workMin : state.breakMin;
        setState(s => ({ ...s, phase: newPhase, running: false, endsAt: null, remaining: newMin * 60 * 1000, completed: s.phase === 'work' ? s.completed + 1 : s.completed }));
      }
    }, 250);
    return () => clearInterval(iv);
  }, [state.running, state.endsAt, state.phase, state.workMin, state.breakMin]);

  const rem = state.running && state.endsAt ? Math.max(0, state.endsAt - Date.now()) : state.remaining;
  const mm = Math.floor(rem / 60000);
  const ss = Math.floor((rem % 60000) / 1000);
  const totalMs = (state.phase === 'work' ? state.workMin : state.breakMin) * 60000;
  const pct = 1 - rem / totalMs;
  const isWork = state.phase === 'work';
  const color = isWork ? 'var(--hub-amber)' : 'var(--hub-cyan)';

  const start = () => setState(s => ({ ...s, running: true, endsAt: Date.now() + s.remaining }));
  const pause = () => setState(s => ({ ...s, running: false, remaining: Math.max(0, (s.endsAt ?? 0) - Date.now()) }));
  const skip  = () => setState(s => { const p = s.phase === 'work' ? 'break' : 'work'; return { ...s, phase: p, running: false, endsAt: null, remaining: (p === 'work' ? s.workMin : s.breakMin) * 60000 }; });
  const reset = () => setState(s => ({ ...s, running: false, endsAt: null, remaining: (s.phase === 'work' ? s.workMin : s.breakMin) * 60000 }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <DymoTape style={{ fontSize: 8 }}>POMODORO</DymoTape>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Led color={isWork ? 'amber' : 'cyan'} size="sm" />
          <span style={{ fontSize: 9, letterSpacing: '0.2em', color, fontWeight: 600 }} className="glow-dim">
            {isWork ? 'FOCUS' : 'BREAK'}
          </span>
        </div>
      </div>
      <div style={{ position: 'relative', alignSelf: 'center' }}>
        <svg width="118" height="118" viewBox="0 0 118 118">
          <circle cx="59" cy="59" r="50" fill="none" stroke="var(--hub-bg-3)" strokeWidth="6" />
          <circle cx="59" cy="59" r="50" fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={`${pct * 314} 314`} strokeLinecap="butt"
            transform="rotate(-90 59 59)"
            style={{ filter: `drop-shadow(0 0 4px ${color})`, transition: 'stroke-dasharray 0.4s linear' }} />
          {Array.from({ length: 24 }).map((_, i) => {
            const a = (i / 24) * Math.PI * 2 - Math.PI / 2;
            const x1 = 59 + Math.cos(a) * 42; const y1 = 59 + Math.sin(a) * 42;
            const x2 = 59 + Math.cos(a) * (i % 6 === 0 ? 36 : 39);
            const y2 = 59 + Math.sin(a) * (i % 6 === 0 ? 36 : 39);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--hub-amber-dim)" strokeWidth={i % 6 === 0 ? 1 : 0.5} />;
          })}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: 'var(--hub-font-seg)', fontSize: 28, fontWeight: 700, color, lineHeight: 1 }} className="glow">
            {String(mm).padStart(2,'0')}:{String(ss).padStart(2,'0')}
          </div>
          <div style={{ fontSize: 8, color: 'var(--hub-cream-faint)', letterSpacing: '0.2em', marginTop: 3 }}>
            {state.completed} CYCLE{state.completed === 1 ? '' : 'S'}
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        <ToolButton onClick={state.running ? pause : start} color={state.running ? 'var(--hub-amber)' : color}>
          {state.running ? '❚❚ PAUSE' : '▶ START'}
        </ToolButton>
        <ToolButton onClick={skip}>↷ SKIP</ToolButton>
        <ToolButton onClick={reset} secondary>⌫</ToolButton>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 9 }}>
        {(['FOCUS', 'BREAK'] as const).map(label => {
          const isWork2 = label === 'FOCUS';
          const val = isWork2 ? state.workMin : state.breakMin;
          const onChange = (v: number) => setState(s => ({
            ...s,
            ...(isWork2 ? { workMin: v } : { breakMin: v }),
            ...(!s.running && s.phase === (isWork2 ? 'work' : 'break') ? { remaining: v * 60000 } : {}),
          }));
          return (
            <div key={label} style={{ background: 'var(--hub-bg-0)', border: '1px solid var(--hub-line)', padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <MiniLabel>{label}</MiniLabel>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button onClick={() => onChange(Math.max(1, val - 1))} style={{ width: 16, height: 16, padding: 0, border: '1px solid var(--hub-line-strong)', background: 'var(--hub-bg-2)', color: 'var(--hub-cream)', fontSize: 11, lineHeight: 1, cursor: 'pointer' }}>−</button>
                <span style={{ color: 'var(--hub-amber)', fontFamily: 'var(--hub-font-seg)', fontWeight: 700, fontSize: 13, minWidth: 22, textAlign: 'center' }} className="glow-dim">{val}</span>
                <button onClick={() => onChange(Math.min(99, val + 1))} style={{ width: 16, height: 16, padding: 0, border: '1px solid var(--hub-line-strong)', background: 'var(--hub-bg-2)', color: 'var(--hub-cream)', fontSize: 11, lineHeight: 1, cursor: 'pointer' }}>+</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

export function CalendarWidget() {
  const [now, setNow] = useState(new Date());
  const [view, setView] = useState(() => { const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() }; });
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(iv);
  }, []);

  const days = useMemo(() => {
    const first = new Date(view.year, view.month, 1);
    const startDow = first.getDay();
    const daysIn = new Date(view.year, view.month + 1, 0).getDate();
    const prevDays = new Date(view.year, view.month, 0).getDate();
    const arr: { d: number; dim?: boolean }[] = [];
    for (let i = startDow - 1; i >= 0; i--) arr.push({ d: prevDays - i, dim: true });
    for (let i = 1; i <= daysIn; i++) arr.push({ d: i });
    while (arr.length % 7) arr.push({ d: arr.length - startDow - daysIn + 1, dim: true });
    return arr;
  }, [view.year, view.month]);

  const monthName = new Date(view.year, view.month).toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
  const isCurrentMonth = view.year === now.getFullYear() && view.month === now.getMonth();
  const nudge = (d: number) => setView(v => { const m = new Date(v.year, v.month + d); return { year: m.getFullYear(), month: m.getMonth() }; });

  const navBtn: CSSProperties = { width: 24, height: 22, background: 'var(--hub-bg-2)', border: '1px solid var(--hub-line-strong)', color: 'var(--hub-amber)', fontSize: 10, cursor: 'pointer' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => nudge(-1)} style={navBtn}>◀</button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{ fontFamily: 'var(--hub-font-seg)', color: 'var(--hub-amber)', fontSize: 16, fontWeight: 700, letterSpacing: '0.1em' }} className="glow-dim">
            {monthName} {view.year}
          </span>
        </div>
        <button onClick={() => nudge(1)} style={navBtn}>▶</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 8, color: 'var(--hub-cream-faint)', letterSpacing: '0.15em', padding: '4px 0', borderBottom: '1px solid var(--hub-line)' }}>{d}</div>
        ))}
        {days.map((day, i) => {
          const isToday = !day.dim && isCurrentMonth && day.d === now.getDate();
          return (
            <div key={i} style={{
              aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontFamily: 'var(--hub-font-mono)', fontVariantNumeric: 'tabular-nums',
              color: day.dim ? 'var(--hub-cream-faint)' : 'var(--hub-cream)',
              background: isToday ? 'var(--hub-amber-deep)' : 'transparent',
              border: isToday ? '1px solid var(--hub-amber)' : '1px solid transparent',
              boxShadow: isToday ? '0 0 6px var(--hub-amber-glow), inset 0 0 4px var(--hub-amber-glow)' : 'none',
              position: 'relative',
            }}>
              <span style={isToday ? { color: 'var(--hub-amber)', fontWeight: 700, textShadow: '0 0 4px var(--hub-amber-glow)' } : {}}>
                {day.d}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 'auto', padding: 8, background: 'var(--hub-bg-0)', border: '1px solid var(--hub-line)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
        {[
          { label: 'DAY',  value: String(now.getDate()).padStart(2,'0') },
          { label: 'WEEK', value: `W${Math.ceil(((now.getTime() - new Date(now.getFullYear(),0,1).getTime()) / 86400000 + new Date(now.getFullYear(),0,1).getDay()) / 7)}` },
          { label: 'DOY',  value: String(Math.floor((now.getTime() - new Date(now.getFullYear(),0,0).getTime()) / 86400000)).padStart(3,'0') },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <MiniLabel>{label}</MiniLabel>
            <span style={{ color: 'var(--hub-amber)', fontSize: 12, fontWeight: 600 }} className="glow-dim">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
