-- Scheduling the daily.
--
-- The schedule lives in a migration rather than the dashboard so it is
-- reviewable, diffable and recreated by `db reset` — a cron job configured by
-- clicking is a piece of production behaviour with no version history.
--
-- The *secrets* it needs are not in version control. They differ per
-- environment and one of them is the service role key, so they come from Vault
-- at run time and the job simply does nothing until they are set. That makes
-- this migration safe to apply locally, where neither exists.

create extension if not exists pg_cron;
-- pg_net is preinstalled on Supabase in its own `net` schema. Naming a
-- different schema here does not move it, and the job would then reference a
-- function that does not exist — which fails at parse time, so the `where`
-- guard below would not save it. Found by running the job body by hand.
create extension if not exists pg_net;

/*
 * 00:05 UTC, every day.
 *
 * Five past rather than midnight because generation takes a moment and a
 * puzzle that appears at 00:00:03 for some players and 00:00:00 for others is
 * a worse promise than one that appears at 00:05 for everybody
 * (GAME-RULES.md).
 *
 * The job is safe to fire twice: `publish_daily` is one `on conflict`
 * statement, so a duplicate run returns the existing edition rather than
 * minting a second (NONET-16). It is also safe to fire late — the edition is
 * derived from the date, not from when the job ran.
 *
 * The `where exists` is what keeps this inert without secrets: locally there is
 * no Vault entry, so the statement selects no rows and no request is made.
 */
select cron.schedule(
  'publish-daily',
  '5 0 * * *',
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
             || '/functions/v1/publish-daily',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer '
          || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
      ),
      body := '{}'::jsonb
    )
    where exists (select 1 from vault.decrypted_secrets where name = 'service_role_key')
      and exists (select 1 from vault.decrypted_secrets where name = 'project_url');
  $job$
);

/*
 * Arming it, once per environment:
 *
 *   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
 *   select vault.create_secret('<service-role-key>', 'service_role_key');
 *
 * Backfilling a day the job missed — safe to run at any time, and a no-op if
 * the edition already exists:
 *
 *   curl -X POST "$URL/functions/v1/publish-daily?date=2026-08-03" \
 *     -H "Authorization: Bearer $SERVICE_ROLE_KEY"
 */
