-- ============================================================
-- WCC — Full Schema v2 — Run in Supabase SQL Editor
-- ============================================================

-- ── Pools ─────────────────────────────────────────────────────
create table if not exists pools (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  code              text not null unique,
  password          text,
  max_members       int not null default 50,
  scoring_config    jsonb,
  invite_expires_at timestamptz default '2026-06-11T18:00:00Z',
  created_by        uuid references auth.users,
  created_at        timestamptz default now()
);

-- ── Pool members ──────────────────────────────────────────────
create table if not exists pool_members (
  pool_id   uuid references pools on delete cascade,
  user_id   uuid references auth.users on delete cascade,
  role      text not null default 'member',
  joined_at timestamptz default now(),
  primary key (pool_id, user_id)
);

-- ── Brackets ─────────────────────────────────────────────────
create table if not exists brackets (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid references auth.users not null,
  pool_id                 uuid references pools on delete cascade,
  display_name            text,
  bracket_name            text default 'My WCC Bracket',
  group_picks             jsonb,
  wildcard_picks          jsonb default '[]',
  knockout_picks          jsonb default '{}',
  champion_goal_diff_pick integer,
  locked                  boolean default false,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now(),
  unique (user_id, pool_id)
);

create or replace function update_updated_at()
returns trigger as $$ begin new.updated_at = now(); return new; end; $$ language plpgsql;

drop trigger if exists brackets_updated_at on brackets;
create trigger brackets_updated_at before update on brackets
  for each row execute procedure update_updated_at();

-- ── Actual results ────────────────────────────────────────────
create table if not exists actual_results (
  id                        uuid primary key,
  group_results             jsonb default '{}',
  wildcard_codes            jsonb default '[]',
  knockout_results          jsonb default '{}',
  tournament_locked         boolean default false,
  picks_visible             boolean default false,
  scoring_config            jsonb,
  actual_champion_goal_diff integer,
  standings_history         jsonb default '[]',
  updated_at                timestamptz default now()
);

insert into actual_results (id) values ('00000000-0000-0000-0000-000000000001')
  on conflict (id) do nothing;

-- ── API cache ─────────────────────────────────────────────────
create table if not exists api_cache (
  key         text primary key,
  data        jsonb not null,
  fetched_at  timestamptz not null default now(),
  ttl_seconds integer not null default 60
);

-- ── Default pool ──────────────────────────────────────────────
insert into pools (id, name, code, password, created_by)
values ('00000000-0000-0000-0000-000000000002','Fairmount Fantasy League','FFL2026',null,null)
on conflict (id) do nothing;

-- ── Constraints ───────────────────────────────────────────────
create or replace function check_pool_limit()
returns trigger as $$
begin
  if (select count(*) from pools where created_by = new.created_by) >= 3 then
    raise exception 'Maximum of 3 pools per user';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists enforce_pool_limit on pools;
create trigger enforce_pool_limit before insert on pools
  for each row when (new.created_by is not null)
  execute function check_pool_limit();

create or replace function check_pool_size()
returns trigger as $$
begin
  if (select count(*) from pool_members where pool_id = new.pool_id)
     >= (select max_members from pools where id = new.pool_id) then
    raise exception 'Pool is full';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists enforce_pool_size on pool_members;
create trigger enforce_pool_size before insert on pool_members
  for each row execute function check_pool_size();

-- ── RLS ───────────────────────────────────────────────────────
alter table pools          enable row level security;
alter table pool_members   enable row level security;
alter table brackets       enable row level security;
alter table actual_results enable row level security;
alter table api_cache      enable row level security;

-- Drop any old policies safely
do $$ declare r record; begin
  for r in select policyname,tablename from pg_policies
    where tablename in ('pools','pool_members','brackets','actual_results','api_cache')
  loop
    execute format('drop policy if exists %I on %I', r.policyname, r.tablename);
  end loop;
end $$;

-- Pools
create policy "pools_select" on pools for select
  using (id in (select pool_id from pool_members where user_id=auth.uid())
    or (select email from auth.users where id=auth.uid())='clunney22@gmail.com');

