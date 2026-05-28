-- In-app notification inbox for users
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  body        TEXT,
  entity_type TEXT,
  entity_id   TEXT,
  entity_url  TEXT,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx       ON notifications (user_id) WHERE read_at IS NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read and mark their own notifications
CREATE POLICY "users read own notifications"
  ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users update own notifications"
  ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Server/admin inserts (service_role bypasses RLS, but this covers anon fallback)
CREATE POLICY "service insert notifications"
  ON notifications FOR INSERT WITH CHECK (true);

-- Auto-prune: keep latest 100 per user (run periodically or via trigger)
-- Alternatively, add a cron: DELETE FROM notifications WHERE id NOT IN (SELECT id FROM notifications ORDER BY created_at DESC LIMIT 100) AND user_id = ...
