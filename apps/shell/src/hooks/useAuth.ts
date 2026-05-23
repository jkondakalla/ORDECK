import { useState, useEffect, useCallback, createContext, useContext } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id:      string;
  email:   string;
  name:    string;
  picture: string;
}

export type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; user: AuthUser }
  | { status: 'unauthenticated'; error?: string };

export interface AuthContext {
  state:           AuthState;
  loginWithGoogle: () => void;
  logout:          () => Promise<void>;
}

// ─── Context (exported so plugins can consume it) ─────────────────────────────

export const authContext = createContext<AuthContext>({
  state:           { status: 'loading' },
  loginWithGoogle: () => { window.location.href = '/api/auth/google'; },
  logout:          async () => { /* noop */ },
});

export function useAuth(): AuthContext {
  return useContext(authContext);
}

// ─── Core hook ────────────────────────────────────────────────────────────────

export function useAuthProvider(): AuthContext {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const fetchMe = useCallback(async (): Promise<boolean> => {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (res.ok) {
      const user: AuthUser = await res.json();
      setState({ status: 'authenticated', user });
      return true;
    }
    return false;
  }, []);

  const refresh = useCallback(async (): Promise<boolean> => {
    const res = await fetch('/api/auth/refresh', {
      method:      'POST',
      credentials: 'include',
    });
    return res.ok;
  }, []);

  const check = useCallback(async () => {
    try {
      const ok = await fetchMe();
      if (ok) return;

      // Access token expired — try rotating the refresh token
      const refreshed = await refresh();
      if (refreshed) {
        const retried = await fetchMe();
        if (retried) return;
      }

      // Pull ?error= param from URL (set by auth service on redirect)
      const params = new URLSearchParams(window.location.search);
      const error  = params.get('error') ?? undefined;
      setState({ status: 'unauthenticated', error });
    } catch {
      setState({ status: 'unauthenticated' });
    }
  }, [fetchMe, refresh]);

  useEffect(() => {
    check();
  }, [check]);

  const loginWithGoogle = useCallback(() => {
    window.location.href = '/api/auth/google';
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/session', {
        method:      'DELETE',
        credentials: 'include',
      });
    } finally {
      setState({ status: 'unauthenticated' });
    }
  }, []);

  return { state, loginWithGoogle, logout };
}
