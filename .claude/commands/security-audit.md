---
description: Production security audit of Sanctum before launch
allowed-tools: Read, Grep, Glob, Bash(git diff:*)
---
Act as a senior security engineer auditing Sanctum for production launch.

Architecture context you MUST account for (these are deliberate, not bugs):
- Auth is a custom hand-rolled JWT stored in localStorage, NOT Supabase sessions.
- RLS is intentionally DISABLED; user isolation is enforced by user_id filters in queries.
- Stack: React+Vite, Supabase (eu-north-1), Vercel, Anthropic API via api/chat.js.
- JWT is validated server-side in api/chat.js using SUPABASE_SERVICE_ROLE_KEY.

Inspect for: authentication flaws, whether the user_id-filter model can be bypassed
(can user A read or write user B's rows via a crafted request?), api/chat.js JWT
validation gaps, sensitive data exposure, injection, and the open Dependabot vuln.

Provide: vulnerability report, severity levels, concrete attack scenarios against THIS
architecture, and fixes that respect the existing auth model.
Do NOT recommend a full rewrite. Do NOT assume RLS is or should be enabled without
explaining the tradeoff first.
