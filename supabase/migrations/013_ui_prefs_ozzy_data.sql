-- Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
-- Sanctum — Private and confidential. Unauthorised use prohibited.
-- https://sanctum.app
--
-- Migration 013: per-user UI prefs + Ozzy data that only lived in localStorage.
--
-- Why: logout / user switch now clear every per-user sanctum_* localStorage key
-- (docs/handoff.md §3, PR B). Two kinds of state lived ONLY there:
--   1. Layout / tracker UI state (nav order, archived v1 trackers, dashboard
--      rings, note order, ...). Browser-wide, so it leaked between accounts on a
--      shared browser (GHSA-p4h3-9mvv-q7pm). → profiles.ui_prefs (own row only).
--   2. Ozzy's weight log and custom document names. Real data with no server
--      copy, so clearing would delete it. → two tables, same access rule as
--      ozzy_docs: read = owner or the owner's partner, write = owner only.
-- The app merges any existing localStorage copy into these on the owner's next
-- load (union by client_id, nothing dropped) and only then removes it.
--
-- HOW TO APPLY: SQL Editor → New query → paste this whole file → Run.
-- ONE transaction: if anything fails, nothing changes. Safe to re-run.
-- Expected: "Success. No rows returned". Then run the CHECKS at the bottom.
-- Apply BEFORE the PR B app deploy (the app degrades safely without it: prefs
-- become session-only and the Ozzy localStorage data is kept, not migrated).

BEGIN;

-- ── 1. profiles.ui_prefs ────────────────────────────────────────────────
-- Read and written only by the row's owner through the existing profiles
-- policies (own row only; probed 2026-10-20 and 2026-10-21 from the non-owner
-- test account). Those policies were created in the dashboard; their names are
-- pinned in tests/security.spec.ts from CHECK 2 below.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ui_prefs jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ── 2. ozzy_weights ─────────────────────────────────────────────────────
-- client_id: the id the app gave the entry (the old localStorage entries have
-- one too), so re-running the merge from a second device is idempotent.
CREATE TABLE IF NOT EXISTS public.ozzy_weights (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id  text        NOT NULL,
  date       date        NOT NULL,
  kg         numeric     NOT NULL CHECK (kg > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_id)
);

-- ── 3. ozzy_custom_docs ─────────────────────────────────────────────────
-- Names of user-added document slots (the files themselves are ozzy_docs rows).
CREATE TABLE IF NOT EXISTS public.ozzy_custom_docs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id  text        NOT NULL,
  name       text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_id)
);

-- ── 4. Policies: exactly like ozzy_docs (migration 011) ──────────────────
ALTER TABLE public.ozzy_weights     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ozzy_custom_docs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ozzy_weights_read   ON public.ozzy_weights;
DROP POLICY IF EXISTS ozzy_weights_insert ON public.ozzy_weights;
DROP POLICY IF EXISTS ozzy_weights_update ON public.ozzy_weights;
DROP POLICY IF EXISTS ozzy_weights_delete ON public.ozzy_weights;
CREATE POLICY ozzy_weights_read ON public.ozzy_weights
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_partner_of(user_id::text));
CREATE POLICY ozzy_weights_insert ON public.ozzy_weights
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY ozzy_weights_update ON public.ozzy_weights
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY ozzy_weights_delete ON public.ozzy_weights
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS ozzy_custom_docs_read   ON public.ozzy_custom_docs;
DROP POLICY IF EXISTS ozzy_custom_docs_insert ON public.ozzy_custom_docs;
DROP POLICY IF EXISTS ozzy_custom_docs_update ON public.ozzy_custom_docs;
DROP POLICY IF EXISTS ozzy_custom_docs_delete ON public.ozzy_custom_docs;
CREATE POLICY ozzy_custom_docs_read ON public.ozzy_custom_docs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_partner_of(user_id::text));
CREATE POLICY ozzy_custom_docs_insert ON public.ozzy_custom_docs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY ozzy_custom_docs_update ON public.ozzy_custom_docs
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY ozzy_custom_docs_delete ON public.ozzy_custom_docs
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ── 5. Policy inventory (migration 012) now also covers these tables ─────
CREATE OR REPLACE FUNCTION public.security_policy_inventory()
RETURNS TABLE (schema_name text, table_name text, policy_name text, command text, roles text[])
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = pg_catalog
AS $$
  SELECT schemaname::text, tablename::text, policyname::text, cmd::text, roles::text[]
    FROM pg_catalog.pg_policies
   WHERE (schemaname = 'public'  AND tablename IN ('events', 'ozzy_docs', 'partners',
                                                   'profiles', 'ozzy_weights', 'ozzy_custom_docs'))
      OR (schemaname = 'storage' AND tablename = 'objects')
   ORDER BY 1, 2, 3;
$$;
-- CREATE OR REPLACE keeps the grants from 012; re-assert them anyway.
REVOKE ALL ON FUNCTION public.security_policy_inventory() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.security_policy_inventory() FROM anon;
REVOKE ALL ON FUNCTION public.security_policy_inventory() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.security_policy_inventory() TO service_role;

COMMIT;

-- ── CHECKS: run these after, in a new query ──────────────────────────────
--
-- 1) New tables: exactly 8 rows, all {authenticated}:
-- select tablename, policyname, cmd, roles from pg_policies
--  where schemaname = 'public' and tablename in ('ozzy_weights', 'ozzy_custom_docs')
--  order by 1, 2;
--
-- 2) profiles (dashboard-created): paste the result back so the names can be
--    pinned in tests/security.spec.ts. Every row must be own-row only
--    (qual / with_check comparing id or user_id to auth.uid()), no `true`.
-- select policyname, cmd, roles, qual, with_check from pg_policies
--  where schemaname = 'public' and tablename = 'profiles' order by 1;
--
-- 3) Column:
-- select column_name, data_type, column_default from information_schema.columns
--  where table_schema = 'public' and table_name = 'profiles' and column_name = 'ui_prefs';
--   → ui_prefs | jsonb | '{}'::jsonb
