import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * The server client.
 *
 * `cookies()` is awaited — it is a Promise in Next 16. Returns `null` when the
 * project is not configured, for the same reason the browser client does:
 * play must survive a missing environment.
 */
export async function createClient() {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const key = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  if (url === undefined || key === undefined) return null;

  const store = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) store.set(name, value, options);
        } catch {
          // Called from a Server Component, where cookies cannot be written.
          // The proxy refreshes the session, so there is nothing to recover.
        }
      },
    },
  });
}
