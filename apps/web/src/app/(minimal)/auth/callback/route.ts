import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeRedirect } from '@/lib/redirect';

/**
 * Where the magic link lands.
 *
 * Exchanges the one-time code for a session, then sends the player on. The
 * destination comes from the URL and is therefore attacker-controlled, so it
 * goes through the whitelist in `safeRedirect` — an open redirect here would
 * fire with a freshly-minted session in hand, which is the worst moment for
 * one.
 *
 * `merged=1` on the way out is what raises the post-sign-in summary. The merge
 * itself runs on the client, because the guest's half of it lives in
 * localStorage and the server has never seen it.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = safeRedirect(url.searchParams.get('next'));

  if (code === null) {
    return NextResponse.redirect(new URL('/auth?error=missing-code', url.origin));
  }

  const supabase = await createClient();
  if (supabase === null) {
    return NextResponse.redirect(new URL('/auth?error=unavailable', url.origin));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    // The link is single-use and time-limited, so an expired one is ordinary
    // rather than exceptional. Say so on the auth screen instead of failing.
    return NextResponse.redirect(new URL('/auth?error=expired', url.origin));
  }

  const destination = new URL(next, url.origin);
  destination.searchParams.set('merged', '1');
  return NextResponse.redirect(destination);
}
