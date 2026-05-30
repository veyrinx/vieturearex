-- Community forum posts
CREATE TABLE IF NOT EXISTS forum_posts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT        NOT NULL CHECK (length(title) BETWEEN 5 AND 200),
  content      TEXT        NOT NULL CHECK (length(content) BETWEEN 20 AND 20000),
  category     TEXT        NOT NULL DEFAULT 'Thảo luận',
  user_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name TEXT        NOT NULL,
  avatar_url   TEXT,
  view_count   INT         NOT NULL DEFAULT 0,
  reply_count  INT         NOT NULL DEFAULT 0,
  is_pinned    BOOLEAN     NOT NULL DEFAULT false,
  is_locked    BOOLEAN     NOT NULL DEFAULT false,
  status       TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS forum_posts_category_idx    ON forum_posts (category);
CREATE INDEX IF NOT EXISTS forum_posts_created_idx     ON forum_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS forum_posts_user_idx        ON forum_posts (user_id);

ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads active forum posts"
  ON forum_posts FOR SELECT USING (status = 'active');

CREATE POLICY "users create forum posts"
  ON forum_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admins manage forum posts"
  ON forum_posts FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
            AND users.role IN ('super_admin','admin','manager','support'))
  );

-- Forum replies (flat + optional parent for threading)
CREATE TABLE IF NOT EXISTS forum_replies (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      UUID        NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name TEXT        NOT NULL,
  avatar_url   TEXT,
  content      TEXT        NOT NULL CHECK (length(content) BETWEEN 2 AND 3000),
  parent_id    UUID        REFERENCES forum_replies(id) ON DELETE CASCADE,
  status       TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS forum_replies_post_idx      ON forum_replies (post_id, created_at);
CREATE INDEX IF NOT EXISTS forum_replies_user_idx      ON forum_replies (user_id);

ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads active replies"
  ON forum_replies FOR SELECT USING (status = 'active');

CREATE POLICY "users create replies"
  ON forum_replies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admins manage replies"
  ON forum_replies FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
            AND users.role IN ('super_admin','admin','manager','support'))
  );

-- Auto-increment reply_count on forum_posts
CREATE OR REPLACE FUNCTION increment_forum_reply_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE forum_posts SET reply_count = reply_count + 1, updated_at = now()
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_forum_reply_count
  AFTER INSERT ON forum_replies
  FOR EACH ROW EXECUTE FUNCTION increment_forum_reply_count();
