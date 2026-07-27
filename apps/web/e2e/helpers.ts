import type { Page } from '@playwright/test';

/**
 * Clear everything this product stores.
 *
 * Called before each test rather than after, so a failed run leaves its state
 * behind to be looked at.
 */
export async function clearState(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('nonet:')) localStorage.removeItem(key);
    }
  });
}

/** Read the board out of the accessibility tree, which is the player's view of it. */
async function readGrid(page: Page): Promise<number[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('[role="gridcell"]')].map((cell) => {
      const match = /column \d+, (\d)/.exec(cell.getAttribute('aria-label') ?? '');
      return match === null ? 0 : Number(match[1]);
    }),
  );
}

/** Solve the grid in the page, by ordinary backtracking. */
async function solutionFor(page: Page): Promise<number[]> {
  const grid = await readGrid(page);

  return page.evaluate((given: number[]) => {
    const legal = (g: number[], i: number, d: number): boolean => {
      const row = Math.floor(i / 9) * 9;
      const col = i % 9;
      const box = Math.floor(i / 27) * 27 + Math.floor((i % 9) / 3) * 3;

      for (let k = 0; k < 9; k += 1) {
        if (g[row + k] === d) return false;
        if (g[col + k * 9] === d) return false;
        if (g[box + Math.floor(k / 3) * 9 + (k % 3)] === d) return false;
      }
      return true;
    };

    const solve = (g: number[]): boolean => {
      const i = g.indexOf(0);
      if (i < 0) return true;
      for (let d = 1; d <= 9; d += 1) {
        if (legal(g, i, d)) {
          g[i] = d;
          if (solve(g)) return true;
          g[i] = 0;
        }
      }
      return false;
    };

    const out = [...given];
    solve(out);
    return out;
  }, grid);
}

/**
 * Play the board to completion, correctly, through real input.
 *
 * Click the cell, press the digit — which is what a player does, and which is
 * the point: a synthetic `KeyboardEvent` does not reach React's handler here,
 * so anything driving the board any other way would be testing a path nobody
 * uses.
 */
export async function solveBoard(page: Page): Promise<void> {
  const grid = await readGrid(page);
  const solution = await solutionFor(page);

  for (let index = 0; index < 81; index += 1) {
    if (grid[index] !== 0) continue;

    await page.locator(`[data-cell="${index}"]`).click();
    await page.keyboard.press(String(solution[index]));
  }
}

/** Fill every cell but one, so the finish can be reached in a single move. */
export async function solveAllButOne(page: Page): Promise<number> {
  const grid = await readGrid(page);
  const solution = await solutionFor(page);

  const empties = grid.flatMap((value, index) => (value === 0 ? [index] : []));
  const last = empties.at(-1) ?? 0;

  for (const index of empties.slice(0, -1)) {
    await page.locator(`[data-cell="${index}"]`).click();
    await page.keyboard.press(String(solution[index]));
  }

  return last;
}

/** The digit belonging in a cell, for finishing a board deliberately. */
export async function answerFor(page: Page, cell: number): Promise<string> {
  const solution = await solutionFor(page);
  return String(solution[cell]);
}