create policy "pools_insert" on pools for insert
  with check (auth.uid()=created_by);

create policy "pools_update" on pools for update
  using (id in (select pool_id from pool_members where user_id=auth.uid() and role='manager')
    or (select email from auth.users where id=auth.uid())='clunney22@gmail.com');

create policy "pools_delete" on pools for delete
  using ((select email from auth.users where id=auth.uid())='clunney22@gmail.com');

-- Pool members
create policy "members_select" on pool_members for select
  using (pool_id in (select pool_id from pool_members pm2 where pm2.user_id=auth.uid())
    or (select email from auth.users where id=auth.uid())='clunney22@gmail.com');

create policy "members_insert" on pool_members for insert
  with check (auth.uid()=user_id);

create policy "members_all_manager" on pool_members for all
  using (pool_id in (select pool_id from pool_members pm2 where pm2.user_id=auth.uid() and pm2.role='manager')
    or (select email from auth.users where id=auth.uid())='clunney22@gmail.com');

-- Brackets
create policy "brackets_own" on brackets for all
  using (auth.uid()=user_id) with check (auth.uid()=user_id);

create policy "brackets_pool_read" on brackets for select
  using (pool_id in (select pool_id from pool_members where user_id=auth.uid())
    or (select email from auth.users where id=auth.uid())='clunney22@gmail.com');

create policy "brackets_manager_update" on brackets for update
  using (pool_id in (select pool_id from pool_members where user_id=auth.uid() and role='manager')
    or (select email from auth.users where id=auth.uid())='clunney22@gmail.com');

-- Actual results
create policy "results_read" on actual_results for select using (auth.uid() is not null);
create policy "results_admin" on actual_results for all
  using ((select email from auth.users where id=auth.uid())='clunney22@gmail.com')
  with check ((select email from auth.users where id=auth.uid())='clunney22@gmail.com');

-- API cache
create policy "cache_read" on api_cache for select using (auth.uid() is not null);
create policy "cache_service" on api_cache for all using (auth.role()='service_role');
create policy "cache_admin" on api_cache for all
  using ((select email from auth.users where id=auth.uid())='clunney22@gmail.com');

-- ── Cross-pool percentile view ────────────────────────────────
drop view if exists cross_pool_scores;
create view cross_pool_scores as
  select b.user_id, b.pool_id, b.bracket_name, b.knockout_picks,
         b.group_picks, b.wildcard_picks, b.champion_goal_diff_pick
  from brackets b
  join pools p on p.id=b.pool_id
  where p.scoring_config is null;

grant select on cross_pool_scores to authenticated;

-- ── Auto-snapshot trigger (fixed) ────────────────────────────
create or replace function auto_snapshot_standings()
returns trigger as $$
declare
  snap jsonb;
  today_date text := to_char(now(),'YYYY-MM-DD');
  existing_today boolean;
  ranked_brackets jsonb;
begin
  select exists(
    select 1 from jsonb_array_elements(coalesce(new.standings_history,'[]'::jsonb)) as elem
    where elem->>'date'=today_date
  ) into existing_today;
  if existing_today then return new; end if;
  select jsonb_agg(r order by (r->>'rank')::int) into ranked_brackets
  from (
    select jsonb_build_object(
      'user_id',user_id,'bracket_name',bracket_name,
      'display_name',display_name,
      'rank',row_number() over (order by updated_at desc)
    ) as r
    from brackets
    where pool_id='00000000-0000-0000-0000-000000000002'
  ) sub;
  snap:=jsonb_build_object('date',today_date,'rankings',ranked_brackets);
  new.standings_history:=coalesce(new.standings_history,'[]'::jsonb)||snap;
  return new;
end;
$$ language plpgsql;

drop trigger if exists snapshot_on_results_update on actual_results;
create trigger snapshot_on_results_update
  before update on actual_results for each row
  when (old.knockout_results is distinct from new.knockout_results
     or old.group_results is distinct from new.group_results)
  execute function auto_snapshot_standings();
