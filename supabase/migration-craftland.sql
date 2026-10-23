-- ============================================================
-- Arex Network — Craftland Community Platform
--
-- Thư viện bản đồ Craftland, hồ sơ creator, xác minh creator, analytics
-- chống trùng, Craftland Academy và nhật ký kiểm duyệt append-only.
--
-- Nguyên tắc:
--   • Mọi thao tác ghi đi qua API server (service role). RLS bật trên mọi
--     bảng; client anon/authenticated chỉ được ĐỌC phần công khai.
--   • Bộ đếm (lượt xem, lưu, đánh giá...) chỉ do hàm/trigger trong DB cập
--     nhật — không có đường nào để client gửi số liệu tổng hợp.
--   • Không lưu IP thô của khách: visitor_hash = SHA-256(ip|ua|muối theo ngày)
--     tính ở server.
--
-- Chạy lại nhiều lần an toàn (idempotent).
-- ============================================================

-- ── 1. Creator ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.craftland_creators (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  cover_url TEXT,
  -- [{ "label": "YouTube", "url": "https://..." }] — creator tự khai báo
  social_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  can_publish BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  suspended_reason TEXT,
  verification_status TEXT NOT NULL DEFAULT 'none'
    CHECK (verification_status IN ('none', 'pending', 'verified', 'rejected', 'revoked')),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  follower_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT craftland_creators_username_valid CHECK (username ~ '^[a-z0-9_]{3,24}$'),
  CONSTRAINT craftland_creators_display_name_len CHECK (char_length(display_name) BETWEEN 2 AND 60),
  CONSTRAINT craftland_creators_bio_len CHECK (char_length(bio) <= 1000)
);
CREATE UNIQUE INDEX IF NOT EXISTS craftland_creators_username_idx ON public.craftland_creators (username);
CREATE INDEX IF NOT EXISTS craftland_creators_verified_idx ON public.craftland_creators (verification_status);

-- ── 2. Yêu cầu xác minh creator ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.craftland_verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.craftland_creators(user_id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  about TEXT NOT NULL,
  public_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'needs_info', 'approved', 'rejected', 'withdrawn')),
  -- Ghi chú nội bộ của người kiểm tra (admin) trước khi super admin quyết
  review_notes TEXT,
  decided_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  decision_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS craftland_verif_status_idx ON public.craftland_verification_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS craftland_verif_creator_idx ON public.craftland_verification_requests (creator_id, created_at DESC);
-- Mỗi creator chỉ có tối đa một yêu cầu đang mở
CREATE UNIQUE INDEX IF NOT EXISTS craftland_verif_one_open_idx
  ON public.craftland_verification_requests (creator_id) WHERE status IN ('pending', 'needs_info');

