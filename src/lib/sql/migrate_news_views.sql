-- Add view count tracking to news articles
ALTER TABLE news
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

-- Atomic increment helper (mirrors increment_event_views)
CREATE OR REPLACE FUNCTION increment_news_views(news_id UUID)
RETURNS void LANGUAGE sql AS $$
  UPDATE news SET view_count = view_count + 1 WHERE id = news_id;
$$;

-- Allow public (anon) to call the increment function
GRANT EXECUTE ON FUNCTION increment_news_views(UUID) TO anon, authenticated;
