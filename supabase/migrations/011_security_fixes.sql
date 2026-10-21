-- Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
-- Sanctum — Private and confidential. Unauthorised use prohibited.
-- https://sanctum.app
--
-- Migration 011: 2026-10-20 security fixes (events, ozzy_docs, pets storage).
-- Incident: docs/security/2026-10-20-rls-storage-incident.md
--
-- HOW TO APPLY: Supabase Dashboard → SQL Editor → New query → paste this whole
-- file → Run. It runs as ONE transaction: if anything fails, nothing changes;
-- paste the error back. Safe to re-run. Then run the checks at the bottom.
-- Expected result of the run: "Success. No rows returned".
--
-- Part of this was already applied live on 2026-10-20 ~19:50 UTC (dropping
-- "Shared events readable", bucket private, owner-UUID policies). This file
-- records that and replaces the owner-UUID policies with owner-or-partner ones.

BEGIN;

-- ── Step a) pre-check: ozzy_docs.user_id must be uuid ────────────────────
-- Aborts the whole migration (nothing applied) if user_id exists with another
-- type. A missing column is fine; it's created below.
DO $$
DECLARE t text;
BEGIN
  SELECT data_type INTO t FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'ozzy_docs' AND column_name = 'user_id';
  IF t IS NOT NULL AND t <> 'uuid' THEN
    RAISE EXCEPTION 'ozzy_docs.user_id is %, expected uuid. Nothing was applied.', t;
  END IF;
END $$;

-- ── 1. events ────────────────────────────────────────────────────────────
-- "Shared events readable" (SELECT, shared = true AND auth.uid() IS NOT NULL)
-- let ANY logged-in user read every shared event. Permissive policies are
-- OR'd, so migration 010's partner-scoped events_shared_read never took
-- effect. It was created in the dashboard, not in any migration. Also drops two
-- duplicates of events_own. Kept: events_own, events_shared_read.
DROP POLICY IF EXISTS "Shared events readable" ON public.events;
DROP POLICY IF EXISTS "Own data only"          ON public.events;
DROP POLICY IF EXISTS "Own events"             ON public.events;

-- ── 2. Shared helper: is auth.uid() a partner of `other` (uuid as text)? ───
-- Text, not uuid, so storage policies can pass a path folder without a cast
-- error on non-uuid folders. SECURITY INVOKER: partners RLS applies; the caller
-- only sees partnership rows they belong to, which is all it needs.
CREATE OR REPLACE FUNCTION public.is_partner_of(other text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.partners p
    WHERE (p.user_a = auth.uid() AND p.user_b::text = other)
       OR (p.user_b = auth.uid() AND p.user_a::text = other)
  );
$$;

-- ── 3. ozzy_docs ─────────────────────────────────────────────────────────
-- Was "Own data only" FOR ALL USING (true): anyone could read and write.
-- (Migration 005 dropped that policy on four other tables but missed this one.)
-- Now: read = row owner or the owner's partner; write = row owner only.
-- Every app insert had been failing: the app sent `url`, a column that never
-- existed. Add the columns the app writes; `path` replaces the public URL.
ALTER TABLE public.ozzy_docs ADD COLUMN IF NOT EXISTS user_id     uuid;
ALTER TABLE public.ozzy_docs ADD COLUMN IF NOT EXISTS name        text;
ALTER TABLE public.ozzy_docs ADD COLUMN IF NOT EXISTS filename    text;
ALTER TABLE public.ozzy_docs ADD COLUMN IF NOT EXISTS uploaded_at timestamptz;
ALTER TABLE public.ozzy_docs ADD COLUMN IF NOT EXISTS url         text;  -- legacy, no longer written
ALTER TABLE public.ozzy_docs ADD COLUMN IF NOT EXISTS path        text;  -- "<owner uid>/<file>" in bucket pets

-- Ozzy's docs belong to Michael.
UPDATE public.ozzy_docs SET user_id = 'd86cb548-3254-46d4-9322-fc5a45043037' WHERE user_id IS NULL;
ALTER TABLE public.ozzy_docs ALTER COLUMN user_id SET NOT NULL;  -- the app always sends user_id

UPDATE public.ozzy_docs
   SET path = regexp_replace(url, '^.*/storage/v1/object/(public/|authenticated/)?pets/', '')
 WHERE path IS NULL AND url IS NOT NULL;

