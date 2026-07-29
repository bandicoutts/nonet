/**
 * Every route, discovered from the directory tree.
 *
 * Shared rather than duplicated, because both tests that use it exist for the
 * same reason: the tree is the contract, so a route added later is covered
 * without anyone remembering to add it to a list. A hardcoded list would simply
 * go stale, which is the failure both tests are meant to prevent.
 */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const APP = fileURLToPath(new URL('../src/app', import.meta.url));

export interface Route {
  readonly pathname: string;
  /** The route group that decides its chrome, or null at the app root. */
  readonly group: string | null;
  /** Absolute path to the `page.tsx`, for importing its `metadata`. */
  readonly file: string;
}

export function collectRoutes(dir: string = APP, segments: string[] = [], group: string | null = null): Route[] {
  const found: Route[] = [];

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);

    if (!statSync(full).isDirectory()) {
      if (entry === 'page.tsx') {
        found.push({ pathname: `/${segments.join('/')}` || '/', group, file: full });
      }
      continue;
    }

    const isGroup = entry.startsWith('(') && entry.endsWith(')');
    found.push(
      ...collectRoutes(
        full,
        isGroup ? segments : [...segments, entry],
        isGroup ? entry.slice(1, -1) : group,
      ),
    );
  }

  return found;
}
