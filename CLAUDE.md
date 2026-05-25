# Sanctum — Project Context

## What this is
A private personal life organiser app for Michael (Dublin) and Tamara. Stack: React 19 + Vite, Supabase (Stockholm EU, eu-north-1), Vercel, Claude Haiku AI proxy.

## Live URL
https://sanctum-beige.vercel.app

## Key people
- Michael Rodrigues Marques — main user, Dublin
- Tamara — wife, has her own account
- Ozzy — Golden Retriever, born Nov 2025
- PMP exam: July 7 2026 at 13:30
- MSc Cybersecurity at SETU: Sep 14 2026
- Trips: Italy Jun 12-17 2026, Scotland Sep 7-13 2026 (with Tamara + Ozzy)

## Architecture
- Auth: custom hand-rolled JWT client (no Supabase JS SDK). Tokens stored in localStorage under keys: sanctum_token, sanctum_user, sanctum_refresh, sanctum_expiry. Auto-refresh via 45-min polling interval in App.jsx and on cold start. auth.signOut() clears localStorage only — no server-side token revocation.
- Database: Supabase PostgreSQL, all tables have RLS (own data only). All DB calls use the sb helper which reads sanctum_token from localStorage for the Bearer header.
- E2E encryption: live — notes encrypted at rest via crypto.js + CryptoContext
- AI proxy: api/chat.js (Vercel serverless, Claude Haiku)
- Theme: stored in localStorage key "sanctum_theme", applied via data-theme on <html>

## File structure
- src/App.jsx — root app shell, routing, auth, global state
- src/main.jsx — entry point
- src/index.css, src/App.css, src/styles/base.css — global styles
- src/components/ — page-level components: Home, Notes, Calendar, Settings, Roadmap, shared
- src/components/trackers/ — tracker components: TrackerHub, TrackerCreator, Study, Career, Finance, Travel, Ozzy
- src/trackers/TrackerRenderer.jsx — generic JSONB schema-driven tracker renderer
- src/trackers/schema-spec.js — field type contract for JSONB tracker schemas
- src/lib/ — utilities: supabase.js (sb helper + custom auth), crypto.js, CryptoContext.jsx

## Design system
- 3 themes: Midnight (dark, default), Light, Tamara (dark + pink)
- Glass cards with backdrop-filter blur
- CSS variables: --bg, --bg1, --bg2, --t1, --t2, --t3, --blue, --glass-bg, --glass-border
- Never use hardcoded colors — always use CSS variables

## Supabase tables
- tasks: id, user_id, text, tag, done, created_at
- notes: id, user_id, notebook, section, title, body, tags, updated_at
- events: id, user_id, title, date, time, category, color, notes, repeat_deleted_from, exceptions JSONB
- finance: id, user_id, label, amount, category, month
- applications: id, user_id, company, role, status, applied_date, notes
- study_sessions: id, user_id, type, topic, hours, notes, date
- study_subjects: id, user_id, label, color, position
- study_topics: id, user_id, subject_id, label, position
- custom_trackers: id, user_id, name, description, icon, color, fields JSONB, created_at

## Pending Supabase migrations
```sql
ALTER TABLE custom_trackers ADD COLUMN IF NOT EXISTS fields JSONB DEFAULT '[]';
ALTER TABLE events ADD COLUMN IF NOT EXISTS repeat_deleted_from date;
ALTER TABLE events ADD COLUMN IF NOT EXISTS exceptions JSONB DEFAULT '[]';
```

## What is built
- Auth: custom hand-rolled JWT, localStorage, 45-min refresh polling (no Supabase SDK)
- Home: greeting, AI bar, stat cards (PMP/Scotland/MSc/Tasks), tasks widget, calendar strip, tracker shortcuts, study ring quick-log
- Notes: three-panel (notebooks/list/editor), WYSIWYG editor, auto-save, fullscreen, PIN lock, E2E encryption
- Calendar: month/week/3day/day/year views, mini date picker, events, category filters, recurring events, timezone support
- Trackers (v1 hardcoded): Study, Career, Finance, Travel, Ozzy — hardcoded hub
- AI tracker creation flow (v2): describe → AI generates JSONB schema → preview → edit → save to custom_trackers table
- Generic TrackerRenderer component (src/trackers/TrackerRenderer.jsx) driven by JSONB schema
- JSONB schema field type contract (src/trackers/schema-spec.js)
- Playwright E2E smoke tests (9/9 passing)
- GitHub Actions CI
- Settings: themes, profile, privacy section, account info

## What is NOT built yet (v2 remaining)
1. Custom trackers appearing in sidebar nav
2. Custom tracker detail view (log entries)
3. Convert v1 hardcoded trackers to JSONB format
4. Calendar ↔ tracker integration
5. Dynamic home dashboard
6. Onboarding for new users
7. Stripe + public launch
8. JWT validation on api/chat (TODO — removed temporarily)

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