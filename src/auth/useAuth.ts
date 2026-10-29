import type { Session } from '@supabase/supabase-js';
import { createContext, useContext } from 'react';
import type { AdminSession } from '../types/admin';

/**
 * - `unconfigured`: Supabase env vars are missing.
 * - `loading`: reading the stored session.
 * - `signedOut`: no session.
 * - `checking`: signed in with Supabase; waiting for `GET /admin/me`.
 * - `admin`: the API confirmed an active ADMIN.
 * - `error`: `/admin/me` failed for another reason (network, 5xx); can retry.
 */
export type AuthStatus = 'unconfigured' | 'loading' | 'signedOut' | 'checking' | 'admin' | 'error';

export interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  /** Set only when the API has confirmed admin access. */
  admin: AdminSession | null;
  /** Why the admin check failed (status `error`). */
  error: string | null;
  /** Message for the sign-in page, e.g. access denied or session expired. */
  notice: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: (notice?: string) => Promise<void>;
  retry: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
