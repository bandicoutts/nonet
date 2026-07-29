import { describe, expect, it } from 'vitest';
import { backTo, dailyRef } from '@/lib/puzzles';
import type { PuzzleRef } from '@/lib/storage';

/**
 * The back control is labelled for where the player came from (NONET-2), and it
 * had been hardcoded to `← Today` → `/` on both screens since it was built — so
 * a player who opened an archive edition was sent to today's board and told
 * that was going back.
 *
 * Origin is derived from the ref rather than recorded, because an archive
 * edition is only reachable from `/archive`. These are the cases that makes
 * true, including the one a `?from=` parameter or a referrer would get wrong:
 * a board opened from a pasted URL still knows what it is.
 */
const AT = new Date('2026-07-29T12:00:00Z');
const today = dailyRef(AT);

const archived: PuzzleRef = { kind: 'daily', difficulty: 'hard', seed: today.seed - 1 };
const practice: PuzzleRef = { kind: 'practice', difficulty: 'expert', seed: 42 };

describe('the back control', () => {
  it("sends today's edition to Today", () => {
    expect(backTo(today, AT)).toEqual({ label: 'Today', href: '/' });
  });

  it('sends an older edition to Archive', () => {
    expect(backTo(archived, AT)).toEqual({ label: 'Archive', href: '/archive' });
  });

  it('sends practice to Today, which is where practice starts', () => {
    expect(backTo(practice, AT)).toEqual({ label: 'Today', href: '/' });
  });

  /**
   * The edition turns over at 00:05 UTC, so yesterday's daily becomes an
   * archive edition without anything being written down. The control follows,
   * because it reads the same clock the rest of the daily does.
   */
  it('follows the edition over the publish boundary', () => {
    const yesterday = dailyRef(new Date('2026-07-28T12:00:00Z'));
    expect(backTo(yesterday, new Date('2026-07-28T12:00:00Z')).label).toBe('Today');
    expect(backTo(yesterday, AT).label).toBe('Archive');
  });
});
