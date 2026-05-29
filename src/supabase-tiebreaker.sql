-- ============================================================
-- WCC — Tiebreaker + standings history schema update
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add tiebreaker column to brackets
alter table brackets
  add column if not exists champion_goal_diff_pick integer;

-- Add actual goal diff + standings history to actual_results
alter table actual_results
  add column if not exists actual_champion_goal_diff integer,
  add column if not exists standings_history         jsonb default '[]';

-- Index for faster bracket queries
create index if not exists brackets_pool_id_idx on brackets(pool_id);
create index if not exists brackets_user_pool_idx on brackets(user_id, pool_id);

-- Function to snapshot standings (call this after updating results each match day)
-- Usage: select snapshot_standings();
create or replace function snapshot_standings()
returns void as $$
declare
  snap jsonb;
begin
  select jsonb_build_object(
    'date', now()::date,
    'rankings', (
      select jsonb_agg(
        jsonb_build_object(
          'user_id', user_id,
          'bracket_name', bracket_name,
          'rank', row_number() over (order by updated_at desc)
        )
      )
      from brackets
    )
  ) into snap;

  update actual_results
  set standings_history = coalesce(standings_history, '[]'::jsonb) || snap
  where id = '00000000-0000-0000-0000-000000000001';
end;
$$ language plpgsql;
