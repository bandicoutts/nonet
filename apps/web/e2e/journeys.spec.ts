import { expect, test } from '@playwright/test';
import { SITE_URL } from '../src/lib/site';
import { answerFor, clearState, solveAllButOne, solveBoard } from './helpers';

test.beforeEach(async ({ page }) => {
  await clearState(page);
});

test.describe('the daily', () => {
  /*
   * The flagship journey, and the one that crosses the most boundaries jsdom
   * cannot: real navigation, real storage, and a solve recorded before the
   * screen that reads it back renders.
   */
  test('play it through to the result', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Enter the puzzle/ }).click();
    await expect(page).toHaveURL(/\/board/);

    await solveBoard(page);

    // The dwell is 1200ms, then the result replaces the board.
    await expect(page).toHaveURL(/\/solved\?/, { timeout: 15_000 });
    await expect(page.getByText('Solved in')).toBeVisible();
    await expect(page.getByText('Complete')).toBeVisible();

    // Three lines, no grid, no spoilers.
    const share = await page.locator('pre').innerText();
    expect(share.split('\n')).toHaveLength(3);
    // From `lib/site.ts`, not a literal: this asserted `nonet.app` — a domain
    // the project does not own — until NONET-30 changed the constant and left
    // the assertion behind.
    expect(share).toContain(SITE_URL);
  });

  /*
   * Back from a result must not deal the solved puzzle again, unsolved — the
   * reason the board navigates with `replace` rather than `push` (NONET-20).
   */
  test('going back from the result does not reopen the board', async ({ page }) => {
    await page.goto('/board');
    await solveBoard(page);
    await expect(page).toHaveURL(/\/solved\?/, { timeout: 15_000 });

    await page.goBack();
    await expect(page).not.toHaveURL(/\/board/);
  });

  /*
   * The defect from NONET-20: a board saved at 7:11 came back reading 0:05,
   * and the autosave then overwrote the real time with zero. It passed jsdom
   * because jsdom does not run StrictMode unless asked. Only a reload in a real
   * browser proves it.
   */
  test('a reload keeps the entries and the clock', async ({ page }) => {
    await page.goto('/board');

    const cell = page.locator('[data-cell]').filter({ hasText: '' }).first();
    await solveAllButOne(page);

    const before = await page.getByLabel(/Elapsed time/).innerText();
    await page.reload();

    const after = await page.getByLabel(/Elapsed time/).innerText();
    expect(toSeconds(after)).toBeGreaterThanOrEqual(toSeconds(before));

    // And the board itself came back, not a fresh one.
    const filled = await page.locator('[role="gridcell"]').evaluateAll(
      (cells) => cells.filter((c) => !/empty/.test(c.getAttribute('aria-label') ?? '')).length,
    );
    expect(filled).toBe(80);
    await expect(cell).toBeVisible();
  });
});

test.describe('practice', () => {
  test('pick a band and play it', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Medium/ }).click();

    await expect(page).toHaveURL(/kind=practice.*difficulty=medium/);
    await expect(page.locator('[role="gridcell"]')).toHaveCount(81);
  });

  /*
   * The one control in the product that destroys something. Practice boards are
   * not kept, so starting a second discards the first — verified here rather
   * than only in jsdom because the scrim, the focus trap and Escape are all
   * things jsdom reports as working when they are not (NONET-19).
   */
  test('starting another practice puzzle asks first', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Hard/ }).click();

    // Touch the board so it autosaves, then come back.
    await page.locator('[data-cell="0"]').click();
    await page.goto('/');

    await expect(page.getByText(/Unfinished practice puzzle/)).toBeVisible();
    await page.getByRole('button', { name: /Easy/ }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // The scrim covers the viewport — the NONET-19 check.
    const scrim = page.locator('div').filter({ has: dialog }).last();
    const box = await scrim.boundingBox();
    const viewport = page.viewportSize();
    expect(box?.width).toBe(viewport?.width);

    // Focus lands on the first action, and Escape is the second.
    await expect(page.getByRole('button', { name: /Discard and start/ })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL('/');
  });
});

