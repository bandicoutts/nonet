import { describe, expect, it, vi } from 'vitest';
import { fetchPercentile } from '@/lib/percentile';
import type { PuzzleRef } from '@/lib/storage';

const DAILY: PuzzleRef = { kind: 'daily', difficulty: 'hard', seed: 4242 };

/**
 * The two calls the lookup makes, and nothing else.
 *
 * Hand-rolled rather than mocked from the real client, so the test states the
 * shape it depends on: resolve `(kind, difficulty, seed)` to an id, then ask
 * for the aggregate. A change to either breaks this loudly.
 */
function fakeClient(over: {
  row?: { id: string } | null;
  rowError?: unknown;
  value?: number | null;
  rpcError?: unknown;
}) {
  const rpc = vi.fn(async () => ({
    data: over.value ?? null,
    error: over.rpcError ?? null,
  }));

  const maybeSingle = vi.fn(async () => ({
    data: over.row === undefined ? { id: 'puzzle-1' } : over.row,
    error: over.rowError ?? null,
  }));

  const eq = vi.fn(() => builder);
  const builder = { eq, maybeSingle };

  const client = {
    from: vi.fn(() => ({ select: vi.fn(() => builder) })),
    rpc,
  };

  return { client, rpc, eq, maybeSingle };
}

describe('fetchPercentile', () => {
  it('resolves the puzzle by kind, difficulty and seed, then asks for the aggregate', async () => {
    const { client, rpc, eq } = fakeClient({ value: 22 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- a hand-rolled
    // double standing in for the Supabase client; the shape it must satisfy is
    // exactly the two calls asserted below.
    await expect(fetchPercentile(client as any, DAILY, 432_000)).resolves.toBe(22);

    expect(eq.mock.calls).toEqual([
      ['kind', 'daily'],
      ['difficulty', 'hard'],
      ['seed', 4242],
    ]);
    expect(rpc).toHaveBeenCalledWith('daily_percentile', {
      p_puzzle_id: 'puzzle-1',
      p_duration_ms: 432_000,
    });
  });

  /*
   * Every failure is the same answer: no percentile. This runs on a screen that
   * has already told the player they solved the puzzle, and the figure is the
   * one thing on it that needs a network. It must never be the reason the
   * screen does not render.
   */
  it('is null when there is no client at all', async () => {
    await expect(fetchPercentile(null, DAILY, 432_000)).resolves.toBeNull();
  });

  it('is null when the edition has no row on this deployment', async () => {
    const { client, rpc } = fakeClient({ row: null });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
    await expect(fetchPercentile(client as any, DAILY, 432_000)).resolves.toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('is null when the lookup errors', async () => {
    const { client } = fakeClient({ rowError: { message: 'offline' }, row: null });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
    await expect(fetchPercentile(client as any, DAILY, 432_000)).resolves.toBeNull();
  });

  it('is null when the aggregate errors', async () => {
    const { client } = fakeClient({ rpcError: { message: 'denied' } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
    await expect(fetchPercentile(client as any, DAILY, 432_000)).resolves.toBeNull();
  });

  /* Below 20 solves the function returns null by design — not an error. */
  it('is null when the edition is below the population floor', async () => {
    const { client } = fakeClient({ value: null });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
    await expect(fetchPercentile(client as any, DAILY, 432_000)).resolves.toBeNull();
  });

  it('is null when the call throws outright', async () => {
    const client = {
      from: () => {
        throw new Error('network');
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
    await expect(fetchPercentile(client as any, DAILY, 432_000)).resolves.toBeNull();
  });

  /*
   * Only a daily has a cohort. Asking for a practice puzzle's percentile would
   * be a resolvable query against a row that exists, returning a number ranking
   * the player against people who were dealt the same random grid — which is
   * not what the figure means.
   */
  it('does not ask at all for a puzzle that is not a daily', async () => {
    const { client } = fakeClient({ value: 22 });
    const practice: PuzzleRef = { kind: 'practice', difficulty: 'medium', seed: 3 };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
    await expect(fetchPercentile(client as any, practice, 432_000)).resolves.toBeNull();
    expect(client.from).not.toHaveBeenCalled();
  });
});
