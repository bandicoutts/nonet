import { expect, test } from '@playwright/test';
import { collectRoutes } from '../test/route-tree';

/**
 * The tags that actually reach the document.
 *
 * `test/metadata-inheritance.test.ts` asserts the *rule* — declare an object,
 * own everything in it — and runs in a second. This asserts the consequence,
 * against a production build, because the rule is only a model of what Next's
 * shallow merge does and a version bump could change it without the unit test
 * noticing.
 *
 * Both tags must also be **absolute**. Next 16 does not warn when
 * `metadataBase` is missing and does not fall back to localhost: it emits the
 * relative value verbatim, so `og:url` ships as `content="/"` — a tag every
 * scraper is entitled to drop, and one that looks fine in the markup.
 */
const routes = collectRoutes().map((r) => r.pathname);

test.describe('metadata on every route', () => {
  for (const pathname of routes) {
    test(`${pathname} carries an absolute canonical and share card`, async ({ page }) => {
      await page.goto(pathname);

      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      const image = await page.locator('meta[property="og:image"]').first().getAttribute('content');

      expect(canonical, `${pathname} has no canonical`).toBeTruthy();
      expect(image, `${pathname} has no og:image`).toBeTruthy();

      expect(canonical, `${pathname} canonical is relative`).toMatch(/^https?:\/\//);
      expect(image, `${pathname} og:image is relative`).toMatch(/^https?:\/\//);

      /*
       * The canonical names the page you are on, not the home page. An
       * inherited canonical is the defect: it renders, it is absolute, and it
       * quietly tells a crawler that every page is a duplicate of `/`.
       *
       * Compared against where the browser *landed* rather than what was
       * requested, because `/solved` redirects to Home for anyone without a
       * solve in storage — which is every visitor here, and correct
       * (OPEN-QUESTIONS: "/solved with no recorded solve returns to Home").
       * Asserting the requested path would fail on that route for a reason
       * that has nothing to do with metadata.
       */
      const landed = new URL(page.url()).pathname.replace(/\/$/, '');
      expect(new URL(canonical ?? '').pathname.replace(/\/$/, '')).toBe(landed);
    });
  }

  /** The card itself, once — it is the same image for every route. */
  test('the share card is a real PNG at the advertised size', async ({ request, page }) => {
    await page.goto('/');
    const image = await page.locator('meta[property="og:image"]').first().getAttribute('content');

    const response = await request.get(image ?? '');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/png');

    const width = await page.locator('meta[property="og:image:width"]').first().getAttribute('content');
    const height = await page.locator('meta[property="og:image:height"]').first().getAttribute('content');
    expect([width, height]).toEqual(['1200', '630']);
  });
});
