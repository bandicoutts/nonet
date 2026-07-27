import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MergeSummary } from '@/components/MergeSummary';
import type { SyncResult } from '@/lib/sync';

function result(over: Partial<SyncResult> = {}): SyncResult {
  return {
    solves: { uploaded: 3, superseded: 0 },
    keptBoard: 'neither',
    discardedBecauseSolved: false,
    settingsFrom: 'account',
    streak: 18,
    totalSolves: 6,
    ...over,
  } as SyncResult;
}

afterEach(cleanup);

describe('MergeSummary', () => {
  /*
   * Found on screen during the first end-to-end sign-in: a one-day run read
   * "1 days". `copy.md` writes the row as "{18 or 41} days" because the
   * prototype only ever drew a long run — the same class of defect as the
   * unpluralised mistake count in the share text (NONET-20), and this row is
   * the first thing a new player sees after signing in, when their run is
   * exactly one day old.
   */
  it('pluralises the run', () => {
    render(<MergeSummary result={result({ streak: 1 })} onDismiss={vi.fn()} />);
    expect(screen.getByText('1 day')).toBeDefined();
  });

  it('keeps the plural for a longer run', () => {
    render(<MergeSummary result={result({ streak: 18 })} onDismiss={vi.fn()} />);
    expect(screen.getByText('18 days')).toBeDefined();
  });

  it('pluralises a broken run', () => {
    render(<MergeSummary result={result({ streak: 0 })} onDismiss={vi.fn()} />);
    expect(screen.getByText('0 days')).toBeDefined();
  });
});
