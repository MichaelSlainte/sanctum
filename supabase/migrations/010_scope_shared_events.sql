-- Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
-- Sanctum — Private and confidential. Unauthorised use prohibited.
-- https://sanctum.app

-- Migration 010: scope shared-event visibility to an explicit partner relationship.
--
-- Background (audit 2026-07-31): the events_shared_read policy was
--   USING (shared = true AND auth.uid() IS NOT NULL)
-- i.e. ANY authenticated user could read ANY other user's shared events (title,
-- date, location, notes) via GET /rest/v1/events?shared=eq.true — a global
-- cross-tenant grant with no relationship check. It was only LATENT during the
-- closed 2-user beta (the probe returned 0 rows belonging to other users because
-- the second account had no shared events), but it becomes a live cross-tenant
-- PII leak the moment public signup opens or any user shares an event.
--
-- Fix: replace the "any authenticated user" test with a mutual-partnership check
-- against a new `partners` table. A user sees another user's shared events only
-- when a partners row links the two (either direction). This is the data-driven
-- replacement for the hardcoded OWNER_IDS pairing and generalises as users pair up.
--
-- NOTE: no DB/service-role access exists in the local dev env, so this migration
-- must be run in the Supabase SQL editor (same manual-apply pattern as 004/005/009).
-- Idempotent and safe to re-run.

-- ── partners: who may see whose shared events ────────────────────────────────
CREATE TABLE IF NOT EXISTS partners (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a     uuid NOT NULL,
  user_b     uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_a, user_b)
);

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- A user may read only the partnership rows they belong to. This keeps the table
-- itself from leaking the social graph, and it is sufficient for the events
-- policy subquery below (the subquery runs as the caller and only needs to see
-- the row that links the caller to the event owner).
DROP POLICY IF EXISTS partners_self_read ON partners;
CREATE POLICY partners_self_read ON partners
  FOR SELECT
  USING (user_a = auth.uid() OR user_b = auth.uid());

-- Seed the current Michael <-> Tamara partnership (OWNER_IDS). The events policy
-- checks both directions, so one row grants visibility both ways.
INSERT INTO partners (user_a, user_b)
VALUES ('d86cb548-3254-46d4-9322-fc5a45043037', '8e2d598c-94b2-497c-a44a-a773e7d8ff6a')
ON CONFLICT (user_a, user_b) DO NOTHING;

-- ── events_shared_read: partner-scoped, not global ───────────────────────────
DROP POLICY IF EXISTS events_shared_read ON events;
CREATE POLICY events_shared_read ON events
  FOR SELECT
  USING (
    shared = true
    AND EXISTS (
      SELECT 1 FROM partners p
      WHERE (p.user_a = auth.uid() AND p.user_b = events.user_id)
         OR (p.user_b = auth.uid() AND p.user_a = events.user_id)
    )
  );

-- Verify after running (anon key is public; base = the project REST URL):
--   As Michael, GET /rest/v1/events?select=user_id&shared=eq.true should return
--   Michael's own shared rows PLUS Tamara's shared rows, and nothing from any
--   unrelated (future) account. A stranger with only shared=true set but no
--   partners row must see 0 of the other user's rows.
