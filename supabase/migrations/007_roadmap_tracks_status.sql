-- Add status column to roadmap_tracks for archive functionality
ALTER TABLE roadmap_tracks 
ADD COLUMN IF NOT EXISTS status text DEFAULT NULL;
