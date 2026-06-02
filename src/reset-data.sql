-- ============================================================
-- WCC DATA RESET — Run in Supabase SQL Editor
-- Deletes ALL user data except the admin account and actual_results row.
-- Run this BEFORE sharing the site to start fresh.
-- ============================================================

-- 1. Delete all brackets
delete from public.brackets;

-- 2. Delete all pool memberships
delete from public.pool_members;

-- 3. Delete all pools
delete from public.pools;

-- 4. Reset actual_results to pre-tournament defaults
update public.actual_results
set
  tournament_locked    = false,
  picks_visible        = false,
  group_results        = '{}'::jsonb,
  wildcard_codes       = '[]'::jsonb,
  knockout_results     = '{}'::jsonb,
  actual_champion_goal_diff = null,
  scoring_config       = null,
  standings_history    = '[]'::jsonb
where id = '00000000-0000-0000-0000-000000000001';

-- 5. Clear API cache (optional - will repopulate on next cron run)
delete from public.api_cache;

-- 6. Delete all user accounts EXCEPT the admin
-- First delete from auth.users (cascades to supabase auth metadata)
-- WARNING: This logs out everyone including yourself - re-login after running
delete from auth.users
where email != 'clunney22@gmail.com';

-- 7. Verify what remains
select 'auth.users remaining:' as table_name, count(*)::text as count from auth.users
union all
select 'pools',       count(*)::text from public.pools
union all
select 'brackets',    count(*)::text from public.brackets
union all
select 'pool_members',count(*)::text from public.pool_members;
