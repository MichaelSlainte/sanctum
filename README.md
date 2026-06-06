# Sanctum — Private · Personal · Yours

A privacy-first, AI-powered personal life organiser. Built for people who want one place to track everything that matters — health, career, finances, habits, goals — with an AI that understands your full life context.

🌐 **Live:** [trysanctum.app](https://trysanctum.app)

## What it does

- **Notes** — end-to-end encrypted, PIN-locked notebooks
- **Calendar** — recurring events, timezones, category filters
- **Trackers** — AI-generated custom trackers (describe what you want to track, AI builds the schema)
- **Tasks** — simple, fast task management
- **AI Assistant** — context-aware AI that can read your calendar, add events, and help you stay on top of your life
- **Roadmap** — personal project and milestone tracking

## Stack

- **Frontend:** React 19 + Vite, PWA
- **Backend:** Supabase (PostgreSQL, eu-north-1)
- **Auth:** Custom JWT client
- **AI:** Anthropic API (Claude)
- **Hosting:** Vercel
- **Encryption:** E2E encrypted notes (AES via Web Crypto API)

## Architecture highlights

- No Supabase JS SDK — custom `sb` helper with manual JWT auth
- JSONB meta-schema for dynamic tracker creation (no dynamic DDL)
- AI transport unified via `src/lib/chat.js` (`callAI` + `parseAction`)
- Notes excluded from AI context by design — architectural privacy guarantee
- RLS enforced on all user data tables

## Development

```bash
npm install
npm run dev
```

Requires `.env` with:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
```

## License

Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
