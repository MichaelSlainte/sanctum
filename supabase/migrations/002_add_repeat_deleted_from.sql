-- Add columns for recurring event exception handling
ALTER TABLE events ADD COLUMN IF NOT EXISTS repeat_deleted_from date;
ALTER TABLE events ADD COLUMN IF NOT EXISTS exceptions JSONB DEFAULT '[]';