test.describe('settings', () => {
  /*
   * Four settings were stored, synced and read by nothing (NONET-24). What
   * makes that closed is the board obeying them, which needs the settings to
   * survive a navigation — so it is checked across one.
   */
  test('turning the highlights off changes the board', async ({ page }) => {
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Matching' }).click();
    await page.getByRole('button', { name: 'Units' }).click();

    await page.goto('/board');
    await page.locator('[data-cell="0"]').click();

    await expect(page.locator('[data-unit]')).toHaveCount(0);
    await expect(page.locator('[data-matching]')).toHaveCount(0);
    // Selection is not a highlight and must survive.
    await expect(page.locator('[data-selected]')).toHaveCount(1);
  });

  test('hiding the timer does not stop it', async ({ page }) => {
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Timer' }).click();

    await page.goto('/board');
    await expect(page.getByLabel(/Elapsed time/)).toHaveCount(0);

    /*
     * The autosave writes on a board change, carrying whatever the clock says
     * at that moment — so time has to pass *between* two changes for the saved
     * value to prove the clock is still running.
     *
     * Two *different* cells. This clicked the same one twice until NONET-38,
     * when selecting an already-selected cell began returning the session
     * unchanged: the second click stopped being a change, so nothing was
     * written and the clock looked stopped when it was running.
     */
    const first = await firstEmptyCell(page);
    await page.locator(`[data-cell="${first}"]`).click();
    await page.waitForTimeout(3000);
    const second = await page.evaluate((skip) => {
      const cells = [...document.querySelectorAll('[data-cell]')];
      return cells.find((c) => !c.hasAttribute('data-given') && c.getAttribute('data-cell') !== String(skip))
        ?.getAttribute('data-cell');
    }, first);
    await page.locator(`[data-cell="${second}"]`).click();

    // The readout is gone; the recording is not.
    const elapsed = await page.evaluate(() => {
      const key = Object.keys(localStorage).find((k) => k.startsWith('nonet:autosave'));
      return key === undefined ? 0 : JSON.parse(localStorage.getItem(key) ?? '{}').elapsedMs;
    });
    expect(elapsed).toBeGreaterThan(0);
  });
});

test.describe('a locked board', () => {
  /*
   * Three mistakes lock it, the retry is offered once, and the failure is now
   * recorded with its date (NONET-27) — which is what makes a lost day
   * distinguishable from an unopened one on the archive.
   */
  test('records the failure and offers one retry', async ({ page }) => {
    await page.goto('/board');

    // An empty cell, not cell 0 — that one is a given in today's edition, and a
    // given cannot be got wrong (NONET-8).
    const cell = await firstEmptyCell(page);
    const answer = await answerFor(page, cell);
    const wrong = ['1', '2', '3', '4', '5'].filter((d) => d !== answer).slice(0, 3);

    for (const digit of wrong) {
      await page.locator(`[data-cell="${cell}"]`).click();
      await page.keyboard.press(digit);
    }

    await expect(page.getByText(/Three mistakes/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Start again/ })).toBeVisible();

    const failures = await page.evaluate(() =>
      Object.entries(localStorage)
        .filter(([k]) => k.startsWith('nonet:attempt:'))
        .map(([, v]) => JSON.parse(v)),
    );
    expect(failures).toHaveLength(1);
    expect(failures[0].localDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

test.describe('the mobile drawer', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) >= 768, 'below the drawer breakpoint only');

  test('opens, traps focus, and Escape returns it', async ({ page }) => {
    await page.goto('/');

    const trigger = page.getByRole('button', { name: /menu/i });
    await trigger.click();

    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();

    // It covers the frame — the bug that survived all of Phase 3 (NONET-19).
    const box = await drawer.boundingBox();
    expect(box?.width).toBe(page.viewportSize()?.width);

    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});

/** The first cell a player can actually type into. */
async function firstEmptyCell(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(() =>
    [...document.querySelectorAll('[role="gridcell"]')].findIndex((cell) =>
      /empty/.test(cell.getAttribute('aria-label') ?? ''),
    ),
  );
}

function toSeconds(display: string): number {
  const parts = display.replace(/[^\d:]/g, '').split(':').map(Number);
  return parts.reduce((total, part) => total * 60 + part, 0);
}
