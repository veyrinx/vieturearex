-- Add author tracking to news
ALTER TABLE news ADD COLUMN IF NOT EXISTS created_by_name TEXT;

-- Add last_seen_at for admin presence tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS users_last_seen_at_idx ON users (last_seen_at DESC) WHERE last_seen_at IS NOT NULL;
