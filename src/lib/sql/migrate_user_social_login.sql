-- Social & bio fields on users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS youtube_url TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT;

-- Login history table (30-day retention)
CREATE TABLE IF NOT EXISTS login_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  method TEXT DEFAULT 'password',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS login_logs_user_id_idx ON login_logs (user_id, created_at DESC);

ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;

-- Users read their own logs; service role writes
CREATE POLICY IF NOT EXISTS "Own login logs readable" ON login_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Service role inserts login_logs" ON login_logs
  FOR INSERT WITH CHECK (true);
