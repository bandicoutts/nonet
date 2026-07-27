/**
 * The one figure on the Solved screen that cannot be derived locally.
 *
 * A percentile ranks a player against everyone who played the same edition, so
 * it needs the database — and it is the only thing on that screen that does.
 * Everything else comes from `result.ts` and works with Supabase down, which is
 * what guest-first requires: a player who has just finished a puzzle must see
 * their result whatever the network is doing.
 *
 * So **every failure here is the same answer**: no percentile. An unpublished
 * edition, an unconfigured client, a denied call, a population below the floor
 * — all of them mean the screen renders the Ranked/No variant that `copy.md`
 * already specifies for an unranked solve. None of them is allowed to be the
 * reason a result does not appear.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PuzzleRef } from './storage';

/**
 * Where this solve places, or `null` if there is no honest answer.
 *
 * `daily_percentile` is `security definer` and granted to `anon`, so a guest
 * gets a figure too — it returns a single integer and never a row, which is the
 * whole reason the aggregate can be exposed when the underlying solves cannot
 * (NONET-13). It returns `null` below 20 counted solves by design, and that is
 * indistinguishable here from any other reason to have none, deliberately.
 */
export async function fetchPercentile(
  supabase: SupabaseClient | null,
  ref: PuzzleRef,
  durationMs: number,
): Promise<number | null> {
  // Only a daily has a cohort. A practice puzzle is dealt at random, so ranking
  // against whoever else drew that seed is not what the figure means.
  if (supabase === null || ref.kind !== 'daily') return null;

  try {
    const { data: puzzle, error } = await supabase
      .from('puzzles')
      .select('id')
      .eq('kind', ref.kind)
      .eq('difficulty', ref.difficulty)
      .eq('seed', ref.seed)
      .maybeSingle();

    // The edition may simply not exist on this deployment — the daily is
    // generated in the browser and the row is only minted by the publish job
    // (NONET-16), so a missing row is ordinary rather than exceptional.
    if (error !== null || puzzle === null) return null;

    const { data, error: rpcError } = await supabase.rpc('daily_percentile', {
      p_puzzle_id: (puzzle as { id: string }).id,
      p_duration_ms: durationMs,
    });

    if (rpcError !== null) return null;
    return typeof data === 'number' ? data : null;
  } catch {
    return null;
  }
}
