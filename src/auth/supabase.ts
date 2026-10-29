import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../utils/env';

/**
 * The browser Supabase client, used for Auth (sign-in, session refresh) and for
 * uploading event images with the admin's own session. It only ever holds the
 * public anon/publishable key. Null when the project isn't configured.
 */
export const supabase: SupabaseClient | null =
  env.supabaseUrl && env.supabaseAnonKey
    ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      })
    : null;

/** The current access token, refreshed by the Supabase client if it has expired. */
export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
