-- ============================================================
-- Login streak tracking for daily login achievements
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS login_streak    INTEGER   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_login_date DATE      DEFAULT NULL;

-- Index for streak updates
CREATE INDEX IF NOT EXISTS users_last_login_date_idx ON users (last_login_date);
