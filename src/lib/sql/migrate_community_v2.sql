-- ============================================================
-- migrate_community_v2.sql
-- Community v2: Frames, Titles, Wiki, Weekly Votes, Points
-- ============================================================

-- ── avatar_frames ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS avatar_frames (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  css_ring    TEXT NOT NULL,
  description TEXT,
  rarity      TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common','rare','epic','legendary')),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO avatar_frames (name, css_ring, rarity, sort_order) VALUES
  ('Mặc định',   'ring-2 ring-border',                                             'common',    0),
  ('Vàng',       'ring-2 ring-amber-400',                                           'rare',      1),
  ('Xanh Điện',  'ring-2 ring-blue-500',                                            'rare',      2),
  ('Tím Huyền',  'ring-2 ring-purple-500',                                          'epic',      3),
  ('Đỏ Lửa',    'ring-2 ring-red-500 ring-offset-2 ring-offset-background',        'epic',      4),
  ('Ngọc Lục',   'ring-2 ring-emerald-400',                                         'epic',      5),
  ('Hào Quang',  'ring-2 ring-amber-300 ring-offset-2 ring-offset-background',     'legendary', 6)
ON CONFLICT DO NOTHING;

-- ── user_titles ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_titles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#6b7280',
  description TEXT,
  rarity      TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common','rare','epic','legendary')),
  requirement TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO user_titles (name, color, rarity, requirement, sort_order) VALUES
  ('Thành Viên',       '#6b7280', 'common',    NULL,               0),
  ('Người Đóng Góp',   '#3b82f6', 'rare',      '10 bài viết',      1),
  ('Wiki Master',      '#10b981', 'epic',      '5 bài wiki',       2),
  ('Top Contributor',  '#f59e0b', 'epic',      '50 bài viết',      3),
  ('Streamer',         '#ec4899', 'rare',      NULL,               4),
  ('Beta Tester',      '#06b6d4', 'rare',      NULL,               5),
  ('Nhà Vô Địch',      '#f97316', 'epic',      'Vô địch TMS',      6),
  ('Huyền Thoại',      '#8b5cf6', 'legendary', 'Admin phong',      7)
ON CONFLICT DO NOTHING;

-- ── Extend users table ───────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS selected_frame_id UUID REFERENCES avatar_frames(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS selected_title     TEXT,
  ADD COLUMN IF NOT EXISTS profile_color      TEXT NOT NULL DEFAULT '#6366f1';

-- ── user_title_unlocks ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_title_unlocks (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title_id    UUID NOT NULL REFERENCES user_titles(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, title_id)
);

-- ── contributor_points ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS contributor_points (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT,
  avatar_url    TEXT,
  posts_count   INT NOT NULL DEFAULT 0,
  replies_count INT NOT NULL DEFAULT 0,
  wiki_count    INT NOT NULL DEFAULT 0,
  total_points  INT NOT NULL DEFAULT 0,
  badge         TEXT NOT NULL DEFAULT 'member' CHECK (badge IN ('member','contributor','top_contributor','legend')),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── forum_post_votes (helpful) ───────────────────────────────
CREATE TABLE IF NOT EXISTS forum_post_votes (
  post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, user_id)
);

-- ── weekly_post_votes ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_post_votes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_key   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_key)
);

-- ── Extend forum_posts ───────────────────────────────────────
ALTER TABLE forum_posts
  ADD COLUMN IF NOT EXISTS post_type     TEXT NOT NULL DEFAULT 'text' CHECK (post_type IN ('text','video','highlight')),
  ADD COLUMN IF NOT EXISTS video_url     TEXT,
  ADD COLUMN IF NOT EXISTS helpful_count INT  NOT NULL DEFAULT 0;

-- ── wiki_articles ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wiki_articles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL DEFAULT '',
  excerpt     TEXT,
  category    TEXT NOT NULL DEFAULT 'Tổng quan',
  cover_url   TEXT,
  author_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  view_count  INT NOT NULL DEFAULT 0,
  edit_count  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── wiki_edits ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wiki_edits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id  UUID NOT NULL REFERENCES wiki_articles(id) ON DELETE CASCADE,
  editor_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  editor_name TEXT,
  summary     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_wiki_articles_category
  ON wiki_articles (category) WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_wiki_articles_updated
  ON wiki_articles (updated_at DESC) WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_weekly_post_votes_week_post
  ON weekly_post_votes (week_key, post_id);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE avatar_frames       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_titles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_title_unlocks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributor_points  ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_post_votes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_post_votes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_articles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_edits          ENABLE ROW LEVEL SECURITY;

