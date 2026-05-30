---
description: Map Sanctum's architecture and flag issues without changing behaviour
allowed-tools: Read, Grep, Glob
---
Act as a senior engineer who just joined the Sanctum codebase. First reverse-engineer
the architecture and data flow. Then identify, with file references:
- Dead/debug code (leftover console.logs, unused branches)
- Duplicate logic
- The v1 hardcoded trackers (Study, Career, Finance, Travel, Ozzy) not yet on the JSONB schema
- Any remaining localStorage used as a source of truth (must be Supabase, user-scoped)
- Maintainability and isolation risks

Then provide: a clean architecture breakdown, a prioritised problem list, and a
refactor plan ordered by risk. Do NOT change functionality. Do NOT rewrite working
code. Produce a map and a plan only; I will scope edits separately.
