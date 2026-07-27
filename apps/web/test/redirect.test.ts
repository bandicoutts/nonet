import { describe, expect, it } from 'vitest';
import { SAFE_REDIRECTS, safeRedirect } from '../src/lib/redirect';

/**
 * An auth callback takes a redirect target from the URL, and a URL is
 * attacker-controlled. Sending a freshly-signed-in player to somewhere of the
 * attacker's choosing is an open redirect; doing it in the callback means it
 * happens with a live session in hand.
 *
 * Validated against a whitelist, not a pattern. The product has nine routes, so
 * the whitelist is trivial to maintain and strictly safer than any amount of
 * clever string checking — every case below is something a pattern gets wrong
 * at least sometimes.
 */
describe('the post-sign-in redirect', () => {
  it.each([...SAFE_REDIRECTS])('allows the known route %s', (path) => {
    expect(safeRedirect(path)).toBe(path);
  });

  it('falls back home when nothing was asked for', () => {
    expect(safeRedirect(null)).toBe('/');
    expect(safeRedirect(undefined)).toBe('/');
    expect(safeRedirect('')).toBe('/');
  });

  it.each([
    ['an absolute URL', 'https://evil.example'],
    ['a protocol-relative URL', '//evil.example'],
    ['a backslash-smuggled host', '/\\evil.example'],
    ['a backslash pair', '\\\\evil.example'],
    ['a javascript URL', 'javascript:alert(1)'],
    ['a data URL', 'data:text/html,<script>'],
    ['an encoded protocol-relative URL', '/%2f%2fevil.example'],
    ['an absolute URL with a known path appended', 'https://evil.example/archive'],
    ['a route that does not exist', '/practice'],
    ['a path traversal', '/../../etc/passwd'],
    ['a whitespace-padded route', ' /archive'],
    ['a case variant', '/Archive'],
    ['a route with a query string', '/archive?next=https://evil.example'],
    ['a route with a fragment', '/archive#x'],
  ])('refuses %s', (_label, value) => {
    expect(safeRedirect(value)).toBe('/');
  });

  it('never returns anything outside the whitelist', () => {
    const attempts = ['/', '/archive', 'https://evil.example', '//x', null, '/nope'];
    for (const attempt of attempts) {
      expect(SAFE_REDIRECTS).toContain(safeRedirect(attempt));
    }
  });

  /** The board is deliberately absent: it needs a puzzle, not a bare path. */
  it('does not offer the board as a redirect target', () => {
    expect(SAFE_REDIRECTS).not.toContain('/board');
    expect(safeRedirect('/board')).toBe('/');
  });
});
