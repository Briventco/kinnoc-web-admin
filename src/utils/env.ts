/**
 * Public build-time configuration from VITE_* variables (see .env.example).
 * Missing Supabase values are reported on the sign-in page instead of crashing the app.
 */
export const env = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, ''),
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  eventMediaBucket: import.meta.env.VITE_SUPABASE_EVENT_MEDIA_BUCKET || 'event-media',
};

/** Names of required variables that are empty, for a helpful setup message. */
export function missingEnv(): string[] {
  const missing: string[] = [];
  if (!env.apiBaseUrl) missing.push('VITE_API_BASE_URL');
  if (!env.supabaseUrl) missing.push('VITE_SUPABASE_URL');
  if (!env.supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY');
  return missing;
}
