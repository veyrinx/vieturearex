-- ============================================================
-- Admin features: system_announcements
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS system_announcements (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title       text NOT NULL,
  message     text NOT NULL,
  type        text NOT NULL DEFAULT 'info', -- 'info' | 'warning' | 'success' | 'error'
  is_active   boolean DEFAULT true,
  starts_at   timestamptz DEFAULT now(),
  ends_at     timestamptz DEFAULT NULL,
  created_by  text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE system_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read active announcements" ON system_announcements
  FOR SELECT USING (
    is_active = true
    AND starts_at <= now()
    AND (ends_at IS NULL OR ends_at > now())
  );
