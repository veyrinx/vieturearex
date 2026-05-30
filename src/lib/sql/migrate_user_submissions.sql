-- User-submitted article drafts (pending admin review before publishing)
CREATE TABLE IF NOT EXISTS user_submissions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT        NOT NULL,
  excerpt       TEXT        NOT NULL,
  content       TEXT        NOT NULL,
  category      TEXT        NOT NULL DEFAULT 'Cộng đồng',
  cover_url     TEXT,
  author_name   TEXT        NOT NULL,
  author_email  TEXT        NOT NULL,
  notes         TEXT,
  status        TEXT        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_submissions_status_idx   ON user_submissions (status);
CREATE INDEX IF NOT EXISTS user_submissions_created_idx  ON user_submissions (created_at DESC);

ALTER TABLE user_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can submit
CREATE POLICY "anyone can submit article"
  ON user_submissions FOR INSERT WITH CHECK (true);

-- Only admins can read submissions
CREATE POLICY "admins read submissions"
  ON user_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('super_admin', 'admin', 'manager', 'support')
    )
  );

-- Only admins can update (review)
CREATE POLICY "admins update submissions"
  ON user_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('super_admin', 'admin', 'manager')
    )
  );
