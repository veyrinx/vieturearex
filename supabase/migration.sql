-- ============================================================
-- AREX – Migration (chỉ chạy phần còn thiếu)
-- Paste vào Supabase SQL Editor → Run
-- ============================================================

-- ============================================================
-- 1. FIX ROLE CONSTRAINT (thêm role 'it')
-- ============================================================
DO $$
BEGIN
  ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
  ALTER TABLE public.users ADD CONSTRAINT users_role_check
    CHECK (role IN ('super_admin', 'admin', 'it', 'manager', 'support', 'user'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Bỏ qua fix role constraint: %', SQLERRM;
END;
$$;

-- ============================================================
-- 2. THÊM CỘT is_banned, is_verified, avatar_url NẾU CHƯA CÓ
-- ============================================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_banned  boolean NOT NULL DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url  text;

-- ============================================================
-- 3. TẠO BẢNG news_ratings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.news_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  title text NOT NULL,
  anonymous_id text NOT NULL,
  stars integer NOT NULL CHECK (stars BETWEEN 1 AND 5),
  review text,
  admin_liked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(slug, anonymous_id)
);

-- ============================================================
-- 4. TẠO BẢNG rating_likes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rating_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_id uuid NOT NULL REFERENCES public.news_ratings(id) ON DELETE CASCADE,
  anonymous_id text NOT NULL,
  type text NOT NULL CHECK (type IN ('like', 'unlike')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(rating_id, anonymous_id)
);

-- ============================================================
-- 5. TẠO BẢNG rating_replies
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rating_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_id uuid NOT NULL REFERENCES public.news_ratings(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS news_ratings_slug_idx ON public.news_ratings(slug);
CREATE INDEX IF NOT EXISTS news_ratings_created_at_idx ON public.news_ratings(created_at DESC);
CREATE INDEX IF NOT EXISTS rating_likes_rating_id_idx ON public.rating_likes(rating_id);
CREATE INDEX IF NOT EXISTS rating_replies_rating_id_idx ON public.rating_replies(rating_id);

-- ============================================================
-- 7. BẬT RLS
-- ============================================================
ALTER TABLE public.news_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rating_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rating_replies ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 8. POLICIES – NEWS RATINGS
-- ============================================================
DROP POLICY IF EXISTS "Public can view ratings" ON public.news_ratings;
CREATE POLICY "Public can view ratings" ON public.news_ratings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can submit rating" ON public.news_ratings;
CREATE POLICY "Anyone can submit rating" ON public.news_ratings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admin manage ratings" ON public.news_ratings;
CREATE POLICY "Admin manage ratings" ON public.news_ratings FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- 9. POLICIES – RATING LIKES
-- ============================================================
DROP POLICY IF EXISTS "Public can view likes" ON public.rating_likes;
CREATE POLICY "Public can view likes" ON public.rating_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can like" ON public.rating_likes;
CREATE POLICY "Anyone can like" ON public.rating_likes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can remove own like" ON public.rating_likes;
CREATE POLICY "Anyone can remove own like" ON public.rating_likes FOR DELETE USING (true);

-- ============================================================
-- 10. POLICIES – RATING REPLIES
-- ============================================================
DROP POLICY IF EXISTS "Public can view replies" ON public.rating_replies;
CREATE POLICY "Public can view replies" ON public.rating_replies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can reply" ON public.rating_replies;
CREATE POLICY "Admin can reply" ON public.rating_replies FOR INSERT
  WITH CHECK (public.is_admin_or_editor());

DROP POLICY IF EXISTS "Admin manage replies" ON public.rating_replies;
CREATE POLICY "Admin manage replies" ON public.rating_replies FOR DELETE
  USING (public.is_admin_or_editor());

-- ============================================================
-- 11. SECURITY DEFINER RPC FUNCTIONS (fix + thêm is_it)
-- ============================================================

-- is_it(): chỉ IT role
CREATE OR REPLACE FUNCTION public.is_it()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'it'
  );
$$;

-- is_admin(): super_admin + admin + IT (cấp cao nhất)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'it')
  );
$$;

-- is_super_admin(): chỉ super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

-- is_admin_or_editor(): tất cả role có quyền quản lý nội dung
CREATE OR REPLACE FUNCTION public.is_admin_or_editor()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'it', 'manager', 'support')
  );
