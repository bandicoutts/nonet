// @vitest-environment node
// Reads the route file from disk, and under jsdom `import.meta.url` is an
// http URL that `fileURLToPath` refuses — the same trap as `routes.test.ts`.
import { describe, expect, it } from 'vitest';
import { problemFor } from '@/lib/auth-errors';

/**
 * `auth/callback` writes one of three codes into the URL and nothing read them,
 * so an expired link and a fresh page load were indistinguishable: the player
 * landed back on a blank sign-in form with no explanation and no reason to
 * think anything had gone wrong.
 *
 * The mapping is a whitelist because it reads a query parameter. Anything not
 * listed is ignored rather than shown, so a crafted URL cannot put chosen text
 * on the sign-in screen.
 */
describe('what the callback can send a player back with', () => {
  it.each([
    ['missing-code', /incomplete/i],
    ['unavailable', /unavailable/i],
    ['expired', /expired/i],
  ])('%s explains itself', (code, expected) => {
    expect(problemFor(code)).toMatch(expected);
  });

  it('says nothing on an ordinary visit', () => {
    expect(problemFor(undefined)).toBeNull();
  });

  it('ignores a code it did not write', () => {
    expect(problemFor('anything-else')).toBeNull();
  });

  /** The parameter is attacker-controlled; it must never reach the page. */
  it('does not echo an injected value', () => {
    expect(problemFor('<img src=x onerror=alert(1)>')).toBeNull();
    expect(problemFor('Your account was deleted. Call this number.')).toBeNull();
  });

  /** Every code the route can actually produce is covered. */
  it('covers exactly the codes the callback writes', async () => {
    const { readFile } = await import('node:fs/promises');
    const route = await readFile(
      new URL('../src/app/(minimal)/auth/callback/route.ts', import.meta.url),
      'utf8',
    );

    const written = [...route.matchAll(/\?error=([a-z-]+)/g)].map((m) => m[1]);
    expect(written.length).toBeGreaterThan(0);
    for (const code of written) expect(problemFor(code)).not.toBeNull();
  });
});
