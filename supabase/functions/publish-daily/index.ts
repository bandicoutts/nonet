/**
 * Publishes the daily edition.
 *
 * Scheduled for 00:05 UTC. Everything about the puzzle is derived from the
 * date — seed, difficulty, number — so this job holds no state and can be run
 * again, late, or twice, and produce the same edition (NONET-9).
 *
 * Idempotency is not implemented here. It belongs to `publish_daily` in SQL,
 * where one `on conflict` statement covers a cron that fires twice, a retry
 * after a timeout and a manual backfill alike. This function generates and
 * hands over; the database decides whether that is a new edition.
 */
import {
  dailyDifficulty,
  dailySeed,
  formatGrid,
  generatePuzzle,
  puzzleNumber,
} from '../../../packages/engine/src/index.ts';

/** Today in UTC. The edition's date is a property of the edition, not the caller. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

Deno.serve(async (request) => {
  const url = new URL(request.url);

  // A date may be given so a missed day can be backfilled. It is validated
  // rather than trusted: this runs as the service role, and the shape of the
  // string ends up in a query.
  const date = url.searchParams.get('date') ?? today();
  if (!ISO_DATE.test(date)) {
    return Response.json({ error: 'date must be an ISO date like 2026-07-27' }, { status: 400 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (supabaseUrl === undefined || serviceKey === undefined) {
    return Response.json({ error: 'missing Supabase environment' }, { status: 500 });
  }

  const difficulty = dailyDifficulty(date);
  const puzzle = generatePuzzle(difficulty, dailySeed(date));

  // Called over PostgREST rather than through a client library: the engine has
  // no dependencies and this needs one call, so adding a package to make it
  // would be the larger cost.
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/publish_daily`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      p_publish_date: date,
      p_difficulty: difficulty,
      // Zeros, not dots: the column is constrained to digits.
      p_givens: formatGrid(puzzle.givens, '0'),
      p_solution: formatGrid(puzzle.solution, '0'),
      p_score: puzzle.score,
      p_seed: puzzle.seed,
    }),
  });

  if (!response.ok) {
    return Response.json(
      { error: 'publish failed', detail: await response.text() },
      { status: 502 },
    );
  }

  return Response.json({
    date,
    number: puzzleNumber(date),
    difficulty,
    givens: puzzle.givenCount,
    score: puzzle.score,
    id: await response.json(),
  });
});
