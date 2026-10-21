<!--
Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
Sanctum — Private and confidential. Unauthorised use prohibited.
https://sanctum.app
-->

# GHSA-4m5r-w254-7fw4: text to publish

Final text for the private draft advisory GHSA-4m5r-w254-7fw4. Paste the fields below into the advisory form. The **Description** section is the advisory body; copy everything under it.

## Before publishing (checklist, not part of the advisory)

- [ ] **Severity:** choose between Medium with the CVSS vector below (recommended: it matches what was exposed) and High with no CVSS (as in the draft).
- [ ] **CDN note:** if the photo has been re-uploaded since 2026-10-20 (which purges the cached public copy), change the last "CDN cache" line to "Purged by re-uploading the photo."
- [ ] Re-check: no names, emails, usernames or UUIDs. A scan on 2026-10-21 found none.
- [ ] Remove the "PRIVATE — full version" line from the draft, if it's still there (this text replaces the draft body entirely).

## Fields

| Field | Value |
|---|---|
| **Title** | RLS/storage misconfigurations: shared events, ozzy_docs and pets bucket exposed (fixed 2026-10-20) |
| **Ecosystem / package** | other / `sanctum` |
| **Affected versions** | `< main@66b2ca8` |
| **Patched versions** | `main@66b2ca8` |
| **Severity** | **Medium**, CVSS 3.1 `AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:N` (6.5). Alternative: High, with no CVSS. |
| **CWEs** | CWE-732 (Incorrect Permission Assignment for Critical Resource): public bucket, `USING (true)`, any-path upload. CWE-863 (Incorrect Authorization): the extra events policy that cancelled out the partner-only rule. CWE-200 (Exposure of Sensitive Information to an Unauthorized Actor). |
| **Credits** | none |

## Description

# 2026-10-20 — RLS and storage misconfigurations

**Status:** fixed. The database and storage fixes were live on 2026-10-20 at about 19:50 UTC. They are recorded as migration `011_security_fixes.sql`, plus a CI policy check (`012_security_policy_inventory.sql`), merged in `main@66b2ca8`.
**Severity:** high for the storage findings (no login needed), medium for events.

## Summary
A review on 2026-10-20 probed every table and the storage bucket from an account that is neither an owner nor a partner. It found four access-control misconfigurations:
- one let any logged-in user read other users' shared calendar events;
- three left the pets table and storage bucket open, two of them to people who weren't logged in at all.

Earlier checks had only used owner and partner accounts, which these grants also allow, so they couldn't show the problem.

## Findings
| # | Where | What was wrong | Who could access | Data exposed |
|---|---|---|---|---|
| 1 | `public.events` | `"Shared events readable"` (SELECT, `shared = true AND auth.uid() IS NOT NULL`) sat next to the partner-scoped `events_shared_read` from migration 010. Permissive policies are OR'd, so 010 never took effect. | any **logged-in** account (before 2026-06-01, probably anyone; see the exposure windows) | an owner's 11 shared events (title, date, time, location, notes) |
| 2 | `public.ozzy_docs` | `"Own data only"` FOR ALL `USING (true)`. Migration 005 removed this same policy from four other tables but missed this one. | anyone (read **and write**) | none: the table was empty (see note below) |
| 3 | storage bucket `pets` | bucket `public = true` | anyone with the URL, no login | 2 files: a pet photo and a pet vaccination certificate (.docx) |
| 4 | `storage.objects` | `pets_read` SELECT **to public** (anonymous listing); `pets_upload` INSERT for any logged-in account, any path | listing: anyone, no login; upload: any logged-in account | the bucket's file paths (so finding 3 could be exploited without knowing the URLs); uploads were possible, but no unexpected objects were found |

Note on #2: every document insert from the app had been failing since the feature shipped. It wrote a column that didn't exist, and the error was swallowed. So the table never held any data.

## Exposure windows
Postgres does not record when a policy was created. The start dates come from the git history of `supabase/migrations/` and from storage metadata. All windows closed on **2026-10-20 at about 19:50 UTC**.

