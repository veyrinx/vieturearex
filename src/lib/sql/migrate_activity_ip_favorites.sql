-- Add IP column to activity logs
ALTER TABLE admin_activity_logs ADD COLUMN IF NOT EXISTS ip TEXT;

-- RLS: allow authenticated admins to read activity logs
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Admins read activity logs" ON admin_activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid()
      AND users.role IN ('super_admin','admin','it','manager','support')
    )
  );
CREATE POLICY IF NOT EXISTS "Service role all on activity logs" ON admin_activity_logs
  FOR ALL USING (true) WITH CHECK (true);

-- User favorites table
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('news','event')),
  item_id TEXT NOT NULL,
  item_title TEXT,
  item_image TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS user_favorites_user_idx ON user_favorites (user_id, created_at DESC);

ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Own favorites" ON user_favorites
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
