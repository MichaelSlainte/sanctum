# Sanctum — Project Context

## What this is
A private personal life organiser app for Michael (Dublin) and Tamara. Stack: React 19 + Vite, Supabase (Stockholm EU, eu-north-1), Vercel, Claude Haiku AI proxy.

## Live URL
- https://trysanctum.app (primary)
- https://sanctum-beige.vercel.app (Vercel fallback, still active)

## Key people
- Michael Rodrigues Marques — main user, Dublin
- Tamara — wife, has her own account
- Ozzy — Golden Retriever, born Nov 2025
- PMP exam: July 7 2026 at 13:30
- MSc Cybersecurity at SETU: Sep 14 2026
- Trips: Italy Jun 12-17 2026, Scotland Sep 7-13 2026 (with Tamara + Ozzy)

## Architecture
- Auth: Custom REST client over Supabase GoTrue. No Supabase JS SDK. Stores access/refresh tokens in localStorage under 4 keys: sanctum_token, sanctum_user, sanctum_refresh, sanctum_expiry. Auto-refresh via 45-min polling interval in App.jsx, on cold start, and on tab visibility change. auth.signOut() clears localStorage only — no server-side token revocation.
- Database: Supabase PostgreSQL. RLS enabled on all user tables — verify coverage before public launch. All DB calls use the sb helper which reads sanctum_token from localStorage for the Bearer header.
- E2E encryption: live — notes encrypted at rest via crypto.js + CryptoContext (key derived from password + per-user encryption_salt stored in profiles)
- AI proxy: api/chat.js (Vercel serverless, Claude Haiku). Validates the Bearer token against Supabase /auth/v1/user using SUPABASE_SERVICE_ROLE_KEY.
- Theme: stored in localStorage key "sanctum_theme", applied via data-theme on <html>

## File structure
- src/App.jsx — root app shell, routing, auth, global state, Login component, BETA_EMAILS allowlist
- src/main.jsx — entry point (mounts app + Vercel Analytics & Speed Insights)
- src/index.css (reset, imported in main.jsx), src/styles/base.css (full app stylesheet, imported in App.jsx) — global styles
- src/components/ — page-level components: Home, Notes, Calendar, Settings, Roadmap, shared
- src/components/trackers/ — tracker components: TrackerHub, TrackerCreator, Study, Career, Finance, Travel, Ozzy
- src/trackers/TrackerRenderer.jsx — generic JSONB schema-driven tracker renderer
- src/trackers/schema-spec.js — field type contract for JSONB tracker schemas
- src/lib/ — utilities: supabase.js (sb helper + custom auth), crypto.js, CryptoContext.jsx, chat.js (shared callAI/parseAction AI transport)
- api/chat.js — Vercel serverless AI proxy (Claude Haiku)

## Design system
- 3 themes: Midnight (dark, default), Light, Tamara (dark + pink)
- Glass cards with backdrop-filter blur
- CSS variables: --bg, --bg1, --bg2, --t1, --t2, --t3, --blue, --glass-bg, --glass-border
- Never use hardcoded colors — always use CSS variables

## Owner gating
OWNER_IDS exported from src/components/trackers/TrackerHub.jsx.
- Michael: d86cb548-3254-46d4-9322-fc5a45043037
- Tamara: 8e2d598c-94b2-497c-a44a-a773e7d8ff6a

Gates: v1 hardcoded trackers, Home AI suggestion chips, PMP study chart, default notebooks (owners only), calendar share toggle. Imported/used across App.jsx, Home.jsx, Notes.jsx, Calendar.jsx, TrackerHub.jsx. This is a hardcoded UUID allowlist — replace with a data-driven role model before public launch.

## Private beta
BETA_EMAILS array in the Login component in App.jsx gates both login and signup. To add a new user: add their email to BETA_EMAILS AND create the Supabase auth user. Client-side gate only — not a security boundary (the real boundary is who can create Supabase accounts + RLS).