$$;

-- ============================================================
-- 12. RLS POLICIES – USERS TABLE
-- ============================================================

-- Cho phép user tự cập nhật display_name và avatar_url của mình
DROP POLICY IF EXISTS "User can update own profile" ON public.users;
CREATE POLICY "User can update own profile" ON public.users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Cập nhật policy admin để bao gồm IT
DROP POLICY IF EXISTS "Admin manage users" ON public.users;
CREATE POLICY "Admin manage users" ON public.users FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- 13. STORAGE BUCKET avatars + RLS
-- ============================================================

-- Tạo bucket avatars (public, max 5MB, chỉ ảnh)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 'avatars', true, 5242880,
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif'];

-- Storage policies (drop trước để idempotent)
DROP POLICY IF EXISTS "Public read avatars"        ON storage.objects;
DROP POLICY IF EXISTS "User upload own avatar"     ON storage.objects;
DROP POLICY IF EXISTS "User update own avatar"     ON storage.objects;
DROP POLICY IF EXISTS "User delete own avatar"     ON storage.objects;
DROP POLICY IF EXISTS "Admin manage all avatars"   ON storage.objects;

CREATE POLICY "Public read avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "User upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "User update own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "User delete own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admin manage all avatars" ON storage.objects
  FOR ALL USING (
    bucket_id = 'avatars' AND public.is_admin()
  );

-- ============================================================
-- Profile expansion: bio + phone + social links
-- (idempotent — safe to re-run)
-- ============================================================
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS facebook_url text;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS tiktok_url text;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS instagram_url text;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS youtube_url text;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS website_url text;

-- ============================================================
-- Team invites + IT approval flow (#6)
-- ============================================================

-- Extend role enum to include team_member
ALTER TABLE IF EXISTS public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE IF EXISTS public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('super_admin', 'admin', 'it', 'manager', 'support', 'team_member', 'user'));

-- Approval status for team_member accounts
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS team_status text
  CHECK (team_status IN ('pending', 'approved', 'rejected'));

-- Team invite tokens
CREATE TABLE IF NOT EXISTS public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  label text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  used_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  used_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_invites_token_idx ON public.team_invites(token);
CREATE INDEX IF NOT EXISTS team_invites_used_at_idx ON public.team_invites(used_at);

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage team invites" ON public.team_invites;
CREATE POLICY "Admins manage team invites" ON public.team_invites
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- More social links on user profile
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS discord_url text;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS twitch_url text;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS twitter_url text;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS telegram_url text;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS zalo_url text;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS threads_url text;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS github_url text;

-- Game profiles (Free Fire UID, etc) on user profile
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS game_profiles jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Personal contact email (separate from login email)
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS contact_email text;

-- Team-join richer application info
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS applied_role text;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS application_note text;

-- Two-stage team approval: pending_it → pending_admin → approved
ALTER TABLE IF EXISTS public.users DROP CONSTRAINT IF EXISTS users_team_status_check;
ALTER TABLE IF EXISTS public.users ADD CONSTRAINT users_team_status_check
  CHECK (team_status IS NULL OR team_status IN ('pending_it', 'pending_admin', 'approved', 'rejected', 'pending'));

-- Migrate any legacy rows still on 'pending' to 'pending_it'
UPDATE public.users SET team_status = 'pending_it' WHERE team_status = 'pending';

-- Track who approved at each stage
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS team_it_approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS team_it_approved_at timestamptz;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS team_admin_approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS team_admin_approved_at timestamptz;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS team_terms_accepted_at timestamptz;

-- Multi-use team invite links
ALTER TABLE IF EXISTS public.team_invites ADD COLUMN IF NOT EXISTS max_uses int NOT NULL DEFAULT 1;
ALTER TABLE IF EXISTS public.team_invites ADD COLUMN IF NOT EXISTS uses_count int NOT NULL DEFAULT 0;

-- Event server/region tagging (Free Fire có nhiều server: VN, Global, SEA, BR, IN, ME...)
ALTER TABLE IF EXISTS public.events ADD COLUMN IF NOT EXISTS server_region text;
CREATE INDEX IF NOT EXISTS events_server_region_idx ON public.events(server_region);
