<!--
Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
Sanctum — Private and confidential. Unauthorised use prohibited.
https://sanctum.app
-->

# Handoff — 2026-10-21

Where things stand after the notes-encryption and security work of 2026-10-20/21, and what comes next. Read with `CLAUDE.md`. Incident details: `docs/security/2026-10-20-rls-storage-incident.md`.

## 1. Merged

| PR | Merge | What it fixed |
|---|---|---|
| **#26** | `e027e35` | **Notes: never write over ciphertext.** An encrypted note opened with no key loaded (new tab, PWA relaunch) showed an *editable* placeholder, and typing saved it as plaintext over the ciphertext, destroying the note. Now that note is read-only, with an "Enter password to unlock" prompt, and the password is checked against the note's own ciphertext. Login confirms the encryption salt is saved (written, then read back) before using it, and a failed salt read no longer generates a new salt. |
| **#27** | `001a2c9` | **Notes: the remaining encryption gaps.** (1) With no key, *no* note body is ever written in plaintext: edits and new notes stay as in-memory drafts (`divertBodyWrite` gate), with an unlock bar and a warning on tab close, and are encrypted and saved on unlock. (2) The plaintext→ciphertext migration actually runs now (`encryptPlaintextNotes`, after login/unlock, conditional on the row still being plaintext). The old one never ran when the key was already loaded. (3) Failed reads of notes, notebooks, salt and export show an error instead of looking empty. A failed notebooks read had been able to write the default notebooks over an owner's real tree. (4) **The key is memory-only and non-extractable**, cleared on logout and on session expiry (`checkSession`). The password is needed after every reload. (5) All E2E tests moved to the non-owner test account. |
| **#32** | `66b2ca8` | **Security incident 2026-10-20** (migrations `011_security_fixes.sql`, `012_security_policy_inventory.sql`). Shared events were readable by any logged-in user (a dashboard-created policy OR'd past migration 010). `ozzy_docs` had `USING (true)`. The `pets` bucket was public, and anon could list it. Now: `ozzy_docs` and pets storage are owner-or-partner read and owner-only write (`is_partner_of()`); the bucket is private; Ozzy's photo and documents load only through short-lived signed URLs (`useSignedUrl`, which refreshes before expiry). CI asserts the **exact policy set** per table through a service-role-only inventory function. |

**Verified in production (2026-10-21):**
- **Notes:** Michael 16 encrypted / 0 plaintext; Tamara 2 / 0. The 2026-09-05 note migrated on login.
- **Ozzy photo:** loads via a signed URL, with no `/object/public/` requests.
- **Non-owner probe** (test account, the same role as the beta testers):
  - shared events `*/0`, `ozzy_docs` `*/0`;
  - pets: 0 files at the bucket root and 0 in owner folders; signing, downloading or fetching the owner photo publicly → 400;
  - **v1 trackers: still visible in Archived** (expected; fixed by the tracker PR below).

## 2. Security advisories

| Advisory | Severity | Covers | Publish when | Before publishing |
|---|---|---|---|---|
| **GHSA-4m5r-w254-7fw4** | medium (CVSS 3.1 6.5) | the four 2026-10-20 RLS/storage findings | **✅ Published 2026-10-22.** Affected `< main@66b2ca8`, patched `main@66b2ca8`; CWE-732, CWE-863, CWE-200; no CVE. Published text: `docs/security/GHSA-4m5r-publish.md` (redacted: no names, usernames, emails or UUIDs). | done |
| **GHSA-p4h3-9mvv-q7pm** | low | v1 tracker names visible to non-owners via the browser-wide Archived state | **✅ Published 2026-10-21.** Patched `main@15ac042` (PR B completes the fix: PR A `46d1f02` hid the trackers, PR B scoped the storage). CWE-200. | done |

## 3. Tracker work: done (2026-10-21)

**Both PRs are merged and verified in production.** PR B: #35, merge `15ac042`. Production deploy confirmed: the live bundle matches a local `main` build. Non-owner probe on prod: 9/9 API checks (the exact-policy check passed in CI) and 12/12 UI tests. **Still to do:** each owner opens the app once on every device that has Ozzy weight entries. The rest of this section is the record of what was planned and done.


