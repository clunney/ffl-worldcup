-- ============================================================
-- FFL/WCC — Pools schema + admin policies
-- Run this in Supabase SQL Editor
-- ============================================================

-- Pools table
create table if not exists pools (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  code        text unique,
  is_private  boolean default false,
  created_by  uuid references auth.users,
  created_at  timestamptz default now()
);

alter table pools enable row level security;

create policy "Anyone can read pools"   on pools for select using (true);
create policy "Admin creates pools"     on pools for insert
  with check ((select email from auth.users where id = auth.uid()) = 'clunney22@gmail.com');
create policy "Admin updates pools"     on pools for update
  using ((select email from auth.users where id = auth.uid()) = 'clunney22@gmail.com');

-- Pool members
create table if not exists pool_members (
  pool_id    uuid references pools on delete cascade,
  user_id    uuid references auth.users on delete cascade,
  joined_at  timestamptz default now(),
  primary key (pool_id, user_id)
);

alter table pool_members enable row level security;

create policy "Anyone can read members"  on pool_members for select using (true);
create policy "Users join pools"         on pool_members for insert with check (auth.uid() = user_id);
create policy "Admin manages members"    on pool_members for all
  using ((select email from auth.users where id = auth.uid()) = 'clunney22@gmail.com');

-- Add pool_id to brackets (one bracket per user per pool)
alter table brackets add column if not exists pool_id uuid references pools;
alter table brackets drop constraint if exists brackets_user_id_key;
alter table brackets add constraint brackets_user_pool_unique unique (user_id, pool_id);

-- Seed default FFL pool
insert into pools (id, name, code, is_private)
values ('00000000-0000-0000-0000-000000000002', 'Fairmount Fantasy League', 'FFL2026', false)
on conflict (id) do nothing;

-- Add scoring_config, picks_visible, tournament_locked to actual_results if not present
alter table actual_results
  add column if not exists scoring_config  jsonb,
  add column if not exists picks_visible   boolean default false,
  add column if not exists tournament_locked boolean default false;

-- Admin write policy for actual_results
drop policy if exists "Admin write actual_results" on actual_results;
create policy "Admin write actual_results"
  on actual_results for all
  using ((select email from auth.users where id = auth.uid()) = 'clunney22@gmail.com')
  with check ((select email from auth.users where id = auth.uid()) = 'clunney22@gmail.com');

-- Admin update any bracket
drop policy if exists "Admin update any bracket" on brackets;
create policy "Admin update any bracket"
  on brackets for update
  using ((select email from auth.users where id = auth.uid()) = 'clunney22@gmail.com');
