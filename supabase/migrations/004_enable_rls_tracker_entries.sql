-- Migration 004: Enable RLS on tracker_entries
-- The table already had 2 policies defined (from migration 003 era)
-- but RLS was left disabled. This enables enforcement.
ALTER TABLE tracker_entries ENABLE ROW LEVEL SECURITY;
