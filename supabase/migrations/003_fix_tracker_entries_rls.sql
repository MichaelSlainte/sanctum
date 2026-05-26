-- Copyright (c) 2025 Michael Rodrigues Marques. All rights reserved.

-- Drop the broken policy that uses auth.uid() (incompatible with Sanctum's custom JWT auth)
DROP POLICY IF EXISTS "Users can manage own entries" ON tracker_entries;

-- Disable RLS entirely — same approach used for all other Sanctum tables.
-- Row-level access is enforced in the application layer via user_id filtering.
ALTER TABLE tracker_entries DISABLE ROW LEVEL SECURITY;
