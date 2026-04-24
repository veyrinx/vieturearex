-- Member points & rank
ALTER TABLE users ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rank   TEXT    NOT NULL DEFAULT 'Bronze';

-- Team visibility flag
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_in_team BOOLEAN NOT NULL DEFAULT false;

-- Fast lookup for leaderboard
CREATE INDEX IF NOT EXISTS users_points_idx ON users (points DESC);

-- Atomic point increment helper (callable from server-only routes)
CREATE OR REPLACE FUNCTION increment_user_points(uid UUID, amount INTEGER)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE users SET points = points + amount WHERE id = uid;
$$;
REVOKE EXECUTE ON FUNCTION increment_user_points(UUID, INTEGER) FROM anon;
GRANT  EXECUTE ON FUNCTION increment_user_points(UUID, INTEGER) TO authenticated;
