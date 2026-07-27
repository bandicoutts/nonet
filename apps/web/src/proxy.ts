import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Session refresh.
 *
 * Next 16 names this `proxy()` in `src/proxy.ts`; it is what used to be
 * middleware. Its only job is to keep the auth cookie fresh, so a signed-in
 * player is not quietly signed out mid-solve.
 *
 * It deliberately guards nothing. Every route in this product is playable
 * signed out (ARCHITECTURE.md), so there is no page to gate — and a proxy that
 * redirected would be the one thing standing between a guest and their puzzle.
 */
export async function proxy(request: NextRequest) {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const key = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

  // Unconfigured is a normal state: the app runs, guest-first, without Supabase.
  if (url === undefined || key === undefined) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet) {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });

  // Reads the user, which is what triggers the refresh. The result is not used:
  // nothing here depends on who they are.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  /*
   * Everything except static assets and images. The board is included on
   * purpose — a long solve is exactly when a session would otherwise expire.
   */
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
