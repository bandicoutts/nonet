import { beforeEach, describe, expect, it } from 'vitest';
import { cacheSize, clearPuzzleCache, puzzleFor } from '@/lib/puzzle-cache';

/**
 * The same puzzle was generated three times per solve — Home for the plate, the
 * board to play it, the result to count entries — at up to 74ms each on expert.
 *
 * Safe to memoise because a puzzle is a pure function of `(difficulty, seed)`,
 * which is NONET-16's argument: the same key cannot produce a different grid,
 * so there is nothing to invalidate.
 */
beforeEach(clearPuzzleCache);

describe('the puzzle cache', () => {
  it('returns the identical object for a repeated key', () => {
    const first = puzzleFor('easy', 1);
    const second = puzzleFor('easy', 1);

    // Identity, not equality: equality would pass even if it regenerated.
    expect(second).toBe(first);
  });

  it('still generates a different puzzle for a different key', () => {
    expect(puzzleFor('easy', 1)).not.toBe(puzzleFor('easy', 2));
    expect(puzzleFor('easy', 1)).not.toBe(puzzleFor('hard', 1));
  });

  it('agrees with the generator it is standing in for', async () => {
    const { generatePuzzle } = await import('@nonet/engine');
    expect(puzzleFor('medium', 7).givens).toEqual(generatePuzzle('medium', 7).givens);
  });

  /**
   * The cap is the point. Without it this holds every grid a player opens for
   * the life of the tab, and the archive makes that unbounded.
   */
  it('never grows past its limit', () => {
    for (let seed = 1; seed <= 12; seed += 1) puzzleFor('easy', seed);
    expect(cacheSize()).toBe(4);
  });

  it('evicts the least recently used, not the oldest inserted', () => {
    const kept = puzzleFor('easy', 1);
    puzzleFor('easy', 2);
    puzzleFor('easy', 3);
    puzzleFor('easy', 4);

    // Touch the oldest so it becomes the newest, then overflow by one.
    expect(puzzleFor('easy', 1)).toBe(kept);
    puzzleFor('easy', 5);

    // Seed 1 survives because it was used most recently; seed 2 is gone.
    expect(puzzleFor('easy', 1)).toBe(kept);
    expect(cacheSize()).toBe(4);
  });

  /**
   * The interleaving the LRU exists for: Home keeps asking for the daily while
   * a practice board is played, so FIFO would evict the entry still in use.
   */
  it('keeps the daily warm while another puzzle is played', () => {
    const daily = puzzleFor('medium', 100);
    puzzleFor('expert', 200);
    expect(puzzleFor('medium', 100)).toBe(daily);
    puzzleFor('hard', 300);
    puzzleFor('easy', 400);

    expect(puzzleFor('medium', 100)).toBe(daily);
  });
});