- **PR A: merged** (#34, `46d1f02`). Item 2 + the test flip. Verified on prod 2026-10-21: the security probes pass and the v1-tracker test passes against trysanctum.app.
- **PR B: merged** (#35, `15ac042`, branch `feat/ui-prefs-logout-clear`): everything else below, plus the agreed changes in this list, plus a sidebar tidy-up (archived v1 trackers are hidden under Trackers) and a forgot-password warning (login + reset screen: a reset leaves existing notes unreadable). **To merge:**
  1. ✅ Apply `supabase/migrations/013_ui_prefs_ozzy_data.sql` (SQL editor) **before** deploying.
  2. ✅ Applied 2026-10-21; CHECKs 1–3 OK. `profiles` has one policy, `"Users can manage own profile"` (ALL, `{public}`, `auth.uid() = id`, no WITH CHECK), now pinned in `EXPECTED_POLICIES`.
     - **Follow-up (migration 014, not urgent):** replace it with explicit per-command policies `TO authenticated` with explicit WITH CHECK, and cap the size of `ui_prefs` (`CHECK (pg_column_size(ui_prefs) < 65536)`).
  3. ⏳ After deploy, each owner loads the app once on every device that has Ozzy weight entries; the weight log moves to `ozzy_weights`. (Unsynced entries are kept and shown until then, and logout never drops them.)
  - Salt: the localStorage → DB seeding fallback is **removed** (all 6 accounts had a DB salt, 2026-10-21).
  - Test account: the notes specs pass with the rotated `TEST_PASSWORD_2`, so no notes/salt reset was added.
- **PR B, agreed changes:**
  - **Extra `ui_prefs` keys:** `note_order` and `expanded_nbs` (owners would otherwise lose them on logout).
  - **Timezone:** at login, write `profiles.timezone` back to `sanctum_timezone` (Calendar only reads localStorage).
  - **Ozzy weight and custom-doc names are localStorage-only today** (`sanctum_ozzy_weight`, `sanctum_ozzy_custom_docs`), so clearing them would delete them. Move them into the DB with **owner-or-partner read and owner-only write, like `ozzy_docs`**. Check `ozzy_profile`'s current policies first; if they aren't already like that, use a dedicated table or fix the policies, by migration. On first load, merge the localStorage data into the DB (union, nothing dropped) *before* anything clears it.
  - **`sanctum_enc_salt_*` survives logout, as a cache only.** The DB salt is the source of truth: if the DB has a salt and the cache differs, use the DB and replace the cache. Never create or overwrite a salt from the cache. ⚠️ Today `ensurePersistedSalt` *does* seed the DB from the cache when the DB has none (the pre-#26 legacy path). Decide in PR B whether any account still needs that path before removing it.
  - **Test account:** if notes or salt left over from before the 2026-10-21 `TEST_PASSWORD_2` rotation break the notes specs, reset the test account's notes and salt in spec setup. Test account only (the specs already refuse owners).

Decisions already made:

1. **`profiles.ui_prefs jsonb`** (new migration `013_…`, default `'{}'`). It holds per-user UI state: `archived_trackers`, `tracker_order`, `trackers_expanded`, plus the owners' layout (`dashboard_rings`, `home_widget_order`, `ring_order`, `nav_order`, `hide_roadmap`, `roadmap_collapsed`, `study_collapsed`, `study_ring_source`). **profiles RLS is own-row only** (probed 2026-10-20: the non-owner sees only its own row, and a PATCH on an owner row returns `[]`). Re-confirm in the PR, and add `profiles` to `security_policy_inventory()` and to `EXPECTED_POLICIES` in `tests/security.spec.ts`.
2. **v1 trackers render only for `OWNER_IDS`**, both the active grid and the **Archived** section and its count (`TrackerHub.jsx` ~1119–1140; the active grid is already gated).
3. **Logout and user-switch clear the `sanctum_*` keys.** That means everything except the 7 device preferences: `sanctum_theme`, `sanctum_font`, `sanctum_sidebar_col`, `sanctum_list_col`, `sanctum_notes_fs`, `sanctum_ai_btn_pos`, `sanctum_cal_view`.
   - **Logout:** clear in `handleLogout`.
   - **User switch:** a session can expire without logout, so also clear at login when the user id differs from `sanctum_last_uid`.
   - **Caches that leak to the next user** of a shared browser, all to be cleared: `sanctum_notebooks_v2`, `sanctum_study_subjects`, `sanctum_tracker_entries`, `sanctum_ozzy_*` (7), `sanctum_pmbok_topics`, `sanctum_pmp_date`, `sanctum_pmp_target`, `sanctum_study_goal`.
4. **Owners keep their layout.** On first login after deploy, copy their existing localStorage layout/tracker keys into `ui_prefs`, *then* clear the old keys. Read and write `ui_prefs` from then on.
5. **Flip the regression test.** In `tests/sanctum.spec.ts` ("non-owner sees NO v1 trackers…"), remove `test.fail()` and replace the `TODO(link)` with GHSA-p4h3-9mvv-q7pm. Add a test that seeds old caches and checks that, after logout, only the 7 device keys remain.
6. After merge: run the non-owner probe again (all four zeros, including no v1 trackers), then publish GHSA-p4h3.

## 4. Remaining follow-ups (not scheduled)

- **Privacy wording must be literally true.** The sidebar's "End-to-end encrypted" (`App.jsx` ~946) and the Home badge (`Home.jsx` ~246) cover the whole app, but only note **bodies** are E2E. "Notes are end-to-end encrypted" (`Privacy.jsx` ~48, ~55, ~108; Onboarding "Notes — End-to-end encrypted") is also too broad (next item).
- **Note titles, tags and notebook names are plaintext.** Either encrypt them (titles/tags with the same key; notebook names live in `notebooks.data` JSONB), or word every claim as "note contents".
- **Crypto PR (bundle these together):**
  - **Fingerprint / Face ID unlock via WebAuthn PRF.** `encryptionKey.js` is ready for it: `unlockWith(getKey, prove)`, so a passkey method only adds a `getKey`.
  - **PBKDF2 100k → 600k (OWASP).** This changes the derived key, so it needs a stored per-user iteration count and a one-time re-encryption at the next login (derive the old key, decrypt, re-encrypt with the new key).
  - **Encrypt note titles, tags and notebook names** (see the item above).
  - **Re-encryption flow.** Old password → new password: derive both keys, decrypt every note with the old key and re-encrypt it with the new one, and change the Supabase password only once every note is saved. There is none today. Changing the login password (Supabase dashboard, `SetPassword`, recovery email) leaves every existing note unreadable with the new password, and later notes get encrypted with the new key, so the notes end up split across two keys. **Forgot-password recovery does this today.**
  - **Design issue: the login password *is* the notes key material.** GoTrue receives the password that derives the notes key at every login, so Supabase (or anyone with its logs or a compromised auth endpoint) could decrypt the notes. Not true E2E. Options:
    - **(a) A separate notes passphrase.** The key is derived only from the passphrase; the login password never touches it.
    - **(b) Derive the login credential client-side** (Bitwarden-style: one stretched secret, then HKDF into an auth secret sent to GoTrue and a separate encryption key).
    - **Recommendation: (a).** With PRF fingerprint unlock, the passphrase is rarely typed, so the cost of a second secret is small. It is the only option where a login-password reset or rotation can't break the notes. (b) still loses the notes on a forgotten password. It also needs the salt *before* login, which means a pre-auth salt lookup (account enumeration) or an email-derived salt. And every account, plus `SetPassword` and recovery, would have to switch to derived credentials in our hand-rolled auth client. Migration for (a): at the next unlock, enter the login password (old key), set a passphrase, re-encrypt with the re-encryption flow above. After that, "change passphrase" re-encrypts, and login-password changes need no re-encryption.
  - **After this ships: rotate Michael's password** (moved here from the clean-up list: rotating it before then leaves his notes unreadable).
- **`sb.select` still returns `[]` on errors for non-notes callers.** Notes, notebooks, salt, profile salt and the notes export are strict (`{ strict: true }`). Still lenient: `App.jsx` (custom_trackers, events ×4, profiles ×4), `Calendar.jsx` (5), `Home.jsx` (11), `Roadmap.jsx` (7), `Settings.jsx` (8 other tables), `Career`/`Finance`/`Travel` (1 each), `Ozzy.jsx` (3), `Study.jsx` (7), `TrackerHub.jsx` (7), `trackerContext.js` (7). Audit each: any that *writes* based on an empty read is dangerous (like the notebooks bug).
- **GDPR deletion.** `api/delete-account.js` deletes the auth user (admin API) after `Settings.deleteAllData` wipes the tables, but **storage files under `pets/<uid>/` are never deleted**. Add storage deletion (service role) and confirm no table rows survive (for example `partners`).
- **Dependabot: 12 open PRs.** #31 vite 8.1.6, #30 brace-expansion, #29 sharp 0.35.5, #28 source-map-js, #25 js-yaml, #24 baseline-browser-mapping, #22 browserslist, #21 nanoid, #20 @humanfs/node, #19 fast-uri, #15 postcss, #4 vite + vite-plugin-pwa (likely superseded by #31). Merge them one at a time with CI.
- ✅ **Duplicate Vercel projects (done 2026-10-21).** `sanctum-26vy` (no env vars, no domain) was deleted. `sanctum-beige.vercel.app` now 308-redirects to `www.trysanctum.app`, and the Supabase Site URL was already correct. PRs now show 3 checks.
- **Ops note (2026-10-21): Tamara's login issue, resolved.** Cause: an old email link to sanctum-beige, plus iOS autofilling a stale password. Before the cause was found, her 2 notes were deleted via SQL (with her agreement). Her salt was kept and her password is unchanged; Notes works again. The sanctum-beige redirect stops the old link from recurring.
  - **Lesson:** rule out the login URL and a stale autofilled password before touching notes data.
- **OWASP checklist audit.** Run the `/security-audit` command (ASVS-style pass: auth/session, access control, input handling, headers/CSP, logging, dependencies).
- **Password / secret clean-up.**
  - **GitHub:** delete the retired `TEST_EMAIL` / `TEST_PASSWORD` secrets (Michael's real account).
  - **Local:** remove `TEST_EMAIL` / `TEST_PASSWORD` from `.env.local`.
  - **Rotate Michael's password:** it sat in CI secrets and a local env file. **Only after the crypto PR** (re-encryption flow); see above.
  - `TEST_PASSWORD_2` rotated 2026-10-21 (GitHub secret and `.env.local`); login verified locally.
  - **Service-role key:** keep `SUPABASE_SERVICE_ROLE_KEY` only in GitHub secrets (one CI step) and Vercel server env.
  - **AI rate limiting:** set `UPSTASH_REDIS_REST_URL` / `_TOKEN` in Vercel so the rate limit persists across instances.

## 5. Test accounts

- **`TEST_EMAIL_2` / `TEST_PASSWORD_2`:** the **only** E2E account. It's `eng.michaelmarques+sanctum-e2e@gmail.com`: non-owner, not in `partners`, in `BETA_EMAILS`. Stored in `.env.local` (gitignored) and GitHub secrets. All specs refuse to run if it's an owner. Its test data is created and deleted by the specs.
- **`TEST_EMAIL` (Michael's real account): retired** from tests and CI. Only one-off, read-only owner probes have used it (counts, no content). The secrets still exist (see clean-up above).
- **`SUPABASE_SERVICE_ROLE_KEY`:** GitHub secret, used by one CI step ("Policy inventory check"), with no app server running (`API_ONLY=1`).
- **Suites:**
  - `tests/notes-encryption.spec.ts` (8);
  - `tests/sanctum.spec.ts` (9; the v1-tracker regression test passes since PR A);
  - `tests/security.spec.ts` (7; the exact-policy test runs only in that CI step).
