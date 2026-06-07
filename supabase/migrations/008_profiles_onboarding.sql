-- Add onboarding_completed flag to profiles for the new-user onboarding flow.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed
  boolean DEFAULT false;
