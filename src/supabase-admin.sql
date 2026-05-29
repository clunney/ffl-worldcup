-- ============================================================
-- FFL — Admin policies + schema updates
-- Run this in Supabase SQL Editor AFTER the original schema
-- ============================================================

-- Add scoring_config and picks_visible to actual_results
alter table actual_results
  add column if not exists scoring_config jsonb,
  add column if not exists picks_visible  boolean default false;

-- Allow admin (clunney22@gmail.com) to write actual_results
create policy "Admin write actual_results"
  on actual_results for all
  using (
    (select email from auth.users where id = auth.uid()) = 'clunney22@gmail.com'
  )
  with check (
    (select email from auth.users where id = auth.uid()) = 'clunney22@gmail.com'
  );

-- Allow admin to update ANY user's bracket (for manager mode)
create policy "Admin update any bracket"
  on brackets for update
  using (
    (select email from auth.users where id = auth.uid()) = 'clunney22@gmail.com'
  )
  with check (true);

-- Allow admin to read full bracket list including emails
-- (already covered by existing public read policy)
