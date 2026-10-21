-- Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
-- Sanctum — Private and confidential. Unauthorised use prohibited.
-- https://sanctum.app
--
-- Migration 012: policy inventory for the CI security check. SERVICE ROLE ONLY.
--
-- Why: the 2026-10-20 incident was an extra permissive policy sitting next to
-- the right one. tests/security.spec.ts calls this to assert the EXACT policy
-- set per table and fail on any extra or missing policy. pg_policies isn't
-- reachable over REST, hence this function.
--
-- Access: policy names, commands and roles are security configuration, so app
-- users must not read them. EXECUTE is revoked from PUBLIC, anon and
-- authenticated and granted only to service_role. CI calls it with the
-- service-role key, which lives ONLY in the GitHub secret
-- SUPABASE_SERVICE_ROLE_KEY (and Vercel's server-side env), never in the
-- client bundle or any committed file.
--
-- SECURITY INVOKER (not DEFINER): it runs with the caller's own rights, so it
-- can never give anyone more access than they already have. service_role can
-- already read pg_policies.
--
-- Returns names / command / roles only, never the policy expressions.
--
-- HOW TO APPLY: SQL Editor → New query → paste this file → Run.
-- Expected: "Success. No rows returned". Safe to re-run. Checks at the bottom.

BEGIN;

CREATE OR REPLACE FUNCTION public.security_policy_inventory()
RETURNS TABLE (schema_name text, table_name text, policy_name text, command text, roles text[])
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = pg_catalog
AS $$
  SELECT schemaname::text, tablename::text, policyname::text, cmd::text, roles::text[]
    FROM pg_catalog.pg_policies
   WHERE (schemaname = 'public'  AND tablename IN ('events', 'ozzy_docs', 'partners'))
      OR (schemaname = 'storage' AND tablename = 'objects')
   ORDER BY 1, 2, 3;
$$;

-- Supabase grants EXECUTE on new public functions to anon and authenticated
-- by default. Remove that, then allow service_role only.
REVOKE ALL ON FUNCTION public.security_policy_inventory() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.security_policy_inventory() FROM anon;
REVOKE ALL ON FUNCTION public.security_policy_inventory() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.security_policy_inventory() TO service_role;

COMMIT;

-- ── CHECKS: run after, in a new query ────────────────────────────────────
--
-- 1) Who can execute it: expect exactly ONE row, grantee = service_role
--    (the function owner, postgres, may also appear; it is not an app role).
-- select grantee, privilege_type from information_schema.routine_privileges
--  where routine_schema = 'public' and routine_name = 'security_policy_inventory'
--  order by grantee;
--   → postgres     EXECUTE   (owner)
--     service_role EXECUTE
--   (no anon, no authenticated, no PUBLIC)
--
-- 2) It's INVOKER: expect prosecdef = false.
-- select proname, prosecdef from pg_proc where proname = 'security_policy_inventory';
--   → security_policy_inventory | false
--
-- 3) Output (runs as postgres in the editor): expect 11 rows. The 10 from
--    migration 011's checks + partners_self_read (partners, SELECT).
-- select * from public.security_policy_inventory();
