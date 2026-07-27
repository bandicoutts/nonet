import { createBrowserClient } from '@supabase/ssr';

/**
 * The browser client.
 *
 * Signing in is always optional — it protects progress, it never gates play
 * (ARCHITECTURE.md) — so this returns `null` when the project is not
 * configured rather than throwing. A missing environment variable should leave
 * a guest with a working puzzle, not a blank page.
 */
export function createClient() {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const key = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  if (url === undefined || key === undefined) return null;

  return createBrowserClient(url, key);
}

/** Whether sign-in can be offered at all. */
export function isConfigured(): boolean {
  return (
    process.env['NEXT_PUBLIC_SUPABASE_URL'] !== undefined &&
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] !== undefined
  );
}
