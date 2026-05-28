-- Extended user profile columns
-- Run this in Supabase SQL editor (once per environment)

-- Verification flag (set by IT/admin)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified  BOOLEAN NOT NULL DEFAULT false;

-- Profile fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio          TEXT    CHECK (char_length(bio) <= 300);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone        TEXT    CHECK (char_length(phone) <= 20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_url   TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_email TEXT   CHECK (char_length(contact_email) <= 120);
ALTER TABLE users ADD COLUMN IF NOT EXISTS ff_id        TEXT    CHECK (ff_id ~ '^\d{6,12}$');
ALTER TABLE users ADD COLUMN IF NOT EXISTS game_profiles JSONB  NOT NULL DEFAULT '[]'::jsonb;

-- Social / link columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_url  TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tiktok_url    TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS youtube_url   TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS website_url   TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_url   TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS twitch_url    TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter_url   TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_url  TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS zalo_url      TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS threads_url   TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_url    TEXT;

-- Fast look-up for team page (show_in_team filter + verified badge)
CREATE INDEX IF NOT EXISTS users_team_idx ON users (show_in_team) WHERE show_in_team = true;
