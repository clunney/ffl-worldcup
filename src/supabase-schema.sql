-- ============================================================
-- FFL World Cup Challenge — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Brackets table (one per user)
create table if not exists brackets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users not null unique,
  display_name  text,
  bracket_name  text default 'My FFL Bracket',
  group_picks   jsonb,
  wildcard_picks jsonb default '[]',
  knockout_picks jsonb default '{}',
  locked        boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Auto-update updated_at on any row change
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger brackets_updated_at
  before update on brackets
  for each row execute procedure update_updated_at();

-- Row-level security
alter table brackets enable row level security;

-- Users can read and write ONLY their own bracket
create policy "Users manage own bracket"
  on brackets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- EVERYONE can read ALL brackets (for leaderboard / stats)
create policy "Public read all brackets"
  on brackets for select
  using (true);

-- ============================================================
-- Actual Results table (admin-updated after each match)
-- ============================================================
create table if not exists actual_results (
  id              uuid primary key default gen_random_uuid(),
  group_results   jsonb default '{}',
  wildcard_codes  jsonb default '[]',
  knockout_results jsonb default '{}',
  tournament_locked boolean default false,
  updated_at      timestamptz default now()
);

-- Seed with one empty row so we always have something to upsert into
insert into actual_results (id) values ('00000000-0000-0000-0000-000000000001')
  on conflict (id) do nothing;

-- Only authenticated users can read results
alter table actual_results enable row level security;

create policy "Public read results"
  on actual_results for select
  using (true);

-- Only the service role (admin) can write results
-- You'll update these via the Supabase dashboard or a separate admin script
create policy "Admin write results"
  on actual_results for all
  using (auth.role() = 'service_role');
