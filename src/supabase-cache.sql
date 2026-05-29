-- ============================================================
-- WCC — API Cache table + auto-snapshot trigger
-- Run in Supabase SQL Editor
-- ============================================================

-- Cache table for API responses
create table if not exists api_cache (
  key         text primary key,
  data        jsonb not null,
  fetched_at  timestamptz not null default now(),
  ttl_seconds integer not null default 60
);

alter table api_cache enable row level security;

-- Anyone can read cache (needed for the serverless proxy)
create policy "Public read cache"
  on api_cache for select using (true);

-- Only service role writes cache (our serverless functions use anon key but
-- we'll use upsert via service role in the cron functions)
create policy "Service write cache"
  on api_cache for all
  using (auth.role() = 'service_role');

-- Also allow admin to write (for testing)
create policy "Admin write cache"
  on api_cache for all
  using ((select email from auth.users where id = auth.uid()) = 'clunney22@gmail.com');

-- ── Auto-snapshot trigger ──────────────────────────────────────
-- Fires whenever actual_results is updated (i.e. you save new match results)
-- Appends a standings snapshot automatically

create or replace function auto_snapshot_standings()
returns trigger as $$
declare
  snap jsonb;
  today_date text := to_char(now(), 'YYYY-MM-DD');
  existing_today boolean;
begin
  -- Only snapshot once per day to avoid bloat
  select exists(
    select 1
    from jsonb_array_elements(coalesce(new.standings_history, '[]'::jsonb)) as elem
    where elem->>'date' = today_date
  ) into existing_today;

  if existing_today then
    return new;
  end if;

  -- Build snapshot from brackets table
  select jsonb_build_object(
    'date', today_date,
    'rankings', (
      select jsonb_agg(
        jsonb_build_object(
          'user_id',      user_id,
          'bracket_name', bracket_name,
          'display_name', display_name,
          'rank',         row_number() over (order by updated_at desc)
        ) order by updated_at desc
      )
      from brackets
      where pool_id = '00000000-0000-0000-0000-000000000002'
    )
  ) into snap;

  new.standings_history := coalesce(new.standings_history, '[]'::jsonb) || snap;
  return new;
end;
$$ language plpgsql;

-- Drop old trigger if exists, recreate
drop trigger if exists snapshot_on_results_update on actual_results;
create trigger snapshot_on_results_update
  before update on actual_results
  for each row
  when (old.knockout_results is distinct from new.knockout_results
     or old.group_results   is distinct from new.group_results)
  execute function auto_snapshot_standings();
