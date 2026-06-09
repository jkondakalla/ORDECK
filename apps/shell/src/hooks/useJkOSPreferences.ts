import { useState, useEffect, useCallback } from 'react';
import { applyOrdeckTheme, DEFAULT_THEME } from './useJkOSTheme';
import { applyJkOSMode } from '@design/utils/applyJkOSTheme';
import type { JkOSTheme } from './useJkOSTheme';
export type { JkOSTheme } from './useJkOSTheme';

const AUTH_URL =
  (import.meta.env.VITE_JKOS_AUTH_URL as string | undefined) ?? 'https://auth.jkos.net';

export interface EffectsPreferences {
  grain:         boolean;
  grainStrength: number;
  halation:      boolean;
  scanLines:     boolean;
  scanStrength:  number;
  artifacts:     boolean;
}

export interface LazurPreferences {
  url:   string;
  model: string;
}

export interface JkosUser {
  id:         string;
  email:      string;
  name:       string;
  avatar_url: string | null;
  role:       string;
}

export const DEFAULT_EFFECTS: EffectsPreferences = {
  grain:         true,
  grainStrength: 0.35,
  halation:      true,
  scanLines:     false,
  scanStrength:  0.25,
  artifacts:     false,
};

export const DEFAULT_LAZUROS: LazurPreferences = {
  url:   '',
  model: 'llama3.2',
};

function normaliseTheme(raw: any): JkOSTheme {
  if (!raw) return DEFAULT_THEME;
  if (raw.primary) return raw as JkOSTheme;
  return {
    mode:      raw.mode ?? 'system',
    primary:   raw.dark?.primary   ?? DEFAULT_THEME.primary,
    secondary: raw.dark?.secondary ?? DEFAULT_THEME.secondary,
  };
}

function applyCrtOverlays(isDark: boolean, eff: EffectsPreferences): void {
  const scanOp = isDark && eff.scanLines ? String(eff.scanStrength) : '0';
  document.documentElement.style.setProperty('--crt-scanline-opacity', scanOp);
}

function applyAll(t: JkOSTheme, eff: EffectsPreferences): boolean {
  const isDark = applyJkOSMode(t.mode);
  applyOrdeckTheme(t);
  applyCrtOverlays(isDark, eff);
  window.dispatchEvent(new CustomEvent('ordeck-mode', { detail: { isDark } }));
  return isDark;
}

export function useJkOSPreferences() {
  const [theme,   setTheme]   = useState<JkOSTheme>(DEFAULT_THEME);
  const [effects, setEffects] = useState<EffectsPreferences>(DEFAULT_EFFECTS);
  const [lazuros, setLazuros] = useState<LazurPreferences>(DEFAULT_LAZUROS);
  const [user,    setUser]    = useState<JkosUser | null>(null);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    fetch(`${AUTH_URL}/auth/profile`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        if (data.user) setUser(data.user);
        const fetchedEffects: EffectsPreferences = data.preferences?.effects
          ? { ...DEFAULT_EFFECTS, ...data.preferences.effects }
          : DEFAULT_EFFECTS;
        if (data.preferences?.effects) setEffects(fetchedEffects);
        if (data.preferences?.theme) {
          const t = normaliseTheme(data.preferences.theme);
          setTheme(t);
          applyAll(t, fetchedEffects);
        }
        if (data.preferences?.lazuros) {
          setLazuros(prev => ({ ...prev, ...data.preferences.lazuros }));
        }
      })
      .catch(() => {});
  }, []);

  // Re-apply mode when OS dark preference changes (only relevant in 'system' mode)
  useEffect(() => {
    if (theme.mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyAll(theme, effects);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme, effects]);

  const patch = useCallback(async (preferences: object) => {
    setSaving(true);
    try {
      await fetch(`${AUTH_URL}/auth/profile`, {
        method:      'PATCH',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ preferences }),
      });
    } finally {
      setSaving(false);
    }
  }, []);

  const patchTheme = useCallback((partial: Partial<JkOSTheme>) => {
    const next = { ...theme, ...partial };
    setTheme(next);
    applyAll(next, effects);
    patch({ theme: next });
  }, [theme, effects, patch]);

  const patchEffects = useCallback((partial: Partial<EffectsPreferences>) => {
    const next = { ...effects, ...partial };
    setEffects(next);
    if ('scanLines' in partial || 'scanStrength' in partial) {
      const isDark = document.documentElement.getAttribute('data-mode') === 'dark';
      applyCrtOverlays(isDark, next);
    }
    patch({ effects: next });
  }, [effects, patch]);

  const patchLazuros = useCallback((partial: Partial<LazurPreferences>) => {
    const next = { ...lazuros, ...partial };
    setLazuros(next);
    patch({ lazuros: next });
  }, [lazuros, patch]);

  return { theme, effects, lazuros, user, saving, patchTheme, patchEffects, patchLazuros };
}
