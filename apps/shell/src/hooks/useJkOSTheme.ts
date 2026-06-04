// Core theme application for ORDECK — called by useJkOSPreferences.
// The useJkOSTheme() hook has been replaced by useJkOSPreferences() in Dashboard.

const AUTH_URL =
  (import.meta.env.VITE_JKOS_AUTH_URL as string | undefined) ?? 'https://auth.jkos.net';

export interface JkOSTheme {
  mode:      'light' | 'dark' | 'system';
  primary:   string;
  secondary: string;
}

export const DEFAULT_THEME: JkOSTheme = {
  mode:      'system',
  primary:   '#ffb000',
  secondary: '#4ecdc4',
};

function colorMix(hex: string, other: string, pct: number) {
  return `color-mix(in srgb, ${hex} ${pct}%, ${other})`;
}

export function applyOrdeckTheme(theme: JkOSTheme): void {
  const r = document.documentElement;
  const p = theme.primary;
  const s = theme.secondary;

  r.style.setProperty('--hub-amber',        p);
  r.style.setProperty('--hub-amber-bright', colorMix(p, '#fff', 50));
  r.style.setProperty('--hub-amber-dim',    colorMix(p, '#000', 50));
  r.style.setProperty('--hub-amber-deep',   colorMix(p, '#000', 20));
  r.style.setProperty('--hub-amber-glow',   colorMix(p, 'transparent', 35));
  r.style.setProperty('--hub-cyan',         s);
  r.style.setProperty('--hub-cyan-dim',     colorMix(s, '#000', 40));
  r.style.setProperty('--hub-cyan-glow',    colorMix(s, 'transparent', 35));
  r.style.setProperty('--accent-base',      p);
  r.style.setProperty('--accent-secondary', s);
}

export { AUTH_URL };