-- avatar_frames: public read, admin write
DROP POLICY IF EXISTS "frames_public_read"  ON avatar_frames;
DROP POLICY IF EXISTS "frames_admin_all"    ON avatar_frames;
CREATE POLICY "frames_public_read" ON avatar_frames FOR SELECT USING (true);
CREATE POLICY "frames_admin_all"   ON avatar_frames FOR ALL
  USING (auth.jwt() ->> 'role' IN ('admin','super_admin'));

-- user_titles: public read, admin write
DROP POLICY IF EXISTS "titles_public_read" ON user_titles;
DROP POLICY IF EXISTS "titles_admin_all"   ON user_titles;
CREATE POLICY "titles_public_read" ON user_titles FOR SELECT USING (true);
CREATE POLICY "titles_admin_all"   ON user_titles FOR ALL
  USING (auth.jwt() ->> 'role' IN ('admin','super_admin'));

-- user_title_unlocks: read own, insert own
DROP POLICY IF EXISTS "unlocks_read_own"   ON user_title_unlocks;
DROP POLICY IF EXISTS "unlocks_insert_own" ON user_title_unlocks;
CREATE POLICY "unlocks_read_own"   ON user_title_unlocks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "unlocks_insert_own" ON user_title_unlocks FOR INSERT WITH CHECK (auth.uid() = user_id);

-- contributor_points: public read
DROP POLICY IF EXISTS "points_public_read" ON contributor_points;
CREATE POLICY "points_public_read" ON contributor_points FOR SELECT USING (true);

-- forum_post_votes: read all, insert own, delete own
DROP POLICY IF EXISTS "fpv_read"        ON forum_post_votes;
DROP POLICY IF EXISTS "fpv_insert_own"  ON forum_post_votes;
DROP POLICY IF EXISTS "fpv_delete_own"  ON forum_post_votes;
CREATE POLICY "fpv_read"       ON forum_post_votes FOR SELECT USING (true);
CREATE POLICY "fpv_insert_own" ON forum_post_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fpv_delete_own" ON forum_post_votes FOR DELETE USING (auth.uid() = user_id);

-- weekly_post_votes: read all, insert own, delete own
DROP POLICY IF EXISTS "wpv_read"        ON weekly_post_votes;
DROP POLICY IF EXISTS "wpv_insert_own"  ON weekly_post_votes;
DROP POLICY IF EXISTS "wpv_delete_own"  ON weekly_post_votes;
CREATE POLICY "wpv_read"       ON weekly_post_votes FOR SELECT USING (true);
CREATE POLICY "wpv_insert_own" ON weekly_post_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wpv_delete_own" ON weekly_post_votes FOR DELETE USING (auth.uid() = user_id);

-- wiki_articles: published = public read; author or admin can update
DROP POLICY IF EXISTS "wiki_public_read"   ON wiki_articles;
DROP POLICY IF EXISTS "wiki_author_update" ON wiki_articles;
DROP POLICY IF EXISTS "wiki_auth_insert"   ON wiki_articles;
DROP POLICY IF EXISTS "wiki_admin_all"     ON wiki_articles;
CREATE POLICY "wiki_public_read"   ON wiki_articles FOR SELECT USING (status = 'published');
CREATE POLICY "wiki_auth_insert"   ON wiki_articles FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "wiki_author_update" ON wiki_articles FOR UPDATE
  USING (auth.uid() = author_id OR auth.jwt() ->> 'role' IN ('admin','super_admin'));
CREATE POLICY "wiki_admin_all"     ON wiki_articles FOR DELETE
  USING (auth.jwt() ->> 'role' IN ('admin','super_admin'));

-- wiki_edits: public read, auth insert
DROP POLICY IF EXISTS "wikiedits_public_read" ON wiki_edits;
DROP POLICY IF EXISTS "wikiedits_auth_insert" ON wiki_edits;
CREATE POLICY "wikiedits_public_read" ON wiki_edits FOR SELECT USING (true);
CREATE POLICY "wikiedits_auth_insert" ON wiki_edits FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── Trigger: sync helpful_count ──────────────────────────────
CREATE OR REPLACE FUNCTION increment_helpful_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_posts SET helpful_count = helpful_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_posts SET helpful_count = GREATEST(helpful_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_helpful_count ON forum_post_votes;
CREATE TRIGGER trg_helpful_count
  AFTER INSERT OR DELETE ON forum_post_votes
  FOR EACH ROW EXECUTE FUNCTION increment_helpful_count();
