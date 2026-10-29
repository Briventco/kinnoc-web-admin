import type { Session } from '@supabase/supabase-js';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { getAdminMe } from '../api/admin';
import { errorMessage, isAuthFailure, setAuthFailureHandler } from '../api/client';
import type { AdminSession } from '../types/admin';
import { AuthContext, type AuthContextValue, type AuthStatus } from './useAuth';
import { supabase } from './supabase';

interface AdminCheck {
  userId: string;
  admin: AdminSession | null;
  error: string | null;
}

/**
 * Owns the Supabase session and the admin check. Access is granted only when
 * `GET /admin/me` succeeds for the current user; nothing stored in the browser
 * counts as proof of the role. Any later 401/403 from the API signs out.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(!supabase);
  const [check, setCheck] = useState<AdminCheck | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoaded(true);
    });
    // Don't call other Supabase methods inside this callback (it can deadlock).
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setSessionLoaded(true);
      if (!next) setCheck(null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async (message?: string) => {
    setNotice(message ?? null);
    setCheck(null);
    await supabase?.auth.signOut({ scope: 'local' });
  }, []);

  // Central handling of expired sessions and revoked access from any API call.
  useEffect(() => {
    setAuthFailureHandler((error) => {
      void signOut(
        error.status === 401 ? 'Your session has expired. Please sign in again.' : error.message,
      );
    });
    return () => setAuthFailureHandler(null);
  }, [signOut]);

  const userId = session?.user.id ?? null;

  // Re-check only when the user changes (not on every token refresh).
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getAdminMe()
      .then((admin) => {
        if (!cancelled) setCheck({ userId, admin, error: null });
      })
      .catch((error: unknown) => {
        // 401/403 are already handled by the auth failure handler (signs out).
        if (cancelled || isAuthFailure(error)) return;
        setCheck({ userId, admin: null, error: errorMessage(error) });
      });
    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    setNotice(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const retry = useCallback(() => {
    setCheck(null);
    setAttempt((n) => n + 1);
  }, []);

  const current = check && check.userId === userId ? check : null;
  let status: AuthStatus;
  if (!supabase) status = 'unconfigured';
  else if (!sessionLoaded) status = 'loading';
  else if (!session) status = 'signedOut';
  else if (current?.admin) status = 'admin';
  else if (current?.error) status = 'error';
  else status = 'checking';

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      admin: current?.admin ?? null,
      error: current?.error ?? null,
      notice,
      signIn,
      signOut,
      retry,
    }),
    [status, session, current, notice, signIn, signOut, retry],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
