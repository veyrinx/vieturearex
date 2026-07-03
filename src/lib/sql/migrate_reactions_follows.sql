-- News reactions (fire, heart, wow, haha, sad)
CREATE TABLE IF NOT EXISTS news_reactions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id    TEXT        NOT NULL,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction   TEXT        NOT NULL CHECK (reaction IN ('fire', 'heart', 'wow', 'haha', 'sad')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(news_id, user_id)
);

CREATE INDEX IF NOT EXISTS news_reactions_news_idx ON 
news_reactions (news_id);

ALTER TABLE news_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read reactions"
  ON news_reactions FOR SELECT USING (true);

CREATE POLICY "users manage own reactions"
  ON news_reactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- User category follows
CREATE TABLE IF NOT EXISTS user_category_follows (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category   TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, category)
);

CREATE INDEX IF NOT EXISTS user_category_follows_user_idx ON user_category_follows (user_id);

ALTER TABLE user_category_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own follows"
  ON user_category_follows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users manage own follows"
  ON user_category_follows FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
