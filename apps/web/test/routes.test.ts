// @vitest-environment node
// A filesystem test, not a DOM one — and under jsdom `import.meta.url` is an
// http URL, which `fileURLToPath` refuses.
import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { APP, collectRoutes } from './route-tree';

/**
 * The chrome a route gets is decided by which route group it sits in, so the
 * directory tree *is* the contract. Asserting it here rather than through a
 * parallel `chromeFor(pathname)` helper keeps one source of truth: moving
 * /settings into the immersive group is caught, where a lookup table would
 * simply have gone stale.
 *
 * DESIGN.md: site header + footer on browsing screens, immersive header on
 * Board and Solved, minimal header on Auth, 404 and load error.
 */
const routes = collectRoutes(APP);
const groupOf = new Map(routes.map((r) => [r.pathname, r.group]));

describe('route tree', () => {
  it('publishes exactly the nine routes ARCHITECTURE.md names', () => {
    expect([...groupOf.keys()].sort()).toEqual([
      '/',
      '/about',
      '/archive',
      '/auth',
      '/board',
      '/how-to-play',
      '/record',
      '/settings',
      '/solved',
    ]);
  });

  it('has no /practice route — practice is a section of Home (NONET-2)', () => {
    expect(groupOf.has('/practice')).toBe(false);
  });

  it.each(['/', '/archive', '/record', '/settings', '/how-to-play', '/about'])(
    'gives %s the site header and footer',
    (pathname) => {
      expect(groupOf.get(pathname)).toBe('site');
    },
  );

  it.each(['/board', '/solved'])('gives %s the immersive header', (pathname) => {
    expect(groupOf.get(pathname)).toBe('immersive');
  });

  it('gives /auth the minimal header', () => {
    expect(groupOf.get('/auth')).toBe('minimal');
  });

  it('carries a not-found and an error boundary at the app root', () => {
    const root = readdirSync(APP);
    expect(root).toContain('not-found.tsx');
    expect(root).toContain('error.tsx');
  });
});
