-- Add scheduled_at to news for deferred publishing
-- Run in Supabase Dashboard → SQL Editor

ALTER TABLE news ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- Index for cron to quickly find due articles
CREATE INDEX IF NOT EXISTS idx_news_scheduled_at ON news (scheduled_at)
  WHERE status = 'draft' AND scheduled_at IS NOT NULL;
