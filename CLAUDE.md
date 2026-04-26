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
- Auth: custom JWT via Supabase, stored in localStorage, auto-refresh every 45min
- Database: Supabase PostgreSQL, all tables have RLS (own data only)
- AI proxy: api/chat.js (Vercel serverless, Claude Haiku)
- Theme: stored in localStorage key "sanctum_theme", applied via data-theme on <html>

## File structure
- src/App.jsx — root app shell, routing, auth, global state
- src/main.jsx — entry point
- src/index.css, src/App.css, src/styles/base.css — global styles
- src/components/ — page-level components: Home, Notes, Calendar, Settings, Roadmap, shared
- src/components/trackers/ — tracker components: TrackerHub, TrackerCreator, Study, Career, Finance, Travel, Ozzy
- src/lib/ — utilities: supabase.js (sb helper), crypto.js, CryptoContext.jsx

## Design system
- 3 themes: Midnight (dark, default), Light, Tamara (dark + pink)
- Glass cards with backdrop-filter blur
- CSS variables: --bg, --bg1, --bg2, --t1, --t2, --t3, --blue, --glass-bg, --glass-border
- Never use hardcoded colors — always use CSS variables

## Supabase tables
- tasks: id, user_id, text, tag, done, created_at
- notes: id, user_id, notebook, section, title, body, tags, updated_at
- events: id, user_id, title, date, time, category, color, notes
- finance: id, user_id, label, amount, category, month
- applications: id, user_id, company, role, status, applied_date, notes

## What is built
- Home: greeting, AI bar, stat cards (PMP/Scotland/MSc/Tasks), tasks widget, calendar strip, tracker shortcuts
- Notes: three panel (notebooks/list/editor), Write/Split/Preview modes, auto-save, fullscreen
- Calendar: month/week view, events, categories
- Trackers: Study, Career, Finance, Travel, Ozzy — draggable hub
- Settings: themes, profile, privacy section, account info
- All drag-to-reorder uses HTML5 drag API, saved to localStorage

## What is NOT built yet (next steps)
1. Study tracker rebuild — rings, milestones, weekly plan, hours tracking
2. AI tracker creation flow with preview step
3. Calendar connected to trackers (events from tracker entries)
4. Mobile touch drag fix
5. E2E encryption
6. Backend API refactor (after design complete)

## Rules for Claude Code
- Always use CSS variables, never hardcode colors
- Always commit after each completed task
- Always run npm run build before committing to check for errors
- Keep all Supabase operations using the sb helper
- Theme is applied via document.documentElement.setAttribute("data-theme", t)
- PMP exam date: new Date("2026-07-07T13:30")
- Always add the copyright header to any file you create or modify
