import { generatePuzzle } from '@nonet/engine';
import type { Difficulty, GeneratedPuzzle } from '@nonet/engine';

/**
 * Generating a puzzle is expensive and the app does it three times for one.
 *
 * Home generates today's edition to state how many givens it has, the board
 * generates the same puzzle to play it, and the result generates it again to
 * count what the player entered. Measured on this machine: 3.5ms median at easy
 * and **28.6ms at expert, with a 74ms worst case** when the generator re-rolls.
 * Three of those per solve, on a mid-range phone, for a grid that is a pure
 * function of two numbers.
 *
 * So it is memoised on `(difficulty, seed)`. Nothing about a puzzle depends on
 * anything else — that is NONET-16's whole argument, and it is what makes this
 * safe rather than a cache with an invalidation problem: the same key can only
 * ever produce the same grid.
 *
 * **The alternative was worse.** Dropping the exact given count and displaying
 * the band's nominal figure would have removed the cost with no cache at all —
 * but the nominal is only right for three bands. Expert digs toward a *score*
 * (NONET-4) and stops where it can, so its given count floats between 24 and 27
 * and matches the nominal 24 about 40% of the time. Home's plate and the result
 * screen both state that count as a fact about the board in front of the
 * player, so it has to be the real one.
 */

/**
 * Four, because the access pattern is one puzzle at a time.
 *
 * Three entries covers Home, board and result for the same puzzle; the fourth
 * keeps today's daily warm while a practice board is played, which is the one
 * interleaving that actually happens. **A cap is the point**: uncapped, this
 * would hold every grid a player opened for the life of the tab, and the
 * archive makes that unbounded.
 */
const LIMIT = 4;

const cache = new Map<string, GeneratedPuzzle>();

/**
 * The puzzle for a ref, generated once per key.
 *
 * Least-recently-used rather than first-in-first-out: on a hit the entry is
 * reinserted so it becomes the newest. That matters for the one interleaving
 * above — under FIFO, playing a practice puzzle would evict the daily that Home
 * still wants, even though Home keeps asking for it.
 */
export function puzzleFor(difficulty: Difficulty, seed: number): GeneratedPuzzle {
  const key = `${difficulty}:${seed}`;

  const hit = cache.get(key);
  if (hit !== undefined) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }

  const puzzle = generatePuzzle(difficulty, seed);
  cache.set(key, puzzle);

  // Map iterates in insertion order, so the first key is the least recent.
  if (cache.size > LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }

  return puzzle;
}

/** Exported for the tests; no other module imports it. */
export function cacheSize(): number {
  return cache.size;
}

/** Exported for the tests; no other module imports it. */
export function clearPuzzleCache(): void {
  cache.clear();
}
