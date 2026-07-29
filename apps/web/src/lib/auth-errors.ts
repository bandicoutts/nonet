/**
 * What `auth/callback` can send someone back with.
 *
 * **A plain module, not part of `SignInForm`.** It lived there first and the
 * auth page — a server component — could not call it: a function exported from
 * a `'use client'` module is a client reference on the server, so the page
 * threw and rendered the error boundary. The unit test passed throughout,
 * because it imports the function directly rather than across that boundary.
 *
 * The route writes one of three codes into the URL and, until now, nothing read
 * them: an expired link and a fresh page load looked identical, so the one
 * moment a player needs telling why they are still signed out said nothing.
 *
 * A whitelist rather than a lookup on the raw value, because this is a query
 * parameter — anything not listed here is ignored rather than displayed, so a
 * crafted URL cannot put text on the page.
 */
const CALLBACK_PROBLEM: Readonly<Record<string, string>> = {
  // The link arrived without its code, so nothing was ever exchanged.
  'missing-code': 'That sign-in link was incomplete. Ask for a new code below.',
  // Supabase is unconfigured — the client factory returned null.
  unavailable: 'Sign-in is unavailable just now. You can keep playing as a guest.',
  // Single-use and time-limited, so this is ordinary rather than exceptional.
  expired: 'That sign-in link has already been used or has expired. Ask for a new code below.',
};

export function problemFor(code: string | undefined): string | null {
  return code === undefined ? null : CALLBACK_PROBLEM[code] ?? null;
}
