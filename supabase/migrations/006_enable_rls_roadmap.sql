-- Migration 006: Enable RLS + owner-only policies on the roadmap tables.
--
-- Probing on 2026-06-01 indicated RLS already appears ENFORCED on these tables
-- (anon sees 0 rows; the authenticated owner sees their own rows; owner inserts
-- succeed), but no repo migration ever codified it — the policy lived only in
-- the live DB. This migration makes the intended state explicit and idempotent.
--
-- Safe to run whether or not RLS/policies already exist:
--   * ENABLE ROW LEVEL SECURITY is a no-op if already enabled.
--   * DROP POLICY IF EXISTS + CREATE guarantees a known-good owner policy and
--     avoids duplicate-name errors.
-- NOTE: this does NOT remove any pre-existing policy under a different name.
-- Confirm with `select * from pg_policies where tablename like 'roadmap_%'`
-- in the SQL editor that no over-permissive policy (e.g. USING (true)) remains.
--
-- All three tables have a user_id column; access is scoped to auth.uid() = user_id.

ALTER TABLE roadmap_projects   ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_tracks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "roadmap_projects_owner" ON roadmap_projects;
CREATE POLICY "roadmap_projects_owner" ON roadmap_projects
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "roadmap_tracks_owner" ON roadmap_tracks;
CREATE POLICY "roadmap_tracks_owner" ON roadmap_tracks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "roadmap_milestones_owner" ON roadmap_milestones;
CREATE POLICY "roadmap_milestones_owner" ON roadmap_milestones
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
