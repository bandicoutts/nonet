import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests.
 *
 * These exist because of what the unit suite kept missing. Every serious defect
 * in Phase 3 and Phase 4 passed jsdom and was obvious in a browser: a selection
 * ring absent on 32 of 81 cells, the design fonts never loading, every fixed
 * overlay failing to cover the screen, a resumed board's timer silently reset to
 * zero, and a result screen telling a player their solve was not ranked when it
 * was. Each was found by looking. This is the part of looking that can be
 * automated.
 *
 * So the journeys here are deliberately the ones that cross a boundary jsdom
 * cannot: real navigation, real focus, real layout, real storage across reloads.
 * Anything provable in a unit test stays in the unit tests, which are far
 * faster.
 */
export default defineConfig({
  testDir: './e2e',
  // A solve journey fills 40-odd cells through the real UI.
  timeout: 60_000,
  expect: { timeout: 10_000 },

  // A flaky suite is worse than none: it trains everyone to re-run it. Failures
  // here should mean something, so retries are off locally and the run is
  // serial — the tests share one browser profile's localStorage.
  retries: 0,
  workers: 1,
  reporter: [['list']],

  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    /*
     * 375 is below the drawer breakpoint of 768, which is where the layout
     * genuinely changes rather than merely narrows: the nav collapses, the
     * board gains a sticky band, and the archive calendar stops being
     * interactive (NONET-17).
     */
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],

  /*
   * Its own port and a production build.
   *
   * A separate port so a dev server already running on 3000 is not disturbed,
   * and `build` rather than `dev` because Turbopack's dev output is not what
   * ships — and NONET-11's font bug was exactly the kind of thing that differs
   * between the two.
   */
  webServer: {
    command: 'pnpm build && pnpm start --port 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000,
  },
});
