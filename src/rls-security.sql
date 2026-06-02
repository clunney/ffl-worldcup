-- ============================================================
-- WCC COMPLETE RLS SECURITY — Run in Supabase SQL Editor
-- Enforces: picks hidden until matches start, users only touch
-- their own data, managers limited to their pool, admin-only
-- for everything else. Safe to re-run (idempotent).
-- ============================================================

-- ── 0. Enable RLS on every table ──
alter table if exists public.pools           enable row level security;
alter table if exists public.pool_members    enable row level security;
alter table if exists public.brackets        enable row level security;
alter table if exists public.actual_results  enable row level security;
alter table if exists public.api_cache       enable row level security;

-- ── 1. Drop ALL existing policies cleanly ──
do $$ declare r record; begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      r.policyname, r.tablename
    );
  end loop;
end $$;

-- ── 2. Security-definer helpers (run as function owner, bypassing RLS) ──

-- Returns pool IDs the current user belongs to
create or replace function public.get_my_pool_ids()
returns setof uuid language sql security definer stable as $$
  select pool_id from pool_members where user_id = auth.uid();
$$;

-- Returns true only if the admin has enabled picks_visible
-- Used in brackets SELECT to hide picks at DB level until matches start
create or replace function public.are_picks_visible()
returns boolean language sql security definer stable as $$
  select coalesce(
    (select picks_visible from actual_results
     where id = '00000000-0000-0000-0000-000000000001' limit 1),
    false
  );
$$;

-- Returns true if current user manages the given pool
create or replace function public.i_manage_pool(p_pool_id uuid)
returns boolean language sql security definer stable as $$
  select exists(
    select 1 from pool_members
    where pool_id = p_pool_id
      and user_id = auth.uid()
      and role = 'manager'
  );
$$;

grant execute on function public.get_my_pool_ids()    to authenticated;
grant execute on function public.are_picks_visible()   to authenticated;
grant execute on function public.i_manage_pool(uuid)   to authenticated;

-- ── 3. SCHEMA GRANTS ──
-- Revoke everything from anon; only authenticated users get access
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
grant  usage on schema public to anon;          -- needed for PostgREST to respond (with 403)
grant  usage on schema public to authenticated;
grant  select, insert, update, delete
  on all tables in schema public to authenticated;

-- ── 4. POOLS ──

-- SELECT: only pools you're in (or admin)
create policy "pools_select" on pools
  for select using (
    id in (select get_my_pool_ids())
    or auth.email() = 'clunney22@gmail.com'
  );

-- INSERT: any signed-in user can create a pool (they become created_by)
create policy "pools_insert" on pools
  for insert with check (auth.uid() = created_by);

-- UPDATE: only the manager of that pool can touch settings; admin can touch anything
create policy "pools_update" on pools
  for update using (
    public.i_manage_pool(id)
    or auth.email() = 'clunney22@gmail.com'
  );

-- DELETE: pool manager or admin only
create policy "pools_delete" on pools
  for delete using (
    public.i_manage_pool(id)
    or auth.email() = 'clunney22@gmail.com'
  );

-- ── 5. POOL_MEMBERS ──

-- SELECT: see members of pools you're in; admin sees all
create policy "members_select" on pool_members
  for select using (
    pool_id in (select get_my_pool_ids())
    or auth.email() = 'clunney22@gmail.com'
  );

-- INSERT: can only add yourself (frontend join flow)
create policy "members_insert" on pool_members
  for insert with check (user_id = auth.uid());

-- UPDATE: only admin (e.g. changing roles)
create policy "members_update" on pool_members
  for update using (auth.email() = 'clunney22@gmail.com');

-- DELETE: remove yourself, or manager removes from their pool, or admin
create policy "members_delete" on pool_members
  for delete using (
    user_id = auth.uid()
    or public.i_manage_pool(pool_id)
    or auth.email() = 'clunney22@gmail.com'
  );

-- ── 6. BRACKETS ──

