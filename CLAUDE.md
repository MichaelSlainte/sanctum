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
4. Calendar ↔ tracker integration
5. Dynamic home dashboard
6. Onboarding for new users (partially started — new-user notebook seeding)
7. Stripe + public launch

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