## Supabase tables
- tasks: id, user_id, text, tag, done, created_at
- notes: id, user_id, notebook, section, title, body, tags, updated_at, locked, pin_hash
- events: id, user_id, title, date, time, category, color, notes, shared, end_date, start_time, end_time, location, timezone, repeat, reminder, repeat_deleted_from, exceptions JSONB
- finance: id, user_id, label, amount, category, month
- applications: id, user_id, company, role, status, applied_date, notes
- study_sessions: id, user_id, type, topic, hours, notes, date
- study_subjects: id, user_id, label, color, position
- study_topics: id, user_id, subject_id, label, position
- custom_trackers: id, user_id, label, description, icon, color, fields JSONB, weekly_goal, archived, created_at
- profiles: id, user_id, display_name, timezone, encryption_salt
- notebooks: singleton per user — id (singleton_<userId>), user_id, data JSONB, updated_at

## What is built
- Auth: custom REST client over Supabase GoTrue, localStorage tokens, 45-min refresh polling + tab-visibility refresh (no Supabase SDK)
- Private beta: email allowlist gate on login/signup (BETA_EMAILS in App.jsx)
- Home: greeting (first name only) + full-name avatar initials, AI bar, stat cards (PMP/Scotland/MSc/Tasks), tasks widget, calendar strip, tracker shortcuts, study ring quick-log
- Notes: three-panel (notebooks/list/editor), WYSIWYG editor, auto-save, fullscreen, PIN lock, E2E encryption, new-user notebook seeding
- Calendar: month/week/3day/day/year views, mini date picker, events, category filters, recurring events, timezone support, partner event sharing (owner-only share toggle, "S"/"Shared" badges)
- Trackers (v1 hardcoded): Study, Career, Finance, Travel, Ozzy — hardcoded hub
- AI tracker creation flow (v2): describe → AI generates JSONB schema → preview → edit → save to custom_trackers table
- Generic TrackerRenderer component (src/trackers/TrackerRenderer.jsx) driven by JSONB schema
- JSONB schema field type contract (src/trackers/schema-spec.js)
- Forgot-password flow (Supabase /auth/v1/recover)
- Mobile hardening: iOS input-zoom fix (inputs ≥16px), viewport-fit=cover, interactive-widget=resizes-content, bottom-sheet modal lifted above bottom nav, sticky modal header
- Vercel Analytics + Speed Insights
- Playwright E2E smoke tests (9/9 passing)
- GitHub Actions CI
- Settings: themes, profile, privacy section, account info

## What is NOT built yet (v2 remaining)
1. Custom trackers appearing in sidebar nav
2. Custom tracker detail view (log entries)
3. Convert v1 hardcoded trackers to JSONB format
4. Calendar ↔ tracker integration — AI-context side shipped 2026-06-07 (AI bars read live tracker data + create events); deeper two-way sync (tracker entries ↔ calendar events) still pending
5. Dynamic home dashboard
6. Onboarding for new users (partially started — new-user notebook seeding)
7. Stripe + public launch