-- Backfill a row for each uploaded document that has none (the 2026-05-03
-- vaccination certificate), so it survives the app dropping its local cache.
-- Skips the profile photo (ozzy.*).
INSERT INTO public.ozzy_docs (user_id, name, filename, uploaded_at, path)
SELECT ((storage.foldername(o.name))[1])::uuid,
       replace(regexp_replace(storage.filename(o.name), '_[0-9]+$', ''), '_', ' '),
       storage.filename(o.name) || CASE o.metadata->>'mimetype'
         WHEN 'application/pdf' THEN '.pdf'
         WHEN 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' THEN '.docx'
         WHEN 'image/jpeg' THEN '.jpg'
         WHEN 'image/png'  THEN '.png'
         ELSE '' END,
       o.created_at,
       o.name
  FROM storage.objects o
 WHERE o.bucket_id = 'pets'
   AND storage.filename(o.name) NOT LIKE 'ozzy.%'
   AND (storage.foldername(o.name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   AND NOT EXISTS (SELECT 1 FROM public.ozzy_docs d WHERE d.path = o.name);

ALTER TABLE public.ozzy_docs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own data only"  ON public.ozzy_docs;
DROP POLICY IF EXISTS ozzy_docs_owners ON public.ozzy_docs;
-- Found on apply 2026-10-21: ALL TO public, USING/WITH CHECK auth.uid() = user_id.
-- Owner-only, so a harmless duplicate, but duplicates are how leaks hide.
DROP POLICY IF EXISTS ozzy_docs_user   ON public.ozzy_docs;
DROP POLICY IF EXISTS ozzy_docs_read   ON public.ozzy_docs;
DROP POLICY IF EXISTS ozzy_docs_insert ON public.ozzy_docs;
DROP POLICY IF EXISTS ozzy_docs_update ON public.ozzy_docs;
DROP POLICY IF EXISTS ozzy_docs_delete ON public.ozzy_docs;

CREATE POLICY ozzy_docs_read ON public.ozzy_docs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_partner_of(user_id::text));
CREATE POLICY ozzy_docs_insert ON public.ozzy_docs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY ozzy_docs_update ON public.ozzy_docs
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY ozzy_docs_delete ON public.ozzy_docs
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ── 4. Storage bucket "pets" ─────────────────────────────────────────────
-- Was public = true since creation (2026-04-30 22:56 UTC); "pets_read" let anon
-- list the bucket; "pets_upload" let any account upload anywhere. Now private.
-- Object paths are <owner uid>/<file>; read = that folder is you or your
-- partner; insert/update/delete = that folder is you. UPDATE is needed because
-- the Ozzy photo is overwritten in place (<uid>/ozzy.jpg, x-upsert). The app
-- reads files only through short-lived signed URLs (needs the SELECT policy).
UPDATE storage.buckets SET public = false WHERE id = 'pets';

DROP POLICY IF EXISTS pets_read                ON storage.objects;
DROP POLICY IF EXISTS pets_upload              ON storage.objects;
DROP POLICY IF EXISTS pets_owner_read          ON storage.objects;
DROP POLICY IF EXISTS pets_owner_insert        ON storage.objects;
DROP POLICY IF EXISTS pets_read_own_or_partner ON storage.objects;
DROP POLICY IF EXISTS pets_insert_own          ON storage.objects;
DROP POLICY IF EXISTS pets_update_own          ON storage.objects;
DROP POLICY IF EXISTS pets_delete_own          ON storage.objects;

CREATE POLICY pets_read_own_or_partner ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'pets' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_partner_of((storage.foldername(name))[1])
  ));
CREATE POLICY pets_insert_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pets' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY pets_update_own ON storage.objects
  FOR UPDATE TO authenticated
  USING      (bucket_id = 'pets' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'pets' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY pets_delete_own ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'pets' AND (storage.foldername(name))[1] = auth.uid()::text);

COMMIT;

-- ── CHECKS: run these after, in a new query ──────────────────────────────
-- Residual: Cloudflare may still serve a CACHED copy of the photo's old public
-- URL. Re-upload the photo once after the app deploys; that purges it.
--
-- select tablename, policyname, cmd, roles from pg_policies
--  where (schemaname = 'public'  and tablename in ('events', 'ozzy_docs'))
--     or (schemaname = 'storage' and tablename = 'objects' and policyname like 'pets%')
--  order by tablename, policyname;
--   → exactly 10 rows (if ozzy_docs_user or any other extra shows up, it's a leftover):
--     events     events_own                ALL
--     events     events_shared_read        SELECT
--     objects    pets_delete_own           DELETE  {authenticated}
--     objects    pets_insert_own           INSERT  {authenticated}
--     objects    pets_read_own_or_partner  SELECT  {authenticated}
--     objects    pets_update_own           UPDATE  {authenticated}
--     ozzy_docs  ozzy_docs_delete          DELETE  {authenticated}
--     ozzy_docs  ozzy_docs_insert          INSERT  {authenticated}
--     ozzy_docs  ozzy_docs_read            SELECT  {authenticated}
--     ozzy_docs  ozzy_docs_update          UPDATE  {authenticated}
--
-- select id, public from storage.buckets where id = 'pets';
--   → pets | false
--
-- select name, filename, path from public.ozzy_docs;
--   → 1 row: Vaccination certificate | Vaccination_certificate_1777804196622.docx
--            | d86cb548-…/Vaccination_certificate_1777804196622
