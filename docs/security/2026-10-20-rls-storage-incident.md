<!--
Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
Sanctum — Private and confidential. Unauthorised use prohibited.
https://sanctum.app
-->

# 2026-10-20 — RLS and storage misconfigurations

**Status:** fixed (live 2026-10-20 ~20:50 Irish time / 19:50 UTC; recorded as migration `supabase/migrations/011_security_fixes.sql`).
**Severity:** high for the storage findings (anonymous access), medium for events.
**Redacted public version.** The full version, with account identifiers, is a private GitHub security advisory.

## Summary
A review on 2026-10-20 probed every table and the storage bucket from an account that is neither an owner nor a partner. That found four access-control misconfigurations: one let any logged-in user read other users' shared calendar events, and three left the pets table and storage bucket open, two of them to people who weren't logged in at all. Earlier checks had only used owner/partner accounts, which these grants also allow, so they couldn't show the problem.

## Findings
| # | Where | What was wrong | Who could access | Data exposed |
|---|---|---|---|---|
| 1 | `public.events` | `"Shared events readable"` (SELECT, `shared = true AND auth.uid() IS NOT NULL`) sat next to the partner-scoped `events_shared_read` from migration 010. Permissive policies are OR'd, so 010 never took effect. | any **logged-in** account (before 2026-06-01, probably anyone, see windows) | an owner's 11 shared events (title, date, time, location, notes) |
| 2 | `public.ozzy_docs` | `"Own data only"` FOR ALL `USING (true)`. Migration 005 removed this same policy from four other tables but missed this one. | anyone (read **and write**) | none: the table was empty (see note below) |
| 3 | storage bucket `pets` | bucket `public = true` | anyone with the URL, no login | 2 files: the dog's photo and a vaccination certificate (.docx) |
| 4 | `storage.objects` | `pets_read` SELECT **to public** (anon listing); `pets_upload` INSERT for any authenticated account, any path | listing: anyone, no login; upload: any logged-in account | the bucket's file paths (which makes finding 3 exploitable without knowing URLs); uploads were possible but no unexpected objects were found |

Note on #2: every document insert from the app had been failing since the feature shipped (it wrote a column that didn't exist, and the error was swallowed). So the table never held data, and the document's metadata existed only in one browser's local storage.

## Exposure windows
Postgres does not record when a policy was created. Starts come from git history of `supabase/migrations/` and storage metadata. All windows closed **2026-10-20 ~19:50 UTC**.

| # | Start | Evidence |
|---|---|---|
| 1 | **Unknown, no later than 2026-06-01.** Event sharing shipped 2026-04-18. The first shared event was created 2026-05-03. Before 2026-06-01, `events_shared_read` did not require login (migration 005 says it "tightens events_shared_read to require authentication"), so shared events were probably readable **without logging in** until then. 2026-06-01 → 2026-08-01: readable by any logged-in account via `events_shared_read`. 2026-08-01 → 2026-10-20: still readable via `"Shared events readable"` (created in the dashboard, not in any migration), which is why migration 010 had no effect. | `git log -S` on migrations 005 and 010; first shared event's `created_at` |
| 2 | **Unknown, no later than 2026-06-01** (migration 005 shows this exact policy existed on sibling tables that day). The table existed from 2026-04-18. | migration 005; first commit referencing `ozzy_docs` |
| 3 | **2026-04-30 22:56 UTC** (bucket created public). Files present from 2026-05-02 (photo) and 2026-05-03 (certificate). | `storage.buckets.created_at`, object `created_at` |
| 4 | **Unknown.** Not in any migration (created in the dashboard). The upload policy existed no later than 2026-05-02 (first successful upload). Assume both policies date from bucket creation, 2026-04-30. | object `created_at` |

## Accounts
Signup is disabled, so only invited or admin-created accounts could use the logged-in grants (findings 1, 2 and 4). Anyone at all could use the no-login grants (findings 3 and 4, and finding 1 before 2026-06-01).

**Logged-in exposure was limited to trusted, invited accounts.** Besides the owners, only **2 invited beta testers** (known to the owners; each signed in once, on 2026-08-01 and 2026-09-24, with no return visits) and one test account controlled by the owners could use the logged-in grants. The beta testers' accounts stay active, and the CI and post-fix checks cover the same non-owner role (see Verification).

**The no-login exposure was not limited to testers.** The public bucket (#3), the anonymous listing (#4) and, before 2026-06-01, shared events (#1) were reachable by anyone who had or found the URL.

**There is no evidence of unauthorised access.** Note the limits of that: request logs from the period are not retained, so access can't be ruled out either. The root cause and the fixes stand regardless.

## Fixes
- **Migration 011, events:** dropped `"Shared events readable"` (live 2026-10-20) and two duplicate own-row policies. Only `events_own` and the partner-scoped `events_shared_read` remain.
- **Migration 011, `ozzy_docs`:** also drops `ozzy_docs_user` (ALL, `auth.uid() = user_id`). It was found when the migration was applied on 2026-10-21. It was owner-only, so a **harmless duplicate** that exposed nothing, but it's removed because duplicate policies are how leaks like #1 hide. Access is anchored to the row owner. Read: the owner or their partner (`partners` table, `is_partner_of()`). Write: the owner only. Adds the missing `path` column and backfills a row for the orphaned certificate.
- **Migration 011, storage:** bucket `pets` is private. `storage.objects` policies follow the same rule, keyed on the path's first folder (`<owner uid>/…`). Read: owner or partner. Insert/update/delete: owner only.
- **App:** files are read only through short-lived signed URLs (photo 10 min, document download 60 s, signed on click). Public URLs are gone. `createBucket` now defaults to private.
- **Checks done 2026-10-20:** all public tables have RLS enabled. No remaining policies use `qual = true` or a bare `auth.uid() IS NOT NULL`.

## Verification
- **CI:** `tests/security.spec.ts` runs on every PR as anon and as a non-owner, non-partner test account:
  - **exact policy set** on `events`, `ozzy_docs`, `partners` and `storage.objects` (via `security_policy_inventory()`). Any extra or missing policy fails the build;
  - shared events → none;
  - `ozzy_docs`: cross-user read, write and forged inserts rejected; own rows work;
  - pets: another user's file can't be fetched (public route, cache-busted), downloaded, signed, listed or written into;
  - own folder: upload → download → signed URL → delete works.
- **One-off probe on 2026-10-20 (read-only, owner account):** the owner can still read their events, rows and files.
- **After merge:** a probe with the non-owner test account (the same role as the beta testers) must see zero shared events, zero `ozzy_docs` rows, zero pets files and no v1 trackers. The last check depends on the tracker fix (advisory GHSA-p4h3-9mvv-q7pm).

## Remaining / follow-ups
- **CDN cache:** Cloudflare kept serving a cached copy of the photo's old public URL after the bucket went private (`cf-cache-status: HIT`). Re-uploading the photo clears it.
- **GDPR:** record the incident in the breach register. The exposed data (calendar entries, a pet vaccination certificate) belongs to the operators, so assess whether Art. 33/34 notification applies.
- **Process:** always check sharing and partner policies from an account that is **not** a partner. Never create policies in the dashboard without a migration.