## Recently shipped (2026-06-07 session)
- Calendar ↔ tracker integration (AI-context side): new `src/lib/trackerContext.js` (`fetchTrackerContext` + `isTrackerQuery`, re-exported from `src/lib/chat.js`). Both AI bars — Home `sendAI` and the global FAB `sendGlobalAI` — fetch live tracker data on-demand (only when the query is tracker-related) and inject a plain-text summary into the system prompt, so the AI can answer questions about study hours, applications, finance, trips, Ozzy, and custom trackers, and offer to create calendar events. `api/chat.js` `safeSystem` cap raised 5000 → 12000 (the assembled prompt legitimately reaches ~7k; 5000 was silently truncating the RESPONSE RULES tail). Note: `trackerContext.js` derives finance income/expense from `category` (no `type` column), counts custom-tracker entries by `custom_tracker_id` (no reliable `user_id` on `tracker_entries`), and reads vet visit type from `type` (no `reason` column).
- Multi-event AI support: `parseAction` (src/lib/chat.js) now returns an array for a clean JSON-array reply (handles a leading `[` before the object-only brace scanner); both AI handlers normalise to an `actions` array and the `add_event` branch loops over every event. Both system prompts instruct the model to batch multiple events as a JSON array.
- Roadmap track archive fix: added `status` column to `roadmap_tracks` via migration 007 (`supabase/migrations/007_roadmap_tracks_status.sql`, `status text DEFAULT NULL`); `archiveTrack` now sends "active" instead of null on unarchive (a null PATCH body was rejected 400 by PostgREST); the visibility filter (Roadmap.jsx:83) treats both null and "active" as non-archived.
- Dashboard Customise panel: toggle list now filtered by a `show` field using `hasPmpSubject`, `hasMscSubject`, `hasStudySubjects`, `hasTrips` — new users only see toggles for data they actually have (Active Tasks always shown).
- Confirmed working, no change needed: tracker detail colour picker updates immediately (`setTracker` is called in `updateTracker`).
- Confirmed working, no change needed: dashboard cards are already data-gated at render (`hasPmpSubject`, `hasTrips`, `hasMscSubject`, `hasStudySubjects` at Home.jsx:1189-1222), so new users never see empty PMP/Scotland/MSc/study cards.

## Commits today (2026-06-07)
- 1c372af fix: hide irrelevant cards from dashboard customise panel for new users
- d72541a docs: migration 007 — add status column to roadmap_tracks
- e7b4120 fix: roadmap track archive 400 — use active instead of null on unarchive
- 17a9cca fix: add multi-event array hint to FAB system prompt
- 9aab143 fix: multi-event array support in all AI call sites + parseAction
- 99164b1 fix: wire tracker context into Home AI bar; raise safeSystem cap to 12000
- 9a75b2f feat: calendar↔tracker integration — on-demand tracker context in FAB AI

## Pending bugs (priority order)
1. Custom trackers in the Customise panel — active custom trackers should appear as toggleable items in the dashboard Customise panel. `dashboardRings` keys off `tracker.id` (default true). Needs a second `.map()` block after the hardcoded items iterating the active custom trackers (`homeCustomTrackers`, Home.jsx:443), and the dashboard render loop should wrap each custom-tracker card in a `dashboardRings[tracker.id] !== false` check.
2. Modal keyboard overlap on mobile (partially improved).
3. Swallowed-error pattern in `duplicateNote` / `autoSave` / `flushSave` — failures are silently caught.
4. Remove debug `console.log`s.
5. Stray repo files: `verify_*.mjs`, `playwright-report/`, `test-results/` (an uncommitted `.gitignore` edit covers the latter two — confirm none are tracked).
6. Dead `AIAssistant` component in `src/components/Home.jsx` — defined but never rendered; safe to delete.
7. Dependabot vulnerabilities.

## Rules for Claude Code
- Always use CSS variables, never hardcode colors
- Always commit after each completed task
- Always run npm run build before committing to check for errors
- Keep all Supabase operations using the sb helper
- Theme is applied via document.documentElement.setAttribute("data-theme", t)
- PMP exam date: new Date("2026-07-07T13:30")
- Always add the copyright header to any file you create or modify
- The custom sb helper delete method signature is `delete({field: value})` — always use object match syntax
- Auth tokens are in localStorage (sanctum_token, sanctum_refresh, sanctum_expiry) — never assume Supabase SDK session management

## Tech Lead Mode (default behaviour)
Before writing code: ask clarifying questions, challenge weak decisions, flag scaling
risks, and prioritise the simplest solution that works. Think like someone maintaining
Sanctum for 5+ years. Never rewrite working code without an explicitly scoped task.
Do not optimise for "millions of users" — Sanctum is pre-launch with a handful of users.
