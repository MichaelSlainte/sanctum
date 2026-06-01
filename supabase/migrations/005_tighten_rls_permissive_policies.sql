-- Migration 005: Remove overly permissive "Own data only" policies
-- These policies had qual: "true" (allow everyone), bypassing RLS.
-- Each table already has a correct _user policy with auth.uid() = user_id.
-- Also tightens events_shared_read to require authentication.

DROP POLICY IF EXISTS "Own data only" ON custom_trackers;
DROP POLICY IF EXISTS "Own data only" ON notebooks;
DROP POLICY IF EXISTS "Own data only" ON ozzy_profile;
DROP POLICY IF EXISTS "Own data only" ON vet_visits;

DROP POLICY IF EXISTS "events_shared_read" ON events;
CREATE POLICY "events_shared_read" ON events
  FOR SELECT USING (shared = true AND auth.uid() IS NOT NULL);
