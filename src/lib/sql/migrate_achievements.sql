-- Achievement system
CREATE TABLE IF NOT EXISTS user_achievements (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement TEXT        NOT NULL,
  earned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement)
);

CREATE INDEX IF NOT EXISTS user_achievements_user_idx ON user_achievements (user_id);

-- Only owners can see their own achievements; public profiles read via service role
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);
