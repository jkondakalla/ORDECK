import { useEffect, useState } from 'react';

export default function ClockWidget() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const dateStr = now.toDateString().toUpperCase().replace(/ /g, ' · ');
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const utcStr = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())} UTC`;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: 8, textAlign: 'center',
    }}>
      <div style={{
        fontSize: 36, fontWeight: 300,
        color: 'var(--hub-amber)',
        letterSpacing: '0.08em',
        textShadow: '0 0 12px var(--hub-amber-glow)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {timeStr}
      </div>
      <div style={{ fontSize: 11, letterSpacing: '0.2em', color: 'var(--hub-cream-dim)' }}>
        {dateStr}
      </div>
      <div style={{ fontSize: 9, color: 'var(--hub-cream-dim)', letterSpacing: '0.15em', marginTop: 4 }}>
        // {tz.toUpperCase()} // {utcStr}
      </div>
    </div>
  );
}
