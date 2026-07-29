// @vitest-environment node
import { pathToFileURL } from 'node:url';
import type { Metadata } from 'next';
import { describe, expect, it } from 'vitest';
import { collectRoutes } from './route-tree';

/**
 * **"Override only the fields you need" is false, and this is the test that
 * says so.**
 *
 * Next merges metadata shallowly *at the object level*. A route declaring
 * `alternates` or `openGraph` replaces the parent's entire object rather than
 * the fields it names, so everything else in it is silently dropped. Nothing
 * errors, the page renders, and the loss is visible only in the emitted `<head>`.
 *
 * This repo has produced the same defect three times in two commits:
 *
 * 1. A root `alternates.canonical` of `/` was inherited by every route that did
 *    not override it, so Archive, Record and Settings each told a crawler they
 *    were duplicates of the home page.
 * 2. Adding `opengraph-image.tsx` gave every route a card *except* the four
 *    with their own `openGraph` block — those four replaced the object the
 *    image had been contributed to, and lost it.
 * 3. `twitter` would have gone the same way, being the same shape.
 *
 * Each was found by reading `.next/server/app/*.html` by hand. The rule is
 * mechanical, so it is checked mechanically now, on every route the tree
 * contains rather than a list someone has to remember to extend.
 *
 * The rendered counterpart is `e2e/metadata.spec.ts`, which asserts the tags
 * actually reach the document. This one asserts the rule that produces them,
 * and runs in a second.
 */
const routes = collectRoutes();

async function metadataOf(file: string): Promise<Metadata> {
  const module: { metadata?: Metadata } = await import(pathToFileURL(file).href);
  return module.metadata ?? {};
}

describe('every route declares its own canonical', () => {
  it.each(routes.map((r) => [r.pathname, r.file]))(
    '%s',
    async (pathname, file) => {
      const { alternates } = await metadataOf(file);

      /*
       * Equal to the route's own path, not merely present. Inheriting a
       * canonical is worse than having none — the defect was every page
       * claiming to be `/` — so "declared" is not the property that matters.
       */
      expect(alternates?.canonical).toBe(pathname);
    },
  );
});

describe('no route loses the share card by overriding around it', () => {
  it.each(routes.map((r) => [r.pathname, r.file]))(
    '%s',
    async (pathname, file) => {
      const { openGraph, twitter } = await metadataOf(file);

      /*
       * Declaring the object at all means owning everything in it. A route that
       * says nothing inherits the root's block, image included, and is fine —
       * which is why this is conditional rather than a blanket requirement.
       */
      if (openGraph !== undefined && openGraph !== null) {
        expect(
          'images' in openGraph && openGraph.images !== undefined,
          `${pathname} declares openGraph without images, so it replaces the ` +
            'root block and ships no card. Add OG_IMAGE from lib/og.',
        ).toBe(true);
      }

      /*
       * `twitter:image` falls back to `openGraph.images`, so a Twitter block is
       * only a problem when it names images itself and gets them wrong — but a
       * route with a Twitter block and no Open Graph block has nothing to fall
       * back to.
       */
      if (twitter !== undefined && twitter !== null && (openGraph === undefined || openGraph === null)) {
        expect(
          'images' in twitter && twitter.images !== undefined,
          `${pathname} declares twitter without openGraph, so there is nothing ` +
            'for twitter:image to fall back to.',
        ).toBe(true);
      }
    },
  );
});
