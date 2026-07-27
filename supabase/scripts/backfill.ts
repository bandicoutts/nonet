/**
 * Backfill a range of editions.
 *
 * The archive publishes **forward** — the cron mints today's edition at 00:05
 * UTC and nothing exists ahead of time (NONET-28). Pre-generating buys nothing,
 * because every edition is derived from its date and can be rebuilt at any
 * moment, and it would put every future *answer* in a world-readable table
 * behind a single predicate.
 *
 * So this exists for the two cases that do arise: a day the cron missed, and a
 * fresh deployment that needs history. It calls the same edge function the cron
 * calls, so there is one code path that mints an edition and no second
 * implementation to drift.
 *
 *   deno run --allow-net --allow-env backfill.ts 2026-07-27 2026-08-10
 *
 * Idempotent, because `publish_daily()` is: a date that already exists returns
 * its existing id rather than erroring (NONET-16), so a re-run is free and an
 * interrupted run is resumed by running it again.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

const [from, to] = Deno.args;

if (from === undefined || to === undefined || !ISO_DATE.test(from) || !ISO_DATE.test(to)) {
  console.error('usage: backfill.ts <from YYYY-MM-DD> <to YYYY-MM-DD>');
  Deno.exit(1);
}

const url = Deno.env.get('SUPABASE_URL');
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (url === undefined || key === undefined) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  Deno.exit(1);
}

const start = Date.parse(`${from}T00:00:00Z`);
const end = Date.parse(`${to}T00:00:00Z`);

if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
  console.error('the range must be two real dates, earliest first');
  Deno.exit(1);
}

let published = 0;
let failed = 0;

for (let day = start; day <= end; day += DAY_MS) {
  const date = new Date(day).toISOString().slice(0, 10);

  const response = await fetch(`${url}/functions/v1/publish-daily?date=${date}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  });

  if (response.ok) {
    const body = await response.json();
    published += 1;
    console.log(`${date}  No. ${body.number}  ${body.difficulty}  ${body.givens} givens`);
  } else {
    // Reported and continued rather than thrown: one bad day should not stop a
    // range, and the run is safe to repeat for whatever is still missing.
    failed += 1;
    console.error(`${date}  failed — ${response.status} ${await response.text()}`);
  }
}

console.log(`\n${published} published, ${failed} failed`);
if (failed > 0) Deno.exit(1);
