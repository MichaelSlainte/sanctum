-- Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
-- Sanctum — Private and confidential. Unauthorised use prohibited.
-- https://sanctum.app

-- Migration 009: Lock down tracker_entries — close the anonymous read leak.
--
-- Background (audit 2026-06-08): tracker_entries had RLS ENABLED
-- (pg_class.relrowsecurity = true) yet UNAUTHENTICATED requests could read every
-- row — an anon GET returned `206` with 3 rows. The cause was a stray PERMISSIVE
-- policy left over from the migration-003 "disable RLS, filter in the app layer"
-- era. Postgres OR-combines permissive policies, so a single `USING (true)`-style
-- policy (or one granted to the anon/public role) makes RLS cosmetic. Michael
-- remediated this live in the Supabase dashboard; this migration codifies the
-- fix so the repository — not the dashboard — is the source of truth.
--
-- tracker_entries has NO usable owner column: user_id and tracker_id both come
-- back NULL on insert. Ownership is therefore derived by joining to the parent
-- custom_trackers row — access is granted only when the entry's custom_tracker_id
-- belongs to a tracker owned by the caller (auth.uid()). WITH CHECK applies the
-- same test to writes, so a user cannot insert/update entries onto someone
-- else's tracker.
--
-- Idempotent and safe to re-run:
--   * ENABLE ROW LEVEL SECURITY is a no-op if already enabled.
--   * The DO block drops ALL existing policies on the table by name — we do NOT
--     assume the stray policy's name, guaranteeing no permissive remnant survives.

ALTER TABLE tracker_entries ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tracker_entries'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.tracker_entries', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "tracker_entries_owner" ON tracker_entries
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM custom_trackers c
      WHERE c.id = tracker_entries.custom_tracker_id
        AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM custom_trackers c
      WHERE c.id = tracker_entries.custom_tracker_id
        AND c.user_id = auth.uid()
    )
  );

-- Verify after running (anon key is public; base = the project REST URL):
--   anon  : GET /rest/v1/tracker_entries?select=*&limit=0            -> 200 */0  (blocked)
--   owner : same + Authorization: Bearer <token>; insert+read+delete -> round-trips OK
