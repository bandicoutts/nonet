/**
 * Where a player may be sent after signing in.
 *
 * The target arrives in the callback URL, which is attacker-controlled, so it
 * is checked against a whitelist rather than validated by pattern. Every clever
 * string check has a case it gets wrong — `//host`, a backslash, an encoded
 * slash, an absolute URL that happens to end in a known path — and the product
 * has nine routes, so exact membership is both simpler and stricter.
 *
 * `/board` is deliberately absent: it needs a puzzle to be meaningful, and
 * "sign in, land on a board you did not choose" is not a flow.
 *
 * Exported for the tests; no other module imports it.
 */
export const SAFE_REDIRECTS = [
  '/',
  '/archive',
  '/record',
  '/settings',
  '/how-to-play',
  '/about',
] as const;

export type SafeRedirect = (typeof SAFE_REDIRECTS)[number];

const ALLOWED = new Set<string>(SAFE_REDIRECTS);

/**
 * The requested path if it is one of ours, otherwise home.
 *
 * Exact match, no trimming and no normalising: anything that needed cleaning up
 * to become valid was not a path this product produced.
 */
export function safeRedirect(requested: string | null | undefined): SafeRedirect {
  if (typeof requested !== 'string') return '/';
  return ALLOWED.has(requested) ? (requested as SafeRedirect) : '/';
}