-- SELECT: always see your own bracket.
--   See OTHERS' brackets only when picks_visible=true (enforced at DB level).
--   Admin sees everything always.
create policy "brackets_select" on brackets
  for select using (
    auth.uid() = user_id
    or auth.email() = 'clunney22@gmail.com'
    or (
      pool_id in (select get_my_pool_ids())
      and public.are_picks_visible()
    )
  );

-- INSERT: can only create your own bracket
create policy "brackets_insert" on brackets
  for insert with check (auth.uid() = user_id);

-- UPDATE: can only edit your own bracket; managers can edit bracket_name in their pool;
--   admin can edit anything
create policy "brackets_update" on brackets
  for update using (
    auth.uid() = user_id
    or public.i_manage_pool(pool_id)
    or auth.email() = 'clunney22@gmail.com'
  );

-- DELETE: can delete your own bracket; manager/admin can delete any in their scope
create policy "brackets_delete" on brackets
  for delete using (
    auth.uid() = user_id
    or public.i_manage_pool(pool_id)
    or auth.email() = 'clunney22@gmail.com'
  );

-- ── 7. ACTUAL_RESULTS ──

-- SELECT: any signed-in user (needed for scoring, lock status, etc.)
--   Unauthenticated (anon) gets nothing.
create policy "results_read" on actual_results
  for select using (auth.uid() is not null);

-- INSERT/UPDATE/DELETE: ONLY admin
--   This is the key restriction: no user or manager can touch tournament flags,
--   results, or scoring config via any means other than the admin panel.
create policy "results_admin_write" on actual_results
  for all using (auth.email() = 'clunney22@gmail.com')
  with check (auth.email() = 'clunney22@gmail.com');

-- ── 8. API_CACHE ──

-- SELECT: any signed-in user can read cached match/odds data
create policy "cache_read" on api_cache
  for select using (auth.uid() is not null);

-- WRITE: only service role (cron) or admin
--   Service role bypasses RLS by design; this policy covers the admin UI case
create policy "cache_admin_write" on api_cache
  for all using (auth.email() = 'clunney22@gmail.com')
  with check (auth.email() = 'clunney22@gmail.com');

-- ── 9. CROSS_POOL_SCORES VIEW ──
-- Recreate with security_invoker so it inherits the caller's RLS context
-- (prevents using the view to bypass bracket visibility restrictions)
drop view if exists public.cross_pool_scores;
create view public.cross_pool_scores
  with (security_invoker = true)
  as
  select
    b.user_id, b.pool_id,
    b.group_picks, b.wildcard_picks,
    b.knockout_picks, b.champion_goal_diff_pick
  from brackets b
  join pools p on p.id = b.pool_id
  where p.scoring_config is null;

grant select on public.cross_pool_scores to authenticated;

-- ── 10. IMPORTANT: Supabase Dashboard access ──
-- RLS protects API access, but the Supabase dashboard uses the service role key
-- which bypasses RLS entirely. To prevent other people accessing the dashboard:
--   1. Go to: app.supabase.com → your project → Settings → Team
--   2. Make sure only clunney22@gmail.com has Owner/Admin access
--   3. Remove any other team members
-- The service role key (in Vercel env vars) should never be shared or committed to git.

-- ── 11. Verification query ──
select
  tablename,
  count(*) as policy_count,
  string_agg(policyname, ', ' order by policyname) as policies
from pg_policies
where schemaname = 'public'
group by tablename
order by tablename;

-- ── EXTRA: Completely block anonymous (unauthenticated) REST access ──
-- Anon key is still in the JS bundle for Supabase Auth (OAuth) but
-- all DATA endpoints return 403 because anon has no table grants.
revoke all privileges on all tables    in schema public from anon;
revoke all privileges on all sequences in schema public from anon;
revoke execute on all functions        in schema public from anon;
revoke execute on function public.get_my_pool_ids()   from anon;
revoke execute on function public.are_picks_visible() from anon;
revoke execute on function public.i_manage_pool(uuid) from anon;
-- Only authenticated users get data access
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.get_my_pool_ids()   to authenticated;
grant execute on function public.are_picks_visible() to authenticated;
grant execute on function public.i_manage_pool(uuid) to authenticated;