| # | Start | Evidence |
|---|---|---|
| 1 | **Unknown, no later than 2026-06-01.** Event sharing shipped 2026-04-18, and the first shared event was created 2026-05-03. Before 2026-06-01, `events_shared_read` did not require login (migration 005 "tightens events_shared_read to require authentication"), so shared events were probably readable **without logging in** until then. From 2026-06-01 to 2026-08-01 they were readable by any logged-in account via `events_shared_read`. From 2026-08-01 to 2026-10-20 they were still readable via `"Shared events readable"`, a policy created in the dashboard rather than in a migration, which is why migration 010 had no effect. | `git log -S` on migrations 005 and 010; the first shared event's `created_at` |
| 2 | **Unknown, no later than 2026-06-01.** Migration 005 shows this exact policy existed on sibling tables that day. The table existed from 2026-04-18. | migration 005; the first commit referencing `ozzy_docs` |
| 3 | **2026-04-30 22:56 UTC** (the bucket was created public). Files present from 2026-05-02 (photo) and 2026-05-03 (certificate). | `storage.buckets.created_at`, object `created_at` |
| 4 | **Unknown.** Not in any migration (created in the dashboard). The upload policy existed no later than 2026-05-02 (the first successful upload). Assume both policies date from the bucket's creation, 2026-04-30. | object `created_at` |

## Who could access it
Signup is disabled, so only invited or admin-created accounts could use the logged-in grants (findings 1, 2 and 4). Anyone at all could use the no-login grants (findings 3 and 4, and finding 1 before 2026-06-01).

**Logged-in exposure was limited to trusted, invited accounts.** Besides the owners, the only accounts that could use the logged-in grants were 2 invited beta testers and 1 test account controlled by the owners. Each tester signed in once, with no return visits.

**The no-login exposure was not limited to testers.** The public bucket (#3), the anonymous listing (#4) and, before 2026-06-01, shared events (#1) were reachable by anyone who had or found the URL.

**There is no evidence of unauthorised access.** Request logs from the period are not retained, though, so access can't be ruled out either. The root cause and the fixes stand regardless.

## Fixes (migration 011, `main@66b2ca8`)
- **Events:** dropped `"Shared events readable"` and two duplicate own-row policies. Only `events_own` and the partner-scoped `events_shared_read` remain.
- **`ozzy_docs`:** access is anchored to the row owner. Read: the owner or their partner (`partners` table, `is_partner_of()`). Write: the owner only. The missing columns were added.
- **Storage:** bucket `pets` is private. The `storage.objects` policies follow the same rule, keyed on the first folder of the path (`<owner uid>/…`). Read: the owner or their partner. Insert, update and delete: the owner only.
- **App:** files are read only through short-lived signed URLs (photo: 10 minutes; document download: 60 seconds, signed on click). Public URLs are gone. `createBucket` now defaults to private.
- **CI (migration 012):** a service-role-only `security_policy_inventory()` function lets CI assert the **exact** set of policies per table, so an extra policy, like the dashboard-created one behind finding 1, fails the build.
- **Checked 2026-10-20:** all public tables have RLS enabled, and no remaining policy uses `qual = true` or a bare `auth.uid() IS NOT NULL`.

## Verification
- **CI:** `tests/security.spec.ts` runs on every PR, as an anonymous user and as a test account that is neither an owner nor a partner:
  - shared events: none visible;
  - `ozzy_docs`: cross-user reads, writes and forged inserts are rejected; own rows work;
  - pets: another user's file can't be fetched (public route, cache-busted), downloaded, signed, listed or written into;
  - own folder: upload, download, signed URL and delete all work;
  - exact policy set per table.
- **Production, 2026-10-21:** a probe with the non-owner test account, the same role as the beta testers, found zero shared events, zero `ozzy_docs` rows and zero pets files. The owners' photo couldn't be fetched, signed or downloaded.

## Notes
- **CDN cache:** after the bucket went private, the CDN kept serving a cached copy of the photo's old public URL for a while. Re-uploading the photo purges it.
- **Lesson:** check sharing and partner policies from an account that is **not** a partner, and never create policies in the dashboard without a migration.
