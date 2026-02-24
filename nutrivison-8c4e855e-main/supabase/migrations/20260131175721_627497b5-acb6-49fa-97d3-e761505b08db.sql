-- Add location and profile photo columns to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS profile_photo_url text;