-- ── 3. Thể loại ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.craftland_categories (
  slug TEXT PRIMARY KEY CHECK (slug ~ '^[a-z0-9-]{2,32}$'),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.craftland_categories (slug, name, sort_order) VALUES
  ('pvp', 'PvP', 10),
  ('dau-doi', 'Đấu đội', 20),
  ('sinh-ton', 'Sinh tồn', 30),
  ('parkour', 'Parkour', 40),
  ('luyen-tap', 'Luyện tập', 50),
  ('minigame', 'Minigame', 60),
  ('nhap-vai', 'Nhập vai', 70),
  ('khac', 'Khác', 999)
ON CONFLICT (slug) DO NOTHING;

-- ── 4. Bản đồ ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.craftland_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  creator_id UUID NOT NULL REFERENCES public.craftland_creators(user_id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  category_slug TEXT NOT NULL DEFAULT 'khac' REFERENCES public.craftland_categories(slug) ON UPDATE CASCADE,
  tags TEXT[] NOT NULL DEFAULT '{}',
  -- Mã map do creator cung cấp. ArexNetwork không tự sinh mã.
  map_code TEXT,
  -- Nền tảng creator khai báo; chỉ hiển thị khi moderator đã xác nhận
  platforms TEXT[] NOT NULL DEFAULT '{}',
  platforms_verified BOOLEAN NOT NULL DEFAULT FALSE,
  cover_url TEXT,
  gallery JSONB NOT NULL DEFAULT '[]'::jsonb,
  video_url TEXT,
  how_to_play TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending', 'published', 'rejected', 'hidden', 'archived', 'removed')),
  -- Phản hồi kiểm duyệt gần nhất, creator xem được
  moderation_note TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  featured_rank INTEGER NOT NULL DEFAULT 0,
  is_editor_pick BOOLEAN NOT NULL DEFAULT FALSE,
  version INTEGER NOT NULL DEFAULT 1,
  -- Bộ đếm — chỉ trigger/hàm DB cập nhật
  view_count INTEGER NOT NULL DEFAULT 0,
  unique_view_count INTEGER NOT NULL DEFAULT 0,
  copy_count INTEGER NOT NULL DEFAULT 0,
  share_count INTEGER NOT NULL DEFAULT 0,
  guide_open_count INTEGER NOT NULL DEFAULT 0,
  favorite_count INTEGER NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  rating_sum INTEGER NOT NULL DEFAULT 0,
  rating_avg NUMERIC(3, 2) GENERATED ALWAYS AS (
    CASE WHEN rating_count > 0 THEN round(rating_sum::numeric / rating_count, 2) ELSE 0 END
  ) STORED,
  report_count INTEGER NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT craftland_maps_slug_valid CHECK (slug ~ '^[a-z0-9-]{3,80}$'),
  CONSTRAINT craftland_maps_title_len CHECK (char_length(title) BETWEEN 3 AND 120),
  CONSTRAINT craftland_maps_summary_len CHECK (char_length(summary) <= 280),
  CONSTRAINT craftland_maps_desc_len CHECK (char_length(description) <= 20000),
  CONSTRAINT craftland_maps_code_len CHECK (map_code IS NULL OR char_length(map_code) BETWEEN 3 AND 64),
  CONSTRAINT craftland_maps_tags_len CHECK (cardinality(tags) <= 10),
  CONSTRAINT craftland_maps_platforms_valid CHECK (platforms <@ ARRAY['mobile', 'pc']::text[])
);
CREATE UNIQUE INDEX IF NOT EXISTS craftland_maps_slug_idx ON public.craftland_maps (slug);
CREATE INDEX IF NOT EXISTS craftland_maps_creator_idx ON public.craftland_maps (creator_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS craftland_maps_status_idx ON public.craftland_maps (status, published_at DESC);
CREATE INDEX IF NOT EXISTS craftland_maps_category_idx ON public.craftland_maps (category_slug) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS craftland_maps_views_idx ON public.craftland_maps (view_count DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS craftland_maps_tags_idx ON public.craftland_maps USING GIN (tags);
CREATE INDEX IF NOT EXISTS craftland_maps_code_idx ON public.craftland_maps (lower(map_code)) WHERE map_code IS NOT NULL;

-- ── 5. Lịch sử phiên bản bản đồ ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.craftland_map_versions (
  id BIGSERIAL PRIMARY KEY,
  map_id UUID NOT NULL REFERENCES public.craftland_maps(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  editor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS craftland_map_versions_map_idx ON public.craftland_map_versions (map_id, version DESC);

-- ── 6. Sự kiện analytics (raw, có hạn lưu) ────────────────────
CREATE TABLE IF NOT EXISTS public.craftland_map_events (
  id BIGSERIAL PRIMARY KEY,
  map_id UUID NOT NULL REFERENCES public.craftland_maps(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'copy_code', 'share', 'guide_open')),
  visitor_hash TEXT NOT NULL,
  -- Khoá chống trùng: cùng khách + cùng loại sự kiện + cùng cửa sổ thời gian
  dedupe_key TEXT NOT NULL,
  day DATE NOT NULL,
  source TEXT NOT NULL DEFAULT 'direct',
  referrer_host TEXT,
  device TEXT,
  browser TEXT,
  country TEXT,
  search_query TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS craftland_map_events_dedupe_idx ON public.craftland_map_events (map_id, dedupe_key);
CREATE INDEX IF NOT EXISTS craftland_map_events_map_time_idx ON public.craftland_map_events (map_id, created_at DESC);
CREATE INDEX IF NOT EXISTS craftland_map_events_visitor_day_idx ON public.craftland_map_events (map_id, visitor_hash, event_type, day);
CREATE INDEX IF NOT EXISTS craftland_map_events_created_idx ON public.craftland_map_events (created_at);

-- ── 7. Tổng hợp theo ngày ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.craftland_map_daily (
  map_id UUID NOT NULL REFERENCES public.craftland_maps(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  copies INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  guide_opens INTEGER NOT NULL DEFAULT 0,
  favorites INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (map_id, day)
);
CREATE INDEX IF NOT EXISTS craftland_map_daily_day_idx ON public.craftland_map_daily (day);

-- Sự kiện bị loại (bot, trùng, chủ map tự xem...) — chỉ đếm theo ngày
CREATE TABLE IF NOT EXISTS public.craftland_event_rejections (
  day DATE NOT NULL,
  reason TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, reason)
);

-- ── 8. Tương tác: lưu, đánh giá, báo cáo, theo dõi ─────────────
CREATE TABLE IF NOT EXISTS public.craftland_favorites (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  map_id UUID NOT NULL REFERENCES public.craftland_maps(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, map_id)
);
CREATE INDEX IF NOT EXISTS craftland_favorites_map_idx ON public.craftland_favorites (map_id);

CREATE TABLE IF NOT EXISTS public.craftland_ratings (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  map_id UUID NOT NULL REFERENCES public.craftland_maps(id) ON DELETE CASCADE,
  score SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, map_id)
);
CREATE INDEX IF NOT EXISTS craftland_ratings_map_idx ON public.craftland_ratings (map_id);

CREATE TABLE IF NOT EXISTS public.craftland_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES public.craftland_maps(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (reason IN ('wrong_info', 'wrong_code', 'duplicate', 'stolen', 'inappropriate', 'other')),
  details TEXT NOT NULL DEFAULT '' CHECK (char_length(details) <= 2000),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  handled_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  handled_at TIMESTAMPTZ,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS craftland_reports_status_idx ON public.craftland_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS craftland_reports_map_idx ON public.craftland_reports (map_id);
-- Một người chỉ có một báo cáo đang mở cho mỗi bản đồ
CREATE UNIQUE INDEX IF NOT EXISTS craftland_reports_one_open_idx
  ON public.craftland_reports (map_id, reporter_id) WHERE status = 'open' AND reporter_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.craftland_follows (
  follower_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.craftland_creators(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, creator_id),
  CONSTRAINT craftland_follows_not_self CHECK (follower_id <> creator_id)
);
CREATE INDEX IF NOT EXISTS craftland_follows_creator_idx ON public.craftland_follows (creator_id);

-- ── 9. Nhật ký kiểm duyệt (append-only) ───────────────────────
CREATE TABLE IF NOT EXISTS public.craftland_moderation_actions (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID NOT NULL,
  actor_email TEXT,
  target_type TEXT NOT NULL CHECK (target_type IN ('map', 'creator', 'verification', 'report', 'category', 'academy')),
  target_id TEXT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  outcome TEXT NOT NULL DEFAULT 'success' CHECK (outcome IN ('success', 'failure')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS craftland_mod_target_idx ON public.craftland_moderation_actions (target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS craftland_mod_actor_idx ON public.craftland_moderation_actions (actor_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.craftland_block_audit_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'craftland_moderation_actions là bảng append-only: không được sửa hoặc xoá.';
END;
$$;
DROP TRIGGER IF EXISTS trg_craftland_mod_append_only ON public.craftland_moderation_actions;
CREATE TRIGGER trg_craftland_mod_append_only
  BEFORE UPDATE OR DELETE ON public.craftland_moderation_actions
  FOR EACH ROW EXECUTE FUNCTION public.craftland_block_audit_mutation();

-- ── 10. Craftland Academy ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.craftland_academy_categories (
  slug TEXT PRIMARY KEY CHECK (slug ~ '^[a-z0-9-]{2,48}$'),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

INSERT INTO public.craftland_academy_categories (slug, name, sort_order) VALUES
  ('bat-dau-mobile', 'Bắt đầu với Craftland Mobile', 10),
  ('studio-pc', 'Làm quen Craftland Studio PC', 20),
  ('du-an-cua-so', 'Quản lý dự án và cửa sổ chỉnh sửa', 30),
  ('canh-dia-hinh', 'Cảnh, màn chơi và địa hình', 40),
  ('vat-the-thuc-the', 'Vật thể, thực thể, thành phần và thuộc tính', 50),
  ('nguoi-choi-chien-dau', 'Thiết lập người chơi, đội và cơ chế chiến đấu', 60),
  ('hud', 'Hệ thống giao diện HUD', 70),
  ('scripting', 'Scripting và Visual Scripting', 80),
  ('api-std', 'API và thư viện STD', 90),
  ('module-su-kien', 'Module, sự kiện, kiểu dữ liệu và enum', 100),
  ('quy-trinh-choi', 'Quy trình chơi, vòng đấu và hồi sinh', 110),
  ('luu-tru-du-lieu', 'Lưu trữ dữ liệu và kết quả trận đấu', 120),
  ('toi-uu-hoa', 'Tối ưu hóa bản đồ', 130),
  ('kiem-thu', 'Kiểm thử và xử lý lỗi', 140),
  ('xuat-ban', 'Xuất bản, cập nhật và quản lý bản đồ', 150),
  ('du-an-mau', 'Các dự án mẫu có chú thích', 160)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.craftland_academy_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL CHECK (slug ~ '^[a-z0-9-]{3,100}$'),
  category_slug TEXT NOT NULL REFERENCES public.craftland_academy_categories(slug) ON UPDATE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 160),
  excerpt TEXT NOT NULL DEFAULT '',
  -- HTML đã qua sanitize ở server
  body TEXT NOT NULL DEFAULT '',
  -- Bản text thuần để tìm kiếm toàn văn
  body_text TEXT NOT NULL DEFAULT '',
  platform TEXT NOT NULL DEFAULT 'both' CHECK (platform IN ('pc', 'mobile', 'both')),
  -- [{ "label": "...", "url": "https://..." }] — dẫn nguồn tài liệu chính thức
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Cảnh báo API cũ / không tương thích (chỉ ghi khi có căn cứ)
  compat_warning TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS craftland_academy_slug_idx ON public.craftland_academy_articles (slug);
CREATE INDEX IF NOT EXISTS craftland_academy_cat_idx ON public.craftland_academy_articles (category_slug, sort_order) WHERE status = 'published';

CREATE TABLE IF NOT EXISTS public.craftland_academy_progress (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.craftland_academy_articles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ,
  bookmarked BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, article_id)
);

-- ── 11. Trigger bộ đếm ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.craftland_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_craftland_creators_touch ON public.craftland_creators;
CREATE TRIGGER trg_craftland_creators_touch BEFORE UPDATE ON public.craftland_creators
  FOR EACH ROW EXECUTE FUNCTION public.craftland_touch_updated_at();
DROP TRIGGER IF EXISTS trg_craftland_verif_touch ON public.craftland_verification_requests;
CREATE TRIGGER trg_craftland_verif_touch BEFORE UPDATE ON public.craftland_verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.craftland_touch_updated_at();
DROP TRIGGER IF EXISTS trg_craftland_academy_touch ON public.craftland_academy_articles;
CREATE TRIGGER trg_craftland_academy_touch BEFORE UPDATE ON public.craftland_academy_articles
  FOR EACH ROW EXECUTE FUNCTION public.craftland_touch_updated_at();

-- updated_at của bản đồ chỉ đổi khi NỘI DUNG đổi, không phải khi bộ đếm nhảy
CREATE OR REPLACE FUNCTION public.craftland_maps_touch()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW.title, NEW.summary, NEW.description, NEW.category_slug, NEW.tags, NEW.map_code,
         NEW.platforms, NEW.cover_url, NEW.gallery, NEW.video_url, NEW.how_to_play, NEW.status)
     IS DISTINCT FROM
     ROW(OLD.title, OLD.summary, OLD.description, OLD.category_slug, OLD.tags, OLD.map_code,
         OLD.platforms, OLD.cover_url, OLD.gallery, OLD.video_url, OLD.how_to_play, OLD.status) THEN
    NEW.updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_craftland_maps_touch ON public.craftland_maps;
CREATE TRIGGER trg_craftland_maps_touch BEFORE UPDATE ON public.craftland_maps
  FOR EACH ROW EXECUTE FUNCTION public.craftland_maps_touch();

CREATE OR REPLACE FUNCTION public.craftland_vn_today()
RETURNS DATE LANGUAGE sql STABLE AS $$
  SELECT (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
$$;

CREATE OR REPLACE FUNCTION public.craftland_favorites_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE craftland_maps SET favorite_count = favorite_count + 1 WHERE id = NEW.map_id;
    INSERT INTO craftland_map_daily (map_id, day, favorites) VALUES (NEW.map_id, craftland_vn_today(), 1)
      ON CONFLICT (map_id, day) DO UPDATE SET favorites = craftland_map_daily.favorites + 1;
    RETURN NEW;
  ELSE
    UPDATE craftland_maps SET favorite_count = GREATEST(favorite_count - 1, 0) WHERE id = OLD.map_id;
    RETURN OLD;
  END IF;
END;
$$;
DROP TRIGGER IF EXISTS trg_craftland_favorites_count ON public.craftland_favorites;
CREATE TRIGGER trg_craftland_favorites_count AFTER INSERT OR DELETE ON public.craftland_favorites
  FOR EACH ROW EXECUTE FUNCTION public.craftland_favorites_count();

CREATE OR REPLACE FUNCTION public.craftland_ratings_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE craftland_maps SET rating_count = rating_count + 1, rating_sum = rating_sum + NEW.score WHERE id = NEW.map_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE craftland_maps SET rating_sum = rating_sum - OLD.score + NEW.score WHERE id = NEW.map_id;
    RETURN NEW;
  ELSE
    UPDATE craftland_maps SET rating_count = GREATEST(rating_count - 1, 0),
      rating_sum = GREATEST(rating_sum - OLD.score, 0) WHERE id = OLD.map_id;
    RETURN OLD;
  END IF;
END;
$$;
DROP TRIGGER IF EXISTS trg_craftland_ratings_count ON public.craftland_ratings;
CREATE TRIGGER trg_craftland_ratings_count AFTER INSERT OR UPDATE OR DELETE ON public.craftland_ratings
  FOR EACH ROW EXECUTE FUNCTION public.craftland_ratings_count();

CREATE OR REPLACE FUNCTION public.craftland_reports_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE craftland_maps SET report_count = report_count + 1 WHERE id = NEW.map_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_craftland_reports_count ON public.craftland_reports;
CREATE TRIGGER trg_craftland_reports_count AFTER INSERT ON public.craftland_reports
  FOR EACH ROW EXECUTE FUNCTION public.craftland_reports_count();

CREATE OR REPLACE FUNCTION public.craftland_follows_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE craftland_creators SET follower_count = follower_count + 1 WHERE user_id = NEW.creator_id;
    RETURN NEW;
  ELSE
    UPDATE craftland_creators SET follower_count = GREATEST(follower_count - 1, 0) WHERE user_id = OLD.creator_id;
    RETURN OLD;
  END IF;
END;
$$;
DROP TRIGGER IF EXISTS trg_craftland_follows_count ON public.craftland_follows;
CREATE TRIGGER trg_craftland_follows_count AFTER INSERT OR DELETE ON public.craftland_follows
  FOR EACH ROW EXECUTE FUNCTION public.craftland_follows_count();

-- ── 12. Ghi sự kiện analytics (chống trùng trong DB) ──────────
-- Trả về TRUE nếu sự kiện được tính, FALSE nếu bị loại. Lý do loại được cộng
-- vào craftland_event_rejections. Chỉ gọi từ server (service role).
CREATE OR REPLACE FUNCTION public.craftland_bump_rejection(p_reason TEXT)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO craftland_event_rejections (day, reason, count) VALUES (craftland_vn_today(), p_reason, 1)
  ON CONFLICT (day, reason) DO UPDATE SET count = craftland_event_rejections.count + 1;
$$;

CREATE OR REPLACE FUNCTION public.craftland_record_event(
  p_map_id UUID,
  p_event_type TEXT,
  p_visitor_hash TEXT,
  p_actor_user_id UUID,
  p_source TEXT,
  p_referrer_host TEXT,
  p_device TEXT,
  p_browser TEXT,
  p_country TEXT,
  p_search_query TEXT,
  p_window_minutes INTEGER DEFAULT 30
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator UUID;
  v_status TEXT;
  v_day DATE := craftland_vn_today();
  v_bucket BIGINT;
  v_first_today BOOLEAN;
  v_rows INTEGER;
BEGIN
  IF p_event_type NOT IN ('view', 'copy_code', 'share', 'guide_open') THEN
    PERFORM craftland_bump_rejection('invalid_type');
    RETURN FALSE;
  END IF;

  SELECT creator_id, status INTO v_creator, v_status FROM craftland_maps WHERE id = p_map_id;
  IF v_creator IS NULL OR v_status <> 'published' THEN
    PERFORM craftland_bump_rejection('not_published');
    RETURN FALSE;
  END IF;

  -- Chủ bản đồ tự xem / tự sao chép không được tính
  IF p_actor_user_id IS NOT NULL AND p_actor_user_id = v_creator THEN
    PERFORM craftland_bump_rejection('owner');
    RETURN FALSE;
  END IF;

  v_bucket := floor(extract(epoch FROM NOW()) / (GREATEST(p_window_minutes, 1) * 60));

  SELECT NOT EXISTS (
    SELECT 1 FROM craftland_map_events
    WHERE map_id = p_map_id AND visitor_hash = p_visitor_hash AND event_type = p_event_type AND day = v_day
  ) INTO v_first_today;

  INSERT INTO craftland_map_events (
    map_id, event_type, visitor_hash, dedupe_key, day, source, referrer_host, device, browser, country, search_query
  ) VALUES (
    p_map_id, p_event_type, p_visitor_hash, p_event_type || ':' || p_visitor_hash || ':' || v_bucket, v_day,
    COALESCE(NULLIF(p_source, ''), 'direct'), NULLIF(p_referrer_host, ''), NULLIF(p_device, ''),
    NULLIF(p_browser, ''), NULLIF(p_country, ''), NULLIF(left(p_search_query, 80), '')
  )
  ON CONFLICT (map_id, dedupe_key) DO NOTHING;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    PERFORM craftland_bump_rejection('duplicate');
    RETURN FALSE;
  END IF;

  IF p_event_type = 'view' THEN
    UPDATE craftland_maps SET view_count = view_count + 1,
      unique_view_count = unique_view_count + CASE WHEN v_first_today THEN 1 ELSE 0 END
      WHERE id = p_map_id;
    INSERT INTO craftland_map_daily (map_id, day, views, unique_visitors)
      VALUES (p_map_id, v_day, 1, CASE WHEN v_first_today THEN 1 ELSE 0 END)
      ON CONFLICT (map_id, day) DO UPDATE SET
        views = craftland_map_daily.views + 1,
        unique_visitors = craftland_map_daily.unique_visitors + CASE WHEN v_first_today THEN 1 ELSE 0 END;
  ELSIF p_event_type = 'copy_code' THEN
    UPDATE craftland_maps SET copy_count = copy_count + 1 WHERE id = p_map_id;
    INSERT INTO craftland_map_daily (map_id, day, copies) VALUES (p_map_id, v_day, 1)
      ON CONFLICT (map_id, day) DO UPDATE SET copies = craftland_map_daily.copies + 1;
  ELSIF p_event_type = 'share' THEN
    UPDATE craftland_maps SET share_count = share_count + 1 WHERE id = p_map_id;
    INSERT INTO craftland_map_daily (map_id, day, shares) VALUES (p_map_id, v_day, 1)
      ON CONFLICT (map_id, day) DO UPDATE SET shares = craftland_map_daily.shares + 1;
  ELSE
    UPDATE craftland_maps SET guide_open_count = guide_open_count + 1 WHERE id = p_map_id;
    INSERT INTO craftland_map_daily (map_id, day, guide_opens) VALUES (p_map_id, v_day, 1)
      ON CONFLICT (map_id, day) DO UPDATE SET guide_opens = craftland_map_daily.guide_opens + 1;
  END IF;

  RETURN TRUE;
END;
$$;

-- Phân rã lượt xem theo một chiều (nguồn, thiết bị...) cho tập bản đồ.
-- Chiều được whitelist — không ghép chuỗi SQL từ input.
CREATE OR REPLACE FUNCTION public.craftland_view_breakdown(
  p_map_ids UUID[],
  p_from TIMESTAMPTZ,
  p_dimension TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (key TEXT, total BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT k AS key, COUNT(*) AS total FROM (
    SELECT CASE p_dimension
      WHEN 'source' THEN source
      WHEN 'device' THEN device
      WHEN 'browser' THEN browser
      WHEN 'country' THEN country
      WHEN 'referrer' THEN referrer_host
      WHEN 'search' THEN search_query
    END AS k
    FROM craftland_map_events
    WHERE map_id = ANY(p_map_ids) AND event_type = 'view' AND created_at >= p_from
  ) t
  WHERE k IS NOT NULL
  GROUP BY k
  ORDER BY total DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 50);
$$;

-- Dọn sự kiện raw quá hạn lưu. Bảng daily giữ nguyên nên biểu đồ không mất.
CREATE OR REPLACE FUNCTION public.craftland_purge_events(p_keep_days INTEGER DEFAULT 180)
RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_deleted BIGINT;
BEGIN
  DELETE FROM craftland_map_events WHERE created_at < NOW() - make_interval(days => GREATEST(p_keep_days, 30));
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.craftland_record_event(UUID, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.craftland_view_breakdown(UUID[], TIMESTAMPTZ, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.craftland_purge_events(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.craftland_bump_rejection(TEXT) FROM PUBLIC, anon, authenticated;

-- ── 13. RLS ───────────────────────────────────────────────────
-- Đọc công khai chỉ phần đã xuất bản; mọi ghi đi qua service role.
ALTER TABLE public.craftland_creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.craftland_verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.craftland_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.craftland_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.craftland_map_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.craftland_map_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.craftland_map_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.craftland_event_rejections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.craftland_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.craftland_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.craftland_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.craftland_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.craftland_moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.craftland_academy_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.craftland_academy_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.craftland_academy_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "craftland creators public read" ON public.craftland_creators;
CREATE POLICY "craftland creators public read" ON public.craftland_creators
  FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "craftland categories public read" ON public.craftland_categories;
CREATE POLICY "craftland categories public read" ON public.craftland_categories
  FOR SELECT USING (is_active);

DROP POLICY IF EXISTS "craftland maps public read" ON public.craftland_maps;
CREATE POLICY "craftland maps public read" ON public.craftland_maps
  FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "craftland academy categories public read" ON public.craftland_academy_categories;
CREATE POLICY "craftland academy categories public read" ON public.craftland_academy_categories
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "craftland academy public read" ON public.craftland_academy_articles;
CREATE POLICY "craftland academy public read" ON public.craftland_academy_articles
  FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "craftland favorites own read" ON public.craftland_favorites;
CREATE POLICY "craftland favorites own read" ON public.craftland_favorites
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "craftland progress own read" ON public.craftland_academy_progress;
CREATE POLICY "craftland progress own read" ON public.craftland_academy_progress
  FOR SELECT USING (auth.uid() = user_id);
-- Các bảng còn lại không có policy → anon/authenticated không đọc/ghi được.

-- ── 14. Bucket ảnh ────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('craftland', 'craftland', TRUE, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;
