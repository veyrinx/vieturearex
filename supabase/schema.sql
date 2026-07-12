-- ============================================================================
-- AREX — Consolidated database setup (single file)
-- Gộp toàn bộ schema + migrations + RLS + seed. Chạy 1 lần trên project mới.
-- Idempotent: an toàn chạy lại. Thứ tự đã sắp theo phụ thuộc.
-- Sinh tự động bằng cách gộp 38 file SQL.
-- ============================================================================


-- ============================================================================
-- SOURCE: supabase\schema.sql
-- ============================================================================
-- ============================================================
-- AREX – Supabase Schema
-- Chạy toàn bộ file này trong Supabase SQL Editor
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- exec_sql: chạy 1 câu SELECT trả JSON (dùng bởi SQL editor trong admin).
-- SECURITY DEFINER + chỉ service_role gọi được (revoke anon/authenticated).
-- ============================================================
create or replace function public.exec_sql(query text)
returns json language plpgsql security definer set search_path = public as $$
declare result json;
begin
  execute 'select json_agg(t) from (' || query || ') t' into result;
  return coalesce(result, '[]'::json);
end;
$$;
revoke execute on function public.exec_sql(text) from anon, authenticated;

-- ============================================================
-- BẢNG DỮ LIỆU
-- ============================================================

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  role text not null check (role in ('super_admin', 'admin', 'it', 'manager', 'support', 'user')) default 'user',
  views integer not null default 0,
  is_banned boolean not null default false,
  created_at timestamptz not null default now()
);

-- Idempotent migrations
alter table if exists public.users add column if not exists is_banned boolean not null default false;
-- Fix role constraint to include 'it'
alter table if exists public.users drop constraint if exists users_role_check;
alter table if exists public.users add constraint users_role_check
  check (role in ('super_admin', 'admin', 'it', 'manager', 'support', 'user'));
-- FF ID: unique Free Fire in-game ID, prevents clone accounts sharing one FFID
alter table if exists public.users add column if not exists ff_id text unique;
create unique index if not exists users_ff_id_unique on public.users(ff_id) where ff_id is not null;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  start_date timestamptz not null,
  end_date timestamptz not null,
  image_url text not null,
  thumbnail_url text,
  link text,
  status text not null check (status in ('active', 'upcoming', 'expired')) default 'upcoming',
  created_at timestamptz not null default now()
);

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text not null,
  content text not null,
  cover text not null,
  category text not null default 'ESPORTS',
  tags text[] not null default '{}',
  status text not null check (status in ('draft', 'published')) default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Alter existing news table to add new columns if not present (idempotent)
alter table if exists public.news add column if not exists tags text[] not null default '{}';
alter table if exists public.news add column if not exists published_at timestamptz;

create table if not exists public.gallery (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  tag text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_email text not null,
  action text not null,
  target_type text not null,
  target_id text,
  summary text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_daily (
  date date primary key,
  views integer not null default 0,
  unique_visitors integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.news_comments (
  id uuid primary key default gen_random_uuid(),
  news_id uuid not null references public.news(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  display_name text not null check (char_length(display_name) <= 80),
  content text not null check (char_length(content) >= 2 and char_length(content) <= 1000),
  status text not null check (status in ('pending', 'approved', 'rejected')) default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.news_ratings (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  anonymous_id text not null,
  stars integer not null check (stars between 1 and 5),
  review text,
  admin_liked boolean not null default false,
  created_at timestamptz not null default now(),
  unique(slug, anonymous_id)
);

create table if not exists public.rating_likes (
  id uuid primary key default gen_random_uuid(),
  rating_id uuid not null references public.news_ratings(id) on delete cascade,
  anonymous_id text not null,
  type text not null check (type in ('like', 'unlike')),
  created_at timestamptz not null default now(),
  unique(rating_id, anonymous_id)
);

create table if not exists public.rating_replies (
  id uuid primary key default gen_random_uuid(),
  rating_id uuid not null references public.news_ratings(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists users_role_idx on public.users(role);
create index if not exists events_start_date_idx on public.events(start_date);
create index if not exists events_status_idx on public.events(status);
create index if not exists news_slug_idx on public.news(slug);
create index if not exists news_status_idx on public.news(status);
create index if not exists news_created_at_idx on public.news(created_at desc);
create index if not exists gallery_created_at_idx on public.gallery(created_at desc);
create index if not exists settings_updated_at_idx on public.settings(updated_at desc);
create index if not exists admin_activity_logs_created_at_idx on public.admin_activity_logs(created_at desc);
create index if not exists analytics_daily_date_idx on public.analytics_daily(date desc);
create index if not exists news_comments_news_id_idx on public.news_comments(news_id);
create index if not exists news_comments_status_idx on public.news_comments(status);
create index if not exists news_comments_created_at_idx on public.news_comments(created_at desc);
create index if not exists news_tags_idx on public.news using gin(tags);
create index if not exists news_ratings_slug_idx on public.news_ratings(slug);
create index if not exists news_ratings_created_at_idx on public.news_ratings(created_at desc);
create index if not exists rating_likes_rating_id_idx on public.rating_likes(rating_id);
create index if not exists rating_replies_rating_id_idx on public.rating_replies(rating_id);

-- ============================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================

-- Tự động tạo user trong public.users khi tạo tài khoản mới
-- KHÔNG overwrite role để tránh mất quyền đã cấp
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role text;
begin
  if new.email = 'admin@arex.tech' then
    user_role := 'super_admin';
  else
    user_role := coalesce(new.raw_app_meta_data ->> 'role', 'user');
  end if;

  insert into public.users (id, email, role)
  values (new.id, new.email, user_role)
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_news_updated on public.news;
create trigger on_news_updated
before update on public.news
for each row execute function public.handle_updated_at();

drop trigger if exists on_settings_updated on public.settings;
create trigger on_settings_updated
before update on public.settings
for each row execute function public.handle_updated_at();

-- ============================================================
-- BẬT ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table public.users enable row level security;
alter table public.events enable row level security;
alter table public.news enable row level security;
alter table public.gallery enable row level security;
alter table public.settings enable row level security;
alter table public.admin_activity_logs enable row level security;
alter table public.analytics_daily enable row level security;
alter table public.news_comments enable row level security;
alter table public.news_ratings enable row level security;
alter table public.rating_likes enable row level security;
alter table public.rating_replies enable row level security;

-- ============================================================
-- HELPER FUNCTIONS
-- Dùng security definer + set search_path để bypass RLS khi check role
-- Tránh lỗi "stack depth limit exceeded" do RLS đệ quy
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
set search_path = '' -- IMPORTANT: prevent search_path hijacking
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role in ('super_admin', 'admin')
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
set search_path = '' -- IMPORTANT: prevent search_path hijacking
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'super_admin'
  );
$$;

create or replace function public.is_admin_or_editor()
returns boolean
language sql
stable
security definer
set search_path = public
set search_path = '' -- IMPORTANT: prevent search_path hijacking
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role in ('super_admin', 'admin', 'manager', 'support')
    where id = auth.uid() and role in ('super_admin', 'admin', 'it', 'manager')
  );
$$;

create or replace function public.promote_to_super_admin(target_email text)
returns table(success boolean, message text)
language plpgsql
security definer
set search_path = public
set search_path = ''
as $$
declare
  caller_role text;
  user_uuid uuid;
begin
  -- Only an existing super_admin may call this function
  select role into caller_role from public.users where id = auth.uid();
  if caller_role is distinct from 'super_admin' then
    return query select false::boolean, 'Không có quyền thực hiện thao tác này.'::text;
    return;
  end if;

  select id into user_uuid from auth.users where email = target_email;
  if user_uuid is null then
    return query select false::boolean, 'User không tồn tại trong auth.users.'::text;
    return;
  end if;

  update public.users set role = 'super_admin' where id = user_uuid;
  if found then
    return query select true::boolean, ('Đã gán role super_admin cho ' || target_email)::text;
  else
    insert into public.users (id, email, role) values (user_uuid, target_email, 'super_admin');
    return query select true::boolean, ('Đã tạo user ' || target_email || ' với role super_admin')::text;
  end if;
end;
$$;

-- Revoke anon access; only authenticated sessions may invoke this
revoke execute on function public.promote_to_super_admin(text) from anon;
grant  execute on function public.promote_to_super_admin(text) to authenticated;

-- ============================================================
-- POLICIES – EVENTS
-- ============================================================

drop policy if exists "Public can view events" on public.events;
drop policy if exists "Auth can view events" on public.events;
create policy "Auth can view events" on public.events for select using (auth.uid() is not null);

drop policy if exists "Admin/editor manage events" on public.events;
create policy "Admin/editor manage events" on public.events for all
using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());

-- ============================================================
-- POLICIES – NEWS
-- ============================================================

drop policy if exists "Public can view published news" on public.news;
drop policy if exists "Auth can view published news" on public.news;
create policy "Auth can view published news" on public.news for select
using (auth.uid() is not null and (status = 'published' or public.is_admin_or_editor()));

drop policy if exists "Admin/editor manage news" on public.news;
create policy "Admin/editor manage news" on public.news for all
using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());

-- ============================================================
-- POLICIES – GALLERY
-- ============================================================

drop policy if exists "Public can view gallery" on public.gallery;
drop policy if exists "Auth can view gallery" on public.gallery;
create policy "Auth can view gallery" on public.gallery for select using (auth.uid() is not null);

drop policy if exists "Admin/editor manage gallery" on public.gallery;
create policy "Admin/editor manage gallery" on public.gallery for all
using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());

-- ============================================================
-- POLICIES – USERS
-- ============================================================

drop policy if exists "User can read own profile" on public.users;
create policy "User can read own profile" on public.users for select using (id = auth.uid());

drop policy if exists "Admin manage users" on public.users;
create policy "Admin manage users" on public.users for all
using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- POLICIES – SETTINGS
-- ============================================================

-- Sensitive-key guard (immutable helper, called only via SECURITY DEFINER)
create or replace function public.is_sensitive_setting_key(k text)
returns boolean language sql immutable security definer set search_path = public as $$
  select k = any(array[
    'mail.smtp_pass','mail.smtp_user','mail.smtp_host','mail.from_email',
    'site.discord_webhook','zalo.webhook_url','zalo.group_id',
    'ads.google_adsense_id','ads.slot_header','ads.slot_sidebar','ads.slot_article',
    'integrations.lark_webhook_url','integrations.lark_alerts_webhook_url',
    'tms.payment_info'
  ]);
$$;
revoke execute on function public.is_sensitive_setting_key(text) from anon, authenticated;

-- Authenticated can read only non-sensitive settings
drop policy if exists "Public can read settings" on public.settings;
drop policy if exists "Public read non-sensitive settings" on public.settings;
drop policy if exists "Auth read non-sensitive settings" on public.settings;
create policy "Auth read non-sensitive settings" on public.settings
  for select using (auth.uid() is not null and not public.is_sensitive_setting_key(key));

-- Admins can read ALL settings
drop policy if exists "Admin read settings" on public.settings;
create policy "Admin read settings" on public.settings
  for select using (public.is_admin());

drop policy if exists "Admin manage settings" on public.settings;
create policy "Admin manage settings" on public.settings for all
using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- POLICIES – ADMIN ACTIVITY LOGS
-- ============================================================

drop policy if exists "Admin/editor view logs" on public.admin_activity_logs;
create policy "Admin/editor view logs" on public.admin_activity_logs for select
using (public.is_admin_or_editor());

drop policy if exists "Admin/editor insert logs" on public.admin_activity_logs;
create policy "Admin/editor insert logs" on public.admin_activity_logs for insert
with check (public.is_admin_or_editor());

drop policy if exists "Admin manage log cleanup" on public.admin_activity_logs;
create policy "Admin manage log cleanup" on public.admin_activity_logs for delete
using (public.is_admin());

-- ============================================================
-- POLICIES – ANALYTICS_DAILY
-- ============================================================

drop policy if exists "Admin can view analytics" on public.analytics_daily;
create policy "Admin can view analytics" on public.analytics_daily for select
using (public.is_admin_or_editor());

drop policy if exists "Admin manage analytics" on public.analytics_daily;
create policy "Admin manage analytics" on public.analytics_daily for all
using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- POLICIES – NEWS COMMENTS
-- ============================================================

drop policy if exists "Public can view approved comments" on public.news_comments;
drop policy if exists "Auth can view approved comments" on public.news_comments;
create policy "Auth can view approved comments" on public.news_comments for select
using (auth.uid() is not null and (status = 'approved' or public.is_admin_or_editor()));

drop policy if exists "Anyone can insert pending comment" on public.news_comments;
drop policy if exists "Auth can insert pending comment" on public.news_comments;
create policy "Auth can insert pending comment" on public.news_comments for insert
with check (auth.uid() is not null and status = 'pending');

drop policy if exists "Admin manage comments" on public.news_comments;
create policy "Admin manage comments" on public.news_comments for all
using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());

-- ============================================================
-- POLICIES – NEWS RATINGS
-- ============================================================

drop policy if exists "Public can view ratings" on public.news_ratings;
drop policy if exists "Auth can view ratings" on public.news_ratings;
create policy "Auth can view ratings" on public.news_ratings for select using (auth.uid() is not null);

drop policy if exists "Anyone can submit rating" on public.news_ratings;
drop policy if exists "Auth can submit rating" on public.news_ratings;
create policy "Auth can submit rating" on public.news_ratings for insert with check (auth.uid() is not null);

drop policy if exists "Admin manage ratings" on public.news_ratings;
create policy "Admin manage ratings" on public.news_ratings for all
using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- POLICIES – RATING LIKES
-- ============================================================

drop policy if exists "Public can view likes" on public.rating_likes;
drop policy if exists "Auth can view likes" on public.rating_likes;
create policy "Auth can view likes" on public.rating_likes for select using (auth.uid() is not null);

drop policy if exists "Anyone can like" on public.rating_likes;
drop policy if exists "Auth can like" on public.rating_likes;
create policy "Auth can like" on public.rating_likes for insert with check (auth.uid() is not null);

drop policy if exists "Anyone can remove own like" on public.rating_likes;
drop policy if exists "Auth can remove own like" on public.rating_likes;
create policy "Auth can remove own like" on public.rating_likes for delete using (auth.uid() is not null);

-- ============================================================
-- POLICIES – RATING REPLIES
-- ============================================================

drop policy if exists "Public can view replies" on public.rating_replies;
drop policy if exists "Auth can view replies" on public.rating_replies;
create policy "Auth can view replies" on public.rating_replies for select using (auth.uid() is not null);

drop policy if exists "Admin can reply" on public.rating_replies;
create policy "Admin can reply" on public.rating_replies for insert
with check (public.is_admin_or_editor());

drop policy if exists "Admin manage replies" on public.rating_replies;
create policy "Admin manage replies" on public.rating_replies for delete
using (public.is_admin_or_editor());

-- ============================================================
-- SEED DATA
-- ============================================================

insert into public.settings (key, value)
values
  ('seo.default_title', 'Arex - Trang Tin Tức Cộng Đồng Free Fire'),
  ('seo.default_description', 'Arex – Cổng thông tin cộng đồng Free Fire hàng đầu. Cập nhật nhanh nhất các sự kiện in-game, tin tức Esports chuyên sâu và các hoạt động cộng đồng nổi bật.'),
  ('home.hero.title', 'Arex'),
  ('home.background.desktop_urls', 'https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/697b5d2e34ac088f5b5a4427d57f6281.jpg'),
  ('home.background.mobile_urls', 'https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/0680c1792156b8a80095c669520f019a.jpg'),
  ('home.background.interval_seconds', '5'),
  ('home.background.transition_seconds', '1'),
  ('home.background.transition_effect', 'fade'),
  ('social.email', 'admin@arex.tech'),
  ('social.facebook_url', 'https://facebook.com'),
  ('social.tiktok_url', 'https://tiktok.com'),
  ('social.youtube_url', 'https://youtube.com'),
  ('branding.site_name', 'Arex'),
  ('branding.favicon_url', 'https://ik.imagekit.io/oyvgbkwyt/SGM%20NETWORK/29032026/b21232026.png?updatedAt=1774797861035'),
  ('branding.logo_light_url', 'https://ik.imagekit.io/oyvgbkwyt/SGM%20NETWORK/29032026/b21232026.png?updatedAt=1774797861035'),
  ('branding.logo_dark_url', 'https://ik.imagekit.io/oyvgbkwyt/SGM%20NETWORK/29032026/w21232026.png?updatedAt=1774797861441'),
  ('news.categories', 'ESPORTS\nPATCH NOTE\nCỘNG ĐỒNG'),
  ('analytics.views', '0'),
  ('site.description', 'Arex – Cổng thông tin cộng đồng hàng đầu về sự kiện, tin tức và nội dung Garena Free Fire Việt Nam.'),
  ('branding.primary_color', ''),
  ('site.comments_enabled', 'true'),
  ('site.language', 'vi')
on conflict (key) do nothing;

-- ============================================================
-- SEED SUPER ADMIN ACCOUNT
-- Email: admin@arex.tech | Password: Admin@Arex2026!
-- Đổi mật khẩu ngay sau lần đăng nhập đầu tiên!
-- ============================================================
do $$
declare
  admin_uid uuid;
begin
  if not exists (select 1 from auth.users where email = 'admin@arex.tech') then
    admin_uid := gen_random_uuid();

    insert into auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      invited_at,
      confirmation_token,
      confirmation_sent_at,
      recovery_token,
      recovery_sent_at,
      email_change_token_new,
      email_change,
      email_change_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at,
      phone,
      phone_confirmed_at,
      phone_change,
      phone_change_token,
      phone_change_sent_at,
      email_change_token_current,
      email_change_confirm_status,
      banned_until,
      reauthentication_token,
      reauthentication_sent_at
    ) values (
      admin_uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'admin@arex.tech',
      crypt('Admin@Arex2026!', gen_salt('bf')),
      now(),
      null, '', null, '', null, '', '', null,
      now(),
      '{"provider":"email","providers":["email"],"role":"super_admin"}',
      '{"display_name":"Arex Admin"}',
      false,
      now(), now(),
      null, null, '', '', null, '', 0, null, '', null
    );

    -- Tự động detect kiểu cột id (uuid hoặc text) và provider_id
    declare
      id_col_type text;
      has_provider_id boolean;
      identity_data_val jsonb;
    begin
      identity_data_val := jsonb_build_object('sub', admin_uid::text, 'email', 'admin@arex.tech');

      select data_type into id_col_type
      from information_schema.columns
      where table_schema = 'auth' and table_name = 'identities' and column_name = 'id';

      select exists (
        select 1 from information_schema.columns
        where table_schema = 'auth' and table_name = 'identities' and column_name = 'provider_id'
      ) into has_provider_id;

      if id_col_type in ('text', 'character varying') then
        if has_provider_id then
          execute 'insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) values ($1, $2, $3, $4, $5, now(), now(), now())'
            using gen_random_uuid()::text, admin_uid, identity_data_val, 'email', 'admin@arex.tech';
        else
          execute 'insert into auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) values ($1, $2, $3, $4, now(), now(), now())'
            using gen_random_uuid()::text, admin_uid, identity_data_val, 'email';
        end if;
      else
        if has_provider_id then
          execute 'insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) values ($1, $2, $3, $4, $5, now(), now(), now())'
            using gen_random_uuid(), admin_uid, identity_data_val, 'email', 'admin@arex.tech';
        else
          execute 'insert into auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) values ($1, $2, $3, $4, now(), now(), now())'
            using gen_random_uuid(), admin_uid, identity_data_val, 'email';
        end if;
      end if;
    end;
  end if;
end $$;


-- ============================================================================
-- SOURCE: supabase\migration.sql
-- ============================================================================
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


-- ============================================================================
-- SOURCE: supabase\event_comments.sql
-- ============================================================================
-- ============================================================
-- EVENT COMMENTS — Migration
-- Chạy trong Supabase SQL Editor (sau schema.sql)
-- ============================================================

create table if not exists public.event_comments (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  user_id      uuid references public.users(id) on delete set null,
  display_name text not null check (char_length(display_name) <= 80),
  content      text not null check (char_length(content) >= 2 and char_length(content) <= 1000),
  status       text not null check (status in ('pending', 'approved', 'rejected')) default 'pending',
  parent_id    uuid references public.event_comments(id) on delete cascade,
  created_at   timestamptz not null default now()
);

create index if not exists event_comments_event_id_idx   on public.event_comments(event_id);
create index if not exists event_comments_status_idx     on public.event_comments(status);
create index if not exists event_comments_created_at_idx on public.event_comments(created_at desc);
create index if not exists event_comments_parent_id_idx  on public.event_comments(parent_id);

alter table public.event_comments enable row level security;

drop policy if exists "Auth can view approved event comments" on public.event_comments;
create policy "Auth can view approved event comments" on public.event_comments for select
using (auth.uid() is not null and (status = 'approved' or public.is_admin_or_editor()));

drop policy if exists "Auth can insert pending event comment" on public.event_comments;
create policy "Auth can insert pending event comment" on public.event_comments for insert
with check (auth.uid() is not null and status = 'pending');

drop policy if exists "Admin manage event comments" on public.event_comments;
create policy "Admin manage event comments" on public.event_comments for all
using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());


-- ============================================================================
-- SOURCE: supabase\tms.sql
-- ============================================================================
-- ============================================================
-- AREX TMS – Tournament Management System
-- Chạy sau schema.sql chính
-- ============================================================

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists public.tms_teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  tag         text not null unique,
  captain_id  uuid not null references public.users(id) on delete restrict,
  logo_url    text,
  total_points integer not null default 0,
  total_kills  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint tms_teams_tag_length check (char_length(tag) between 2 and 8)
);

create table if not exists public.tms_team_members (
  id        uuid primary key default gen_random_uuid(),
  team_id   uuid not null references public.tms_teams(id) on delete cascade,
  user_id   uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique(team_id, user_id)
);

-- 1 user chỉ được ở 1 team cùng lúc
create unique index if not exists tms_team_members_user_unique on public.tms_team_members(user_id);

create table if not exists public.tms_tournaments (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null,
  slug                    text not null unique,
  description             text,
  mode                    text not null default '4v4'
                            check (mode in ('1v1','2v2','4v4','squad')),
  format                  text not null default 'hybrid'
                            check (format in ('round_robin','knockout','hybrid')),
  max_teams               integer not null default 16,
  team_size               integer not null default 4,
  prize_pool              text,
  rules                   text,
  banner_url              text,
  status                  text not null default 'draft'
                            check (status in ('draft','registering','ongoing','finished','cancelled')),
  registration_open_at    timestamptz,
  registration_close_at   timestamptz,
  start_at                timestamptz,
  end_at                  timestamptz,
  created_by              uuid references public.users(id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create table if not exists public.tms_registrations (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tms_tournaments(id) on delete cascade,
  team_id       uuid not null references public.tms_teams(id) on delete cascade,
  status        text not null default 'pending'
                  check (status in ('pending','approved','rejected')),
  group_label   text,
  registered_at timestamptz not null default now(),
  unique(tournament_id, team_id)
);

create table if not exists public.tms_matches (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tms_tournaments(id) on delete cascade,
  round         text not null,
  round_num     integer not null default 1,
  team_a_id     uuid not null references public.tms_teams(id),
  team_b_id     uuid not null references public.tms_teams(id),
  scheduled_at  timestamptz,
  status        text not null default 'pending'
                  check (status in ('pending','playing','done','cancelled')),
  winner_id     uuid references public.tms_teams(id),
  proof_url     text,
  notes         text,
  created_by    uuid references public.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint tms_matches_teams_different check (team_a_id <> team_b_id)
);

-- Kết quả từng player trong match (admin nhập sau trận)
create table if not exists public.tms_match_results (
  id            uuid primary key default gen_random_uuid(),
  match_id      uuid not null references public.tms_matches(id) on delete cascade,
  tournament_id uuid not null references public.tms_tournaments(id),
  team_id       uuid not null references public.tms_teams(id),
  user_id       uuid not null references public.users(id),
  kills         integer not null default 0 check (kills >= 0 and kills <= 99),
  assists       integer not null default 0 check (assists >= 0 and assists <= 99),
  deaths        integer not null default 0 check (deaths >= 0 and deaths <= 99),
  is_winner     boolean not null default false,
  -- kills×2 + assists×1 + win_bonus(20) or consolation(8)
  points        integer generated always as (
    (kills * 2) + assists + (case when is_winner then 20 else 8 end)
  ) stored,
  submitted_by  uuid references public.users(id),
  created_at    timestamptz not null default now(),
  unique(match_id, user_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists tms_team_members_team_idx   on public.tms_team_members(team_id);
create index if not exists tms_registrations_tourn_idx on public.tms_registrations(tournament_id);
create index if not exists tms_registrations_team_idx  on public.tms_registrations(team_id);
create index if not exists tms_matches_tourn_idx       on public.tms_matches(tournament_id);
create index if not exists tms_matches_status_idx      on public.tms_matches(status);
create index if not exists tms_match_results_match_idx on public.tms_match_results(match_id);
create index if not exists tms_match_results_user_idx  on public.tms_match_results(user_id);
create index if not exists tms_match_results_tourn_idx on public.tms_match_results(tournament_id);
create index if not exists tms_tournaments_slug_idx    on public.tms_tournaments(slug);
create index if not exists tms_tournaments_status_idx  on public.tms_tournaments(status);

-- ============================================================
-- LEADERBOARD VIEWS
-- ============================================================

create or replace view public.tms_player_leaderboard as
select
  r.tournament_id,
  r.user_id,
  u.display_name,
  u.ff_id,
  r.team_id,
  t.name  as team_name,
  t.tag   as team_tag,
  count(distinct r.match_id)        as matches_played,
  sum(r.kills)                      as total_kills,
  sum(r.assists)                    as total_assists,
  sum(r.deaths)                     as total_deaths,
  sum(r.points)                     as total_points,
  count(*) filter (where r.is_winner) as wins,
  round(
    case when sum(r.deaths) = 0 then sum(r.kills)::numeric
    else sum(r.kills)::numeric / sum(r.deaths)::numeric end, 2
  ) as kd_ratio
from public.tms_match_results r
join public.users u on u.id = r.user_id
join public.tms_teams t on t.id = r.team_id
group by r.tournament_id, r.user_id, u.display_name, r.team_id, t.name, t.tag;

create or replace view public.tms_team_leaderboard as
select
  r.tournament_id,
  r.team_id,
  t.name  as team_name,
  t.tag   as team_tag,
  t.logo_url,
  count(distinct m.id)                           as matches_played,
  count(distinct m.id) filter (where m.winner_id = r.team_id) as wins,
  count(distinct m.id) filter (where m.winner_id is not null and m.winner_id <> r.team_id) as losses,
  sum(r.kills)                                   as total_kills,
  sum(r.assists)                                 as total_assists,
  sum(r.points)                                  as total_points
from public.tms_match_results r
join public.tms_teams t on t.id = r.team_id
join public.tms_matches m on m.id = r.match_id
group by r.tournament_id, r.team_id, t.name, t.tag, t.logo_url;

-- ============================================================
-- TRIGGERS
-- ============================================================

drop trigger if exists on_tms_tournaments_updated on public.tms_tournaments;
create trigger on_tms_tournaments_updated
before update on public.tms_tournaments
for each row execute function public.handle_updated_at();

drop trigger if exists on_tms_teams_updated on public.tms_teams;
create trigger on_tms_teams_updated
before update on public.tms_teams
for each row execute function public.handle_updated_at();

drop trigger if exists on_tms_matches_updated on public.tms_matches;
create trigger on_tms_matches_updated
before update on public.tms_matches
for each row execute function public.handle_updated_at();

-- Auto-sync team totals after match result insert/delete
create or replace function public.tms_sync_team_totals()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.tms_teams set
    total_points = coalesce((select sum(points) from public.tms_match_results where team_id = coalesce(new.team_id, old.team_id)), 0),
    total_kills  = coalesce((select sum(kills)  from public.tms_match_results where team_id = coalesce(new.team_id, old.team_id)), 0)
  where id = coalesce(new.team_id, old.team_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists on_tms_result_upsert on public.tms_match_results;
create trigger on_tms_result_upsert
after insert or update or delete on public.tms_match_results
for each row execute function public.tms_sync_team_totals();

-- ============================================================
-- RLS
-- ============================================================

alter table public.tms_teams         enable row level security;
alter table public.tms_team_members  enable row level security;
alter table public.tms_tournaments   enable row level security;
alter table public.tms_registrations enable row level security;
alter table public.tms_matches       enable row level security;
alter table public.tms_match_results enable row level security;

-- Public read
drop policy if exists "tms public read teams"         on public.tms_teams;
drop policy if exists "tms auth read teams"           on public.tms_teams;
create policy "tms auth read teams" on public.tms_teams for select using (auth.uid() is not null);

drop policy if exists "tms public read members"       on public.tms_team_members;
drop policy if exists "tms auth read members"         on public.tms_team_members;
create policy "tms auth read members" on public.tms_team_members for select using (auth.uid() is not null);

drop policy if exists "tms public read tournaments"   on public.tms_tournaments;
drop policy if exists "tms auth read tournaments"     on public.tms_tournaments;
create policy "tms auth read tournaments" on public.tms_tournaments for select
  using (auth.uid() is not null and (status <> 'draft' or public.is_admin()));

drop policy if exists "tms public read registrations" on public.tms_registrations;
drop policy if exists "tms auth read registrations"   on public.tms_registrations;
create policy "tms auth read registrations" on public.tms_registrations for select using (auth.uid() is not null);

drop policy if exists "tms public read matches"       on public.tms_matches;
drop policy if exists "tms auth read matches"         on public.tms_matches;
create policy "tms auth read matches" on public.tms_matches for select using (auth.uid() is not null);

drop policy if exists "tms public read results"       on public.tms_match_results;
drop policy if exists "tms auth read results"         on public.tms_match_results;
create policy "tms auth read results" on public.tms_match_results for select using (auth.uid() is not null);

-- Authenticated users can create / manage their own team
drop policy if exists "tms user create team"         on public.tms_teams;
create policy "tms user create team" on public.tms_teams for insert
  with check (captain_id = auth.uid());

drop policy if exists "tms captain update team"      on public.tms_teams;
create policy "tms captain update team" on public.tms_teams for update
  using (captain_id = auth.uid() or public.is_admin());

-- Team members: join / leave
drop policy if exists "tms user join team"           on public.tms_team_members;
create policy "tms user join team" on public.tms_team_members for insert
  with check (user_id = auth.uid());

drop policy if exists "tms user leave team"          on public.tms_team_members;
create policy "tms user leave team" on public.tms_team_members for delete
  using (user_id = auth.uid() or public.is_admin());

-- Registrations: authenticated users
drop policy if exists "tms user register team"       on public.tms_registrations;
create policy "tms user register team" on public.tms_registrations for insert
  with check (
    exists (select 1 from public.tms_teams where id = team_id and captain_id = auth.uid())
  );

-- Admin-only: write tournaments, matches, results
drop policy if exists "tms admin manage tournaments"  on public.tms_tournaments;
create policy "tms admin manage tournaments" on public.tms_tournaments for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "tms admin manage registrations" on public.tms_registrations;
create policy "tms admin manage registrations" on public.tms_registrations for update
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "tms admin manage matches"      on public.tms_matches;
create policy "tms admin manage matches" on public.tms_matches for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "tms admin manage results"      on public.tms_match_results;
create policy "tms admin manage results" on public.tms_match_results for all
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- SCORE SUBMISSIONS
-- ============================================================

create table if not exists public.tms_score_submissions (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tms_tournaments(id) on delete cascade,
  match_id      uuid references public.tms_matches(id) on delete set null,
  user_id       uuid not null references public.users(id) on delete cascade,
  team_id       uuid references public.tms_teams(id) on delete set null,
  ff_id         text not null,
  kills         integer not null default 0 check (kills >= 0 and kills <= 99),
  assists       integer not null default 0 check (assists >= 0 and assists <= 99),
  deaths        integer not null default 0 check (deaths >= 0 and deaths <= 99),
  proof_url     text,
  notes         text,
  status        text not null default 'pending'
                  check (status in ('pending','approved','rejected')),
  reviewed_by   uuid references public.users(id),
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists tms_score_sub_tourn_idx on public.tms_score_submissions(tournament_id);
create index if not exists tms_score_sub_user_idx  on public.tms_score_submissions(user_id);
create index if not exists tms_score_sub_status_idx on public.tms_score_submissions(status);
alter table public.tms_score_submissions enable row level security;
drop policy if exists "tms sub public insert" on public.tms_score_submissions;
create policy "tms sub public insert" on public.tms_score_submissions for insert
  with check (auth.uid() = user_id);
drop policy if exists "tms sub own read" on public.tms_score_submissions;
create policy "tms sub own read" on public.tms_score_submissions for select
  using (auth.uid() = user_id or public.is_admin());
drop policy if exists "tms sub admin manage" on public.tms_score_submissions;
create policy "tms sub admin manage" on public.tms_score_submissions for all
  using (public.is_admin()) with check (public.is_admin());


-- ============================================================================
-- SOURCE: supabase\tms_damage.sql
-- ============================================================================
-- Add damage column to score submissions.
-- Run in Supabase SQL Editor.

alter table tms_score_submissions
  add column if not exists damage integer not null default 0;


-- ============================================================================
-- SOURCE: supabase\tms_placement.sql
-- ============================================================================
-- Add placement column to score submissions.
-- Run in Supabase SQL Editor.

alter table tms_score_submissions
  add column if not exists placement integer;


-- ============================================================================
-- SOURCE: supabase\tms_server.sql
-- ============================================================================
-- Add server/region field to tournaments and teams.
-- Run in Supabase SQL Editor.

alter table tms_tournaments
  add column if not exists server text not null default 'vn'
  check (server in ('vn', 'sg', 'global'));

alter table tms_teams
  add column if not exists server text not null default 'vn'
  check (server in ('vn', 'sg', 'global'));


-- ============================================================================
-- SOURCE: supabase\tms_stream_url.sql
-- ============================================================================
-- Add livestream URL to tournaments
ALTER TABLE public.tms_tournaments ADD COLUMN IF NOT EXISTS stream_url TEXT;


-- ============================================================================
-- SOURCE: supabase\tms_team_visibility.sql
-- ============================================================================
-- Migration: add is_public to tms_teams
-- Run in Supabase SQL Editor

ALTER TABLE public.tms_teams
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- Admin-created teams can be made public; user-created stay private by default
COMMENT ON COLUMN public.tms_teams.is_public IS 'true = visible in public listings; false = invite-link only';


-- ============================================================================
-- SOURCE: supabase\notifications.sql
-- ============================================================================
-- Run in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS notifications (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text NOT NULL,
  title       text NOT NULL,
  body        text,
  entity_type text,
  entity_id   text,
  entity_url  text,
  read_at     timestamptz,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_unread  ON notifications(user_id, read_at) WHERE read_at IS NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own notifications"   ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Service role inserts notifications"  ON notifications;

CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Allow service_role (admin client) to insert — public users cannot
CREATE POLICY "Service role inserts notifications"
  ON notifications FOR INSERT WITH CHECK (true);

-- Also add auto_approve_registrations column to tms_tournaments if not exists
ALTER TABLE tms_tournaments ADD COLUMN IF NOT EXISTS auto_approve_registrations boolean DEFAULT false;


-- ============================================================================
-- SOURCE: supabase\user_follows.sql
-- ============================================================================
-- ============================================================================
-- User-to-User Follow System
-- ============================================================================
-- Allows users to follow each other; integrates with notification system.

CREATE TABLE IF NOT EXISTS public.user_user_follows (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_user_follows_unique UNIQUE (follower_id, following_id),
  CONSTRAINT user_user_follows_no_self CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS user_user_follows_follower_idx ON public.user_user_follows (follower_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_user_follows_following_idx ON public.user_user_follows (following_id, created_at DESC);

ALTER TABLE public.user_user_follows ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read follows (used to display counts/lists)
DROP POLICY IF EXISTS "user_follows_read_all" ON public.user_user_follows;
CREATE POLICY "user_follows_read_all"
  ON public.user_user_follows
  FOR SELECT
  USING (true);

-- Users can only follow as themselves
DROP POLICY IF EXISTS "user_follows_insert_own" ON public.user_user_follows;
CREATE POLICY "user_follows_insert_own"
  ON public.user_user_follows
  FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- Users can only unfollow their own relationships
DROP POLICY IF EXISTS "user_follows_delete_own" ON public.user_user_follows;
CREATE POLICY "user_follows_delete_own"
  ON public.user_user_follows
  FOR DELETE
  USING (auth.uid() = follower_id);


-- ============================================================================
-- SOURCE: supabase\ff_items.sql
-- ============================================================================
-- ============================================================================
-- Free Fire Items Catalog
-- ============================================================================
-- Stores curated item metadata (labels + categories) shared across admins.
-- Public page /items reads from this table to show friendly names.
-- Sync system stores actual icon files in Supabase Storage bucket "ff-items".

-- ── Storage bucket ──────────────────────────────────────────────────────────
-- Create public bucket for FF item icons (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ff-items', 'ff-items', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public read access on ff-items bucket
DROP POLICY IF EXISTS "ff_items_public_read" ON storage.objects;
CREATE POLICY "ff_items_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ff-items');

-- Allow authenticated admins to upload/update/delete
DROP POLICY IF EXISTS "ff_items_admin_write" ON storage.objects;
CREATE POLICY "ff_items_admin_write"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'ff-items'
    AND (auth.jwt() ->> 'role' = 'service_role'
         OR EXISTS (
           SELECT 1 FROM public.users u
           WHERE u.id = auth.uid()
             AND u.role IN ('super_admin', 'admin', 'it', 'manager', 'support')
         ))
  );

-- ── Catalog table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ff_items_catalog (
  id          text PRIMARY KEY,            -- FF item ID (e.g. "211000234")
  label       text,                        -- Friendly name ("AWM Skull Cleaver")
  category    text,                        -- "weapon", "character", "pet", etc.
  is_public   boolean NOT NULL DEFAULT true,
  metadata    jsonb DEFAULT '{}'::jsonb,   -- Future-proof for extra fields
  created_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ff_items_id_format CHECK (id ~ '^[\w.-]{1,80}$'),
  CONSTRAINT ff_items_label_length CHECK (label IS NULL OR length(label) <= 80),
  CONSTRAINT ff_items_category_check CHECK (
    category IS NULL OR category IN (
      'weapon', 'character', 'pet', 'outfit', 'skin',
      'accessory', 'emote', 'vehicle', 'other'
    )
  )
);

CREATE INDEX IF NOT EXISTS ff_items_category_idx ON public.ff_items_catalog (category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS ff_items_public_idx ON public.ff_items_catalog (is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS ff_items_label_search_idx ON public.ff_items_catalog USING gin (to_tsvector('simple', coalesce(label, '')));

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.tg_ff_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ff_items_updated_at ON public.ff_items_catalog;
CREATE TRIGGER ff_items_updated_at
  BEFORE UPDATE ON public.ff_items_catalog
  FOR EACH ROW EXECUTE FUNCTION public.tg_ff_items_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.ff_items_catalog ENABLE ROW LEVEL SECURITY;

-- Public can read public items
DROP POLICY IF EXISTS "ff_items_catalog_public_read" ON public.ff_items_catalog;
CREATE POLICY "ff_items_catalog_public_read"
  ON public.ff_items_catalog FOR SELECT
  USING (is_public = true);

-- Admins can read all
DROP POLICY IF EXISTS "ff_items_catalog_admin_read_all" ON public.ff_items_catalog;
CREATE POLICY "ff_items_catalog_admin_read_all"
  ON public.ff_items_catalog FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('super_admin', 'admin', 'it', 'manager', 'support')
    )
  );

-- Admins can insert/update/delete
DROP POLICY IF EXISTS "ff_items_catalog_admin_write" ON public.ff_items_catalog;
CREATE POLICY "ff_items_catalog_admin_write"
  ON public.ff_items_catalog FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('super_admin', 'admin', 'it', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('super_admin', 'admin', 'it', 'manager')
    )
  );

-- ── Helper view (optional) ──────────────────────────────────────────────────
-- Public-friendly view that filters out private items
CREATE OR REPLACE VIEW public.ff_items_public AS
SELECT id, label, category, metadata, created_at, updated_at
FROM public.ff_items_catalog
WHERE is_public = true;

-- Grant select on view
GRANT SELECT ON public.ff_items_public TO anon, authenticated;

COMMENT ON TABLE public.ff_items_catalog IS 'Curated catalog of Free Fire items with admin-set labels and categories';
COMMENT ON COLUMN public.ff_items_catalog.id IS 'FF item ID (matches filename in ff-items storage bucket)';
COMMENT ON COLUMN public.ff_items_catalog.label IS 'Admin-set friendly name';
COMMENT ON COLUMN public.ff_items_catalog.category IS 'Category key for filtering: weapon|character|pet|outfit|skin|accessory|emote|vehicle|other';
COMMENT ON COLUMN public.ff_items_catalog.is_public IS 'Whether this item appears on the public /items page';


-- ============================================================================
-- SOURCE: supabase\storage_buckets.sql
-- ============================================================================
-- Create public storage buckets for team logos and tournament banners.
-- Run this in Supabase SQL Editor.

insert into storage.buckets (id, name, public)
values
  ('logos',  'logos',  true),
  ('events', 'events', true)
on conflict (id) do update set public = true;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'Authenticated upload logos'
  ) then
    create policy "Authenticated upload logos"
      on storage.objects for insert to authenticated
      with check (bucket_id = 'logos');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'Public read logos'
  ) then
    create policy "Public read logos"
      on storage.objects for select to public
      using (bucket_id = 'logos');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'Authenticated upload events'
  ) then
    create policy "Authenticated upload events"
      on storage.objects for insert to authenticated
      with check (bucket_id = 'events');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'Public read events'
  ) then
    create policy "Public read events"
      on storage.objects for select to public
      using (bucket_id = 'events');
  end if;
end $$;


-- ============================================================================
-- SOURCE: src\lib\sql\migrate_security_fixes.sql
-- ============================================================================
-- ============================================================
-- SECURITY PATCH: promote_to_super_admin + RLS hardening
-- Run this in Supabase SQL Editor (as super_admin / service role)
-- ============================================================

-- 1. Fix promote_to_super_admin: require caller to already be super_admin
create or replace function public.promote_to_super_admin(target_email text)
returns table(success boolean, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  user_uuid uuid;
begin
  select role into caller_role from public.users where id = auth.uid();
  if caller_role is distinct from 'super_admin' then
    return query select false::boolean, 'Không có quyền thực hiện thao tác này.'::text;
    return;
  end if;

  select id into user_uuid from auth.users where email = target_email;
  if user_uuid is null then
    return query select false::boolean, 'User không tồn tại trong auth.users.'::text;
    return;
  end if;

  update public.users set role = 'super_admin' where id = user_uuid;
  if found then
    return query select true::boolean, ('Đã gán role super_admin cho ' || target_email)::text;
  else
    insert into public.users (id, email, role) values (user_uuid, target_email, 'super_admin');
    return query select true::boolean, ('Đã tạo user ' || target_email || ' với role super_admin')::text;
  end if;
end;
$$;

-- 2. Revoke anon access to this function (unauthenticated callers cannot use it)
revoke execute on function public.promote_to_super_admin(text) from anon;
grant  execute on function public.promote_to_super_admin(text) to authenticated;

-- 3. Tighten "Admin manage users" policy: only super_admin/it/admin may write
drop policy if exists "Admin manage users" on public.users;
create policy "Admin manage users" on public.users
  for all
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.role in ('super_admin', 'admin', 'it')
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.role in ('super_admin', 'admin', 'it')
    )
  );

-- Keep read access for all admins (manager/support need to see user list)
drop policy if exists "Admin read users" on public.users;
create policy "Admin read users" on public.users
  for select
  using (public.is_admin_or_editor());


-- ============================================================================
-- SOURCE: src\lib\sql\migrate_news_views.sql
-- ============================================================================
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


-- ============================================================================
-- SOURCE: src\lib\sql\migrate_news_author_admin_presence.sql
-- ============================================================================
-- Add author tracking to news
ALTER TABLE news ADD COLUMN IF NOT EXISTS created_by_name TEXT;

-- Add last_seen_at for admin presence tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS users_last_seen_at_idx ON users (last_seen_at DESC) WHERE last_seen_at IS NOT NULL;


-- ============================================================================
-- SOURCE: src\lib\sql\migrate_events_views_author.sql
-- ============================================================================
-- Add view tracking and author tracking to events
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by_name TEXT,
  ADD COLUMN IF NOT EXISTS updated_by_name TEXT;

-- Atomic increment helper
CREATE OR REPLACE FUNCTION increment_event_views(event_id UUID)
RETURNS void LANGUAGE sql AS $$
  UPDATE events SET view_count = view_count + 1 WHERE id = event_id;
$$;

-- Allow public (anon) to call the increment function
GRANT EXECUTE ON FUNCTION increment_event_views(UUID) TO anon, authenticated;


-- ============================================================================
-- SOURCE: src\lib\sql\migrate_scheduled_publish.sql
-- ============================================================================
-- Add scheduled_at to news for deferred publishing
-- Run in Supabase Dashboard → SQL Editor

ALTER TABLE news ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- Index for cron to quickly find due articles
CREATE INDEX IF NOT EXISTS idx_news_scheduled_at ON news (scheduled_at)
  WHERE status = 'draft' AND scheduled_at IS NOT NULL;


-- ============================================================================
-- SOURCE: src\lib\sql\migrate_activity_ip_favorites.sql
-- ============================================================================
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


-- ============================================================================
-- SOURCE: src\lib\sql\migrate_points_team.sql
-- ============================================================================
-- Member points & rank
ALTER TABLE users ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rank   TEXT    NOT NULL DEFAULT 'Bronze';

-- Team visibility flag
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_in_team BOOLEAN NOT NULL DEFAULT false;

-- Fast lookup for leaderboard
CREATE INDEX IF NOT EXISTS users_points_idx ON users (points DESC);

-- Atomic point increment helper (callable from server-only routes)
CREATE OR REPLACE FUNCTION increment_user_points(uid UUID, amount INTEGER)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE users SET points = points + amount WHERE id = uid;
$$;
REVOKE EXECUTE ON FUNCTION increment_user_points(UUID, INTEGER) FROM anon;
GRANT  EXECUTE ON FUNCTION increment_user_points(UUID, INTEGER) TO authenticated;


-- ============================================================================
-- SOURCE: src\lib\sql\migrate_achievements.sql
-- ============================================================================
-- Achievement system
CREATE TABLE IF NOT EXISTS user_achievements (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement TEXT        NOT NULL,
  earned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement)
);

CREATE INDEX IF NOT EXISTS user_achievements_user_idx ON user_achievements (user_id);

-- Only owners can see their own achievements; public profiles read via service role
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);


-- ============================================================================
-- SOURCE: src\lib\sql\migrate_login_streak.sql
-- ============================================================================
-- ============================================================
-- Login streak tracking for daily login achievements
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS login_streak    INTEGER   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_login_date DATE      DEFAULT NULL;

-- Index for streak updates
CREATE INDEX IF NOT EXISTS users_last_login_date_idx ON users (last_login_date);


-- ============================================================================
-- SOURCE: src\lib\sql\migrate_user_social_login.sql
-- ============================================================================
-- Extended user profile columns
-- Run this in Supabase SQL editor (once per environment)

-- Verification flag (set by IT/admin)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified  BOOLEAN NOT NULL DEFAULT false;

-- Profile fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio          TEXT    CHECK (char_length(bio) <= 300);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone        TEXT    CHECK (char_length(phone) <= 20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_url   TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_email TEXT   CHECK (char_length(contact_email) <= 120);
ALTER TABLE users ADD COLUMN IF NOT EXISTS ff_id        TEXT    CHECK (ff_id ~ '^\d{6,12}$');
ALTER TABLE users ADD COLUMN IF NOT EXISTS game_profiles JSONB  NOT NULL DEFAULT '[]'::jsonb;

-- Social / link columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_url  TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tiktok_url    TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS youtube_url   TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS website_url   TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_url   TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS twitch_url    TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter_url   TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_url  TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS zalo_url      TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS threads_url   TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_url    TEXT;

-- Fast look-up for team page (show_in_team filter + verified badge)
CREATE INDEX IF NOT EXISTS users_team_idx ON users (show_in_team) WHERE show_in_team = true;


-- ============================================================================
-- SOURCE: src\lib\sql\migrate_user_submissions.sql
-- ============================================================================
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


-- ============================================================================
-- SOURCE: src\lib\sql\migrate_notifications.sql
-- ============================================================================
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


-- ============================================================================
-- SOURCE: src\lib\sql\migrate_reactions_follows.sql
-- ============================================================================
-- News reactions (fire, heart, wow, haha, sad)
CREATE TABLE IF NOT EXISTS news_reactions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id    TEXT        NOT NULL,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction   TEXT        NOT NULL CHECK (reaction IN ('fire', 'heart', 'wow', 'haha', 'sad')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(news_id, user_id)
);

CREATE INDEX IF NOT EXISTS news_reactions_news_idx ON 
news_reactions (news_id);

ALTER TABLE news_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read reactions"
  ON news_reactions FOR SELECT USING (true);

CREATE POLICY "users manage own reactions"
  ON news_reactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- User category follows
CREATE TABLE IF NOT EXISTS user_category_follows (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category   TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, category)
);

CREATE INDEX IF NOT EXISTS user_category_follows_user_idx ON user_category_follows (user_id);

ALTER TABLE user_category_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own follows"
  ON user_category_follows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users manage own follows"
  ON user_category_follows FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================================
-- SOURCE: src\lib\sql\migrate_forum.sql
-- ============================================================================
-- Community forum posts
CREATE TABLE IF NOT EXISTS forum_posts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT        NOT NULL CHECK (length(title) BETWEEN 5 AND 200),
  content      TEXT        NOT NULL CHECK (length(content) BETWEEN 20 AND 20000),
  category     TEXT        NOT NULL DEFAULT 'Thảo luận',
  user_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name TEXT        NOT NULL,
  avatar_url   TEXT,
  view_count   INT         NOT NULL DEFAULT 0,
  reply_count  INT         NOT NULL DEFAULT 0,
  is_pinned    BOOLEAN     NOT NULL DEFAULT false,
  is_locked    BOOLEAN     NOT NULL DEFAULT false,
  status       TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS forum_posts_category_idx    ON forum_posts (category);
CREATE INDEX IF NOT EXISTS forum_posts_created_idx     ON forum_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS forum_posts_user_idx        ON forum_posts (user_id);

ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads active forum posts"
  ON forum_posts FOR SELECT USING (status = 'active');

CREATE POLICY "users create forum posts"
  ON forum_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admins manage forum posts"
  ON forum_posts FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
            AND users.role IN ('super_admin','admin','manager','support'))
  );

-- Forum replies (flat + optional parent for threading)
CREATE TABLE IF NOT EXISTS forum_replies (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      UUID        NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name TEXT        NOT NULL,
  avatar_url   TEXT,
  content      TEXT        NOT NULL CHECK (length(content) BETWEEN 2 AND 3000),
  parent_id    UUID        REFERENCES forum_replies(id) ON DELETE CASCADE,
  status       TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS forum_replies_post_idx      ON forum_replies (post_id, created_at);
CREATE INDEX IF NOT EXISTS forum_replies_user_idx      ON forum_replies (user_id);

ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads active replies"
  ON forum_replies FOR SELECT USING (status = 'active');

CREATE POLICY "users create replies"
  ON forum_replies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admins manage replies"
  ON forum_replies FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
            AND users.role IN ('super_admin','admin','manager','support'))
  );

-- Auto-increment reply_count on forum_posts
CREATE OR REPLACE FUNCTION increment_forum_reply_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE forum_posts SET reply_count = reply_count + 1, updated_at = now()
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_forum_reply_count
  AFTER INSERT ON forum_replies
  FOR EACH ROW EXECUTE FUNCTION increment_forum_reply_count();


-- ============================================================================
-- SOURCE: src\lib\sql\migrate_community_v2.sql
-- ============================================================================
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
  badge         TEXT NOT NULL DEFAULT 'member' CHECK (badge IN ('member','regular','veteran','expert','legend')),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Align badge tiers with the app (contributor-sync.ts / xu-huong UI). Older
-- schemas used ('member','contributor','top_contributor','legend'), which the
-- app never writes — causing upserts to fail the CHECK once a user passed 50
-- points, silently freezing their points. Re-map legacy values then swap CHECK.
DO $$
BEGIN
  UPDATE public.contributor_points SET badge = 'expert'  WHERE badge = 'top_contributor';
  UPDATE public.contributor_points SET badge = 'regular' WHERE badge = 'contributor';
  ALTER TABLE public.contributor_points DROP CONSTRAINT IF EXISTS contributor_points_badge_check;
  ALTER TABLE public.contributor_points
    ADD CONSTRAINT contributor_points_badge_check
    CHECK (badge IN ('member','regular','veteran','expert','legend'));
EXCEPTION WHEN undefined_table THEN
  NULL; -- table not created yet on a fresh bootstrap
END $$;

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


-- ============================================================================
-- SOURCE: src\lib\sql\migrate_character_votes.sql
-- ============================================================================
-- Character roster (admin-managed)
CREATE TABLE IF NOT EXISTS character_votes_config (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT    NOT NULL UNIQUE,
  image_url   TEXT,
  ability     TEXT    NOT NULL DEFAULT '',
  description TEXT    NOT NULL DEFAULT '',
  sort_order  INT     NOT NULL DEFAULT 0,
  season      TEXT    NOT NULL DEFAULT 'S1',
  is_active   BOOLEAN NOT NULL DEFAULT true
);

-- Vote log — one vote per user per season
CREATE TABLE IF NOT EXISTS character_vote_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID        NOT NULL REFERENCES character_votes_config(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season       TEXT        NOT NULL DEFAULT 'S1',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, season)
);

CREATE INDEX IF NOT EXISTS char_vote_char_idx ON character_vote_logs (character_id);
CREATE INDEX IF NOT EXISTS char_vote_season_idx ON character_vote_logs (season);

ALTER TABLE character_votes_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_vote_logs    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads characters"
  ON character_votes_config FOR SELECT USING (is_active = true);

CREATE POLICY "admins manage characters"
  ON character_votes_config FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
                 AND users.role IN ('super_admin','admin','manager')));

CREATE POLICY "anyone reads vote logs"
  ON character_vote_logs FOR SELECT USING (true);

CREATE POLICY "users vote"
  ON character_vote_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users change vote"
  ON character_vote_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Seed popular Free Fire characters (Season 1)
INSERT INTO character_votes_config (name, ability, description, sort_order, season) VALUES
  ('Alok',    'Drop the Beat',        'Tạo vùng aura tăng tốc độ di chuyển và hồi máu liên tục trong vài giây.', 1,  'S1'),
  ('Chrono',  'Time Turner',          'Tạo khiên lực trường ngăn chặn sát thương, tăng tốc độ đồng đội bên trong.', 2,  'S1'),
  ('K',       'Master of All',        'Có hai chế độ: tăng tối đa EP và chuyển đổi EP thành HP liên tục.', 3,  'S1'),
  ('Skyler',  'Riptide Rhythm',       'Phát sóng âm thanh phá hủy Gloo Wall, mỗi Gloo Wall triển khai hồi HP.', 4,  'S1'),
  ('Dimitri', 'Healing Heartbeat',    'Tạo vùng hồi sinh, bản thân và đồng đội trong vùng có thể tự hồi phục khi bị hạ gục.', 5,  'S1'),
  ('Moco',    'Hacker''s Eye',        'Đánh dấu kẻ địch bị bắn, thông tin vị trí chia sẻ cho toàn đội trong vài giây.', 6,  'S1'),
  ('Wukong',  'Camouflage',           'Hóa thân thành bụi cây, kỹ năng hồi chiêu khi tiêu diệt kẻ địch.', 7,  'S1'),
  ('Kapella', 'Healing Song',         'Tăng hiệu ứng kỹ năng hồi phục, giảm tốc độ mất HP khi bị hạ gục.', 8,  'S1'),
  ('Xayne',   'Xtreme Encounter',     'Tăng 80 HP tạm thời và sát thương lên Gloo Wall, Shield trong thời gian ngắn.', 9,  'S1'),
  ('Shirou',  'Damage Delivered',     'Đánh dấu kẻ địch bắn vào mình, đòn bắn đầu tiên xuyên giáp trong thời gian ngắn.', 10, 'S1'),
  ('Jai',     'Raging Reload',        'Tự động nạp đạn một phần khi tiêu diệt kẻ địch với AR, SMG hoặc Shotgun.', 11, 'S1'),
  ('Nairi',   'Ice Iron',             'Gloo Wall đặt xuống hồi phục nhanh hơn và có giáp tăng cường chống đạn.', 12, 'S1')
ON CONFLICT (name) DO NOTHING;


-- ============================================================================
-- SOURCE: src\lib\sql\migrate_tournament_requests.sql
-- ============================================================================
-- Community tournament requests (submitted by users, reviewed by admins)
CREATE TABLE IF NOT EXISTS tournament_requests (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL CHECK (length(name) BETWEEN 5 AND 150),
  format           TEXT        NOT NULL DEFAULT 'squad',
  estimated_date   TEXT,
  max_teams        INT         NOT NULL DEFAULT 8,
  prize_pool       TEXT,
  contact_name     TEXT        NOT NULL,
  contact_discord  TEXT,
  contact_email    TEXT        NOT NULL,
  notes            TEXT,
  status           TEXT        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tournament_requests_status_idx   ON tournament_requests (status);
CREATE INDEX IF NOT EXISTS tournament_requests_created_idx  ON tournament_requests (created_at DESC);

ALTER TABLE tournament_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can request tournament"
  ON tournament_requests FOR INSERT WITH CHECK (true);

CREATE POLICY "admins read tournament requests"
  ON tournament_requests FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
                 AND users.role IN ('super_admin','admin','manager','support')));

CREATE POLICY "admins update tournament requests"
  ON tournament_requests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
                 AND users.role IN ('super_admin','admin','manager')));


-- ============================================================================
-- SOURCE: src\lib\sql\migrate_telegram_subscribers.sql
-- ============================================================================
-- Telegram Mini App subscribers
-- Stores users who opted-in to receive DM notifications from the bot

create table if not exists telegram_subscribers (
  id               uuid        primary key default gen_random_uuid(),
  telegram_user_id bigint      not null,
  first_name       text,
  username         text,
  subscribed_at    timestamptz not null default now(),
  active           boolean     not null default true,
  constraint telegram_subscribers_user_id_unique unique (telegram_user_id)
);

create index if not exists idx_telegram_subscribers_active
  on telegram_subscribers (active)
  where active = true;


-- ============================================================================
-- SOURCE: src\lib\sql\migrate_tg_poll_votes.sql
-- ============================================================================
-- Telegram Mini App poll votes
-- Run in Supabase SQL editor

CREATE TABLE IF NOT EXISTS tg_poll_votes (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id    uuid        NOT NULL REFERENCES polls(id)        ON DELETE CASCADE,
  option_id  uuid        NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  tg_user_id bigint      NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(poll_id, tg_user_id)
);

CREATE INDEX IF NOT EXISTS idx_tg_poll_votes_poll ON tg_poll_votes(poll_id);


-- ============================================================================
-- SOURCE: src\lib\sql\migrate_admin_features.sql
-- ============================================================================
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


-- ============================================================================
-- SOURCE: src\lib\sql\add_profile_privacy.sql
-- ============================================================================
-- Profile visibility toggles
-- Stores which public-profile sections a user wants to show/hide.
-- Shape: { "bio": true, "contact": false, "games": true, "socials": true, "achievements": true }
-- Missing key or missing column = section is visible (default).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS privacy jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.users.privacy IS
  'Per-section public profile visibility. Key false = hidden. Keys: bio, contact, games, socials, achievements.';


-- ============================================================================
-- SOURCE: src\lib\sql\migrate_cskh_and_replies.sql
-- ============================================================================
-- Migration: CSKH support chat + comment replies
-- Run this in your Supabase SQL editor

-- 1. Add parent_id to news_comments (for threaded replies)
ALTER TABLE news_comments
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES news_comments(id) ON DELETE CASCADE;

-- 2. Support chat sessions
CREATE TABLE IF NOT EXISTS support_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  anonymous_id TEXT,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Support chat messages
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES support_sessions(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_support_sessions_status ON support_sessions(status);
CREATE INDEX IF NOT EXISTS idx_support_sessions_last_message ON support_sessions(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_session ON support_messages(session_id, created_at ASC);

-- RLS policies (enable RLS and restrict access)
ALTER TABLE support_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Allow service role (used by server) full access
CREATE POLICY "service_role_sessions" ON support_sessions FOR ALL USING (true);
CREATE POLICY "service_role_messages" ON support_messages FOR ALL USING (true);


-- ============================================================================
-- SOURCE: supabase\emergency_patch.sql
-- ============================================================================
-- ============================================================
-- emergency_patch.sql  — CHẠY NGAY trong Supabase SQL Editor
-- Vá 3 bảng đang bị hở hoàn toàn do USING (true)
-- ============================================================

-- ── 1. support_sessions ──────────────────────────────────────
-- Hiện tại: FOR ALL USING (true) → anon đọc/ghi toàn bộ

DROP POLICY IF EXISTS "service_role_sessions" ON public.support_sessions;

-- Admin đọc + quản lý tất cả
CREATE POLICY "admin manage support_sessions" ON public.support_sessions
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- User chỉ đọc/ghi session của chính mình
CREATE POLICY "owner read support_sessions" ON public.support_sessions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "owner insert support_sessions" ON public.support_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- ── 2. support_messages ──────────────────────────────────────

DROP POLICY IF EXISTS "service_role_messages" ON public.support_messages;

-- Admin đọc + quản lý tất cả
CREATE POLICY "admin manage support_messages" ON public.support_messages
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- User chỉ đọc/ghi message trong session của mình
CREATE POLICY "owner read support_messages" ON public.support_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "owner insert support_messages" ON public.support_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_sessions s
      WHERE s.id = session_id
        AND (s.user_id = auth.uid() OR s.user_id IS NULL)
    )
  );

-- ── 3. admin_activity_logs ───────────────────────────────────
-- "Service role all on activity logs" FOR ALL USING (true) → xoá ngay
-- service_role bypass RLS tự động — không cần policy này

DROP POLICY IF EXISTS "Service role all on activity logs" ON public.admin_activity_logs;
-- Giữ nguyên "Admin/editor view logs" và "Admin/editor insert logs" đã có

-- ── Verify ───────────────────────────────────────────────────
-- Kiểm tra không còn policy USING (true) nào:
-- SELECT schemaname, tablename, policyname, qual
-- FROM pg_policies
-- WHERE qual = 'true' OR qual LIKE '%true%';


-- ============================================================================
-- SOURCE: supabase\security_policies.sql
-- ============================================================================
-- ============================================================
-- security_policies.sql
-- Áp dụng toàn bộ RLS hardening lên production DB.
-- Không đụng bảng users — chạy an toàn khi đang có data.
-- Chạy trong Supabase SQL Editor (một lần, hoặc re-run bất kỳ lúc nào).
-- ============================================================

-- ── 1. HELPER: Sensitive setting keys ───────────────────────────────────────

create or replace function public.is_sensitive_setting_key(k text)
returns boolean
language sql immutable security definer
set search_path = public
as $$
  select k = any(array[
  select k = any(array[ -- THIS IS A SAMPLE LIST, THE REAL ONE IS IN THE APP
    'mail.smtp_pass',
    'mail.smtp_user',
    'mail.smtp_host',
    'mail.from_email',
    'site.discord_webhook',
    'zalo.webhook_url',
    'zalo.group_id',
    'ads.google_adsense_id',
    'ads.slot_header',
    'ads.slot_sidebar',
    'ads.slot_article',
    'integrations.lark_webhook_url',
    'integrations.lark_alerts_webhook_url',
    'tms.payment_info'
  ]);
$$;
revoke execute on function public.is_sensitive_setting_key(text) from anon, authenticated;

-- ── 2. SETTINGS ─────────────────────────────────────────────────────────────

drop policy if exists "Public can read settings"          on public.settings;
drop policy if exists "Public read non-sensitive settings" on public.settings;
drop policy if exists "Auth read non-sensitive settings"   on public.settings;
drop policy if exists "Admin read settings"                on public.settings;
drop policy if exists "Admin manage settings"              on public.settings;

-- Authenticated: chỉ đọc key không nhạy cảm
create policy "Auth read non-sensitive settings" on public.settings
  for select using (auth.uid() is not null and not public.is_sensitive_setting_key(key));

-- Admin: đọc tất cả
create policy "Admin read settings" on public.settings
  for select using (public.is_admin());

-- Admin: ghi tất cả
create policy "Admin manage settings" on public.settings
  for all using (public.is_admin()) with check (public.is_admin());

-- ── 3. EVENTS ───────────────────────────────────────────────────────────────

drop policy if exists "Public can view events"  on public.events;
drop policy if exists "Auth can view events"    on public.events;
drop policy if exists "Admin/editor manage events" on public.events;

create policy "Auth can view events" on public.events
  for select using (auth.uid() is not null);

create policy "Admin/editor manage events" on public.events
  for all using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());

-- ── 4. NEWS ─────────────────────────────────────────────────────────────────

drop policy if exists "Public can view published news"  on public.news;
drop policy if exists "Auth can view published news"    on public.news;
drop policy if exists "Admin/editor manage news"        on public.news;

create policy "Auth can view published news" on public.news
  for select using (auth.uid() is not null and (status = 'published' or public.is_admin_or_editor()));

create policy "Admin/editor manage news" on public.news
  for all using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());

-- ── 5. GALLERY ──────────────────────────────────────────────────────────────

drop policy if exists "Public can view gallery"    on public.gallery;
drop policy if exists "Auth can view gallery"      on public.gallery;
drop policy if exists "Admin/editor manage gallery" on public.gallery;

create policy "Auth can view gallery" on public.gallery
  for select using (auth.uid() is not null);

create policy "Admin/editor manage gallery" on public.gallery
  for all using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());

-- ── 6. COMMENTS ─────────────────────────────────────────────────────────────

drop policy if exists "Public can view approved comments"  on public.news_comments;
drop policy if exists "Auth can view approved comments"    on public.news_comments;
drop policy if exists "Anyone can insert pending comment"  on public.news_comments;
drop policy if exists "Auth can insert pending comment"    on public.news_comments;
drop policy if exists "Admin manage comments"              on public.news_comments;

create policy "Auth can view approved comments" on public.news_comments
  for select using (auth.uid() is not null and (status = 'approved' or public.is_admin_or_editor()));

create policy "Auth can insert pending comment" on public.news_comments
  for insert with check (auth.uid() is not null and status = 'pending');

create policy "Admin manage comments" on public.news_comments
  for all using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());

-- ── 7. RATINGS ──────────────────────────────────────────────────────────────

drop policy if exists "Public can view ratings"  on public.news_ratings;
drop policy if exists "Auth can view ratings"    on public.news_ratings;
drop policy if exists "Anyone can submit rating" on public.news_ratings;
drop policy if exists "Auth can submit rating"   on public.news_ratings;
drop policy if exists "Admin manage ratings"     on public.news_ratings;

create policy "Auth can view ratings" on public.news_ratings
  for select using (auth.uid() is not null);

create policy "Auth can submit rating" on public.news_ratings
  for insert with check (auth.uid() is not null);

create policy "Admin manage ratings" on public.news_ratings
  for all using (public.is_admin()) with check (public.is_admin());

-- ── 8. RATING LIKES ─────────────────────────────────────────────────────────

drop policy if exists "Public can view likes"       on public.rating_likes;
drop policy if exists "Auth can view likes"         on public.rating_likes;
drop policy if exists "Anyone can like"             on public.rating_likes;
drop policy if exists "Auth can like"               on public.rating_likes;
drop policy if exists "Anyone can remove own like"  on public.rating_likes;
drop policy if exists "Auth can remove own like"    on public.rating_likes;

create policy "Auth can view likes"      on public.rating_likes for select using (auth.uid() is not null);
create policy "Auth can like"            on public.rating_likes for insert with check (auth.uid() is not null);
create policy "Auth can remove own like" on public.rating_likes for delete using (auth.uid() is not null);

-- ── 9. RATING REPLIES ───────────────────────────────────────────────────────

drop policy if exists "Public can view replies"  on public.rating_replies;
drop policy if exists "Auth can view replies"    on public.rating_replies;
drop policy if exists "Admin can reply"          on public.rating_replies;
drop policy if exists "Admin manage replies"     on public.rating_replies;

create policy "Auth can view replies" on public.rating_replies
  for select using (auth.uid() is not null);

create policy "Admin can reply" on public.rating_replies
  for insert with check (public.is_admin_or_editor());

create policy "Admin manage replies" on public.rating_replies
  for delete using (public.is_admin_or_editor());

-- ── 10. TMS ─────────────────────────────────────────────────────────────────

drop policy if exists "tms public read teams"          on public.tms_teams;
drop policy if exists "tms auth read teams"            on public.tms_teams;
drop policy if exists "tms public read members"        on public.tms_team_members;
drop policy if exists "tms auth read members"          on public.tms_team_members;
drop policy if exists "tms public read tournaments"    on public.tms_tournaments;
drop policy if exists "tms auth read tournaments"      on public.tms_tournaments;
drop policy if exists "tms public read registrations"  on public.tms_registrations;
drop policy if exists "tms auth read registrations"    on public.tms_registrations;
drop policy if exists "tms public read matches"        on public.tms_matches;
drop policy if exists "tms auth read matches"          on public.tms_matches;
drop policy if exists "tms public read results"        on public.tms_match_results;
drop policy if exists "tms auth read results"          on public.tms_match_results;

create policy "tms auth read teams"         on public.tms_teams         for select using (auth.uid() is not null);
create policy "tms auth read members"       on public.tms_team_members  for select using (auth.uid() is not null);
create policy "tms auth read tournaments"   on public.tms_tournaments   for select using (auth.uid() is not null and (status <> 'draft' or public.is_admin()));
create policy "tms auth read registrations" on public.tms_registrations for select using (auth.uid() is not null);
create policy "tms auth read matches"       on public.tms_matches       for select using (auth.uid() is not null);
create policy "tms auth read results"       on public.tms_match_results for select using (auth.uid() is not null);

drop policy if exists "tms sub public insert" on public.tms_score_submissions;
create policy "tms auth insert submissions" on public.tms_score_submissions
  for insert with check (auth.uid() = user_id);

-- ── Done ─────────────────────────────────────────────────────────────────────
-- Sau khi chạy: anon key không đọc được bất kỳ bảng nào.
-- Service role (server-side app) bypass RLS hoàn toàn — không ảnh hưởng gì.


-- ============================================================================
-- SOURCE: supabase\seed-data.sql
-- ============================================================================
-- ============================================================
-- AREX – SEED INITIAL DATA
-- ============================================================
-- Chạy file này SAU khi đã run schema.sql
-- Location: Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- SEED EVENTS
-- ============================================================
-- No test events seeded. Add real events via admin panel.
-- insert into public.events (title, description, start_date, end_date, image_url, thumbnail_url, link, status)
-- values
--   (
--     'Free Fire Battle Royale Championship 2024',
--     'Giải đấu Battle Royale lớn nhất Việt Nam với tổng tiền thưởng 1 tỷ đồng. Các đội hàng đầu sẽ tranh tài trong 15 trận đấu để tìm ra nhà vô địch.',
--     '2024-04-15'::timestamptz,
--     '2024-04-30'::timestamptz,
--     'https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/697b5d2e34ac088f5b5a4427d57f6281.jpg',
--     'https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/697b5d2e34ac088f5b5a4427d57f6281.jpg',
--     'https://battleground.freefiremobile.com',
--     'upcoming'
--   ),
--   (
--     'CS Xạ Thủ Championship Spring',
--     'Giải đấu CS (Clue Story) dành riêng cho những xạ thủ xuất sắc nhất. Hạn chế vũ khí, chỉ dùng các vũ khí từ trong game.',
--     '2024-05-01'::timestamptz,
--     '2024-05-15'::timestamptz,
--     'https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/0680c1792156b8a80095c669520f019a.jpg',
--     'https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/0680c1792156b8a80095c669520f019a.jpg',
--     'https://communityevent.freefiremobile.com',
--     'active'
--   ),
--   (
--     'Clash Squad Tournament',
--     'Giải đấu 4v4 Clash Squad nhanh gọn, từng trận chỉ kéo dài 10 phút. Phù hợp cho các team muốn luyện tập kỹ năng.',
--     '2024-06-01'::timestamptz,
--     '2024-06-20'::timestamptz,
--     'https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/697b5d2e34ac088f5b5a4427d57f6281.jpg',
--     'https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/697b5d2e34ac088f5b5a4427d57f6281.jpg',
--     null,
--     'upcoming'
--   ),
--   (
--     'Community Fun Event',
--     'Sự kiện vui nhộn dành cho toàn bộ cộng đồng. Các phần thưởng hấp dẫn chờ đã các bạn.',
--     '2024-03-15'::timestamptz,
--     '2024-03-31'::timestamptz,
--     'https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/0680c1792156b8a80095c669520f019a.jpg',
--     'https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/0680c1792156b8a80095c669520f019a.jpg',
--     null,
--     'active'
--   );

-- ============================================================
-- SEED NEWS
-- ============================================================
-- No test news seeded. Add real news via admin panel.
-- insert into public.news (title, slug, excerpt, content, cover, category, status)
-- values
--   (
--     'Update Mới: 5 Vũ Khí Siêu Mạnh Xuất Hiện',
--     'update-vu-khi-sieu-manh',
--     'Garena Free Fire vừa phát hành bản update lớn với 5 vũ khí hoàn toàn mới, mang lại sự thay đổi lớn trong meta game.',
--     '# Bản Update Mới: Vũ Khí Siêu Mạnh
--
-- Garena Free Fire vừa phát hành bản update 5.0 với những thay đổi lớn.
--
-- ## 5 Vũ Khí Mới:
--
-- 1. **Plasma AR** - Súng trường tấn công với công suất sát thương cao
-- 2. **Bolt Sniper** - Súng狙 với tầm bắn siêu xa
-- 3. **Lightning SMG** - Súng tiểu liên tốc độ cao
-- 4. **Firestorm Shotgun** - Shotgun gây sát thương diện rộng
-- 5. **Void Pistol** - Súng lục với hiệu ứng đặc biệt
--
-- ## Thay Đổi Cân Bằng:
--
-- - Các vũ khí cũ được điều chỉnh lại
-- - Map được cải thiện đồ họa
-- - Hệ thống loot được tối ưu hóa
--
-- **Update sẽ có hiệu lực từ ngày 15/03/2024**',
--     'https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/697b5d2e34ac088f5b5a4427d57f6281.jpg',
--     'PATCH NOTE',
--     'published'
--   ),
--   (
--     'Top 10 Pro Player Việt Nam 2024',
--     'top-10-pro-player-viet-nam-2024',
--     'Danh sách những game thủ Free Fire xuất sắc nhất Việt Nam hiện nay với kỹ năng và thành tích đáng nể.',
--     '# Top 10 Pro Player Việt Nam 2024
--
-- Những tên tuổi huyền thoại của cộng đồng Free Fire Việt Nam:
--
-- ## 1. **Góc Tối**
-- - Team: Elite Team
-- - Thành tích: 5 lần vô địch
-- - Kỹ năng: Xạ thủ, chiến thuật
--
-- ## 2. **Sky Player**
-- - Team: Phoenix eSports
-- - Thành tích: 3 lần vô địch
-- - Kỹ năng: AWM, CQB
--
-- ## 3. **King Vane**
-- - Team: Saigon Buffalo
-- - Thành tích: 2 lần vô địch
-- - Kỹ năng: IGL, chiến lược
--
-- Còn 7 người nữa... Bạn có biết họ là ai?
--
-- **Bạn muốn thêm vào top của bạn không? Hãy tham gia giải đấu sắp tới!**',
--     'https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/0680c1792156b8a80095c669520f019a.jpg',
--     'ESPORTS',
--     'published'
--   ),
--   (
--     'Hướng Dẫn Chơi Map Bermuda Mới',
--     'huong-dan-choi-map-bermuda-moi',
--     'Tìm hiểu những thay đổi mới trên map Bermuda và các chiến lược để thắng lớn.',
--     '# Hướng Dẫn Chơi Map Bermuda Cập Nhật
--
-- Map Bermuda đã được cải thiện đồ họa và bổ sung các khu vực mới.
--
-- ## Những Thay Đổi Chính:
--
-- - **Khu vực bãi biển:** Thêm các công trình phòng thủ mới
-- - **Thung lũng:** Được mở rộng, có thêm loot
-- - **Thành phố:** Được thiết kế lại, dễ chuyển động hơn
--
-- ## Chiến Lược Chơi:
--
-- 1. **Drop đúng khu vực:** Tránh khu vực có quá nhiều người
-- 2. **Loot nhanh:** Vào nhà sớm, loot chuẩn bị
-- 3. **Giữ đội hình:** Không đi một mình
-- 4. **Quản lý zone:** Dự đoán zone tiếp theo
--
-- **Với những chiến lược này, tỷ lệ thắng của bạn sẽ tăng 50%!**',
--     'https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/697b5d2e34ac088f5b5a4427d57f6281.jpg',
--     'CỘng ĐỘI',
--     'published'
--   ),
--   (
--     'Ngôi Sao Mới: Nhân Vật Iris Ra Mắt',
--     'nhan-vat-iris-ra-mat',
--     'Nhân vật mới Iris (bạn gái của Kelly) chính thức ra mắt với kỹ năng độc đáo.',
--     '# Nhân Vật Mới: Iris
--
-- Cuối cùng, người bạn gái của Kelly cuối cùng cũng xuất hiện!
--
-- ## Thông Tin Iris:

- **Tên đầy đủ:** Iris
- **Kỹ năng:** Tạo ra một bong bóng bảo vệ
- **Ưu điểm:** Tốt cho chơi phòng thủ
- **Nhược điểm:** Bong bóng dễ vỡ

## Cách Sử Dụng:

Iris rất hữu ích cho:
- Chơi trong nhà
- Chống AWM sniper
- Bảo vệ đồng đội

**Bạn có thích Iris không? Hãy unlock cô ấy ngay!**',
    'https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/0680c1792156b8a80095c669520f019a.jpg',
    'CỘNG ĐỒNG',
    'published'
  );

-- ============================================================
-- SEED GALLERY
-- ============================================================
insert into public.gallery (image_url, tag)
values
  ('https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/697b5d2e34ac088f5b5a4427d57f6281.jpg', 'Battle Royale'),
  ('https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/0680c1792156b8a80095c669520f019a.jpg', 'Tournament'),
  ('https://images.unsplash.com/photo-1538481143235-b311b6c4e17b?w=800', 'Gaming'),
  ('https://images.unsplash.com/photo-1552820728-8ac41f1ce891?w=800', 'Team Play'),
  ('https://images.unsplash.com/photo-1614613535308-eb5fbd219f90?w=800', 'Esports'),
  ('https://images.unsplash.com/photo-1516968124164-a52b6c07b936?w=800', 'Gaming Gear'),
  ('https://images.unsplash.com/photo-1460925895917-aeb19be489c7?w=800', 'Victory'),
  ('https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=800', 'Community');

-- ============================================================
-- VERIFY SEED DATA
-- ============================================================
-- Run these queries to verify data was inserted correctly:
--
-- SELECT COUNT(*) as total_events FROM public.events;
-- → Expected: 4
--
-- SELECT COUNT(*) as total_news FROM public.news;
-- → Expected: 4
--
-- SELECT COUNT(*) as total_gallery FROM public.gallery;
-- → Expected: 8
--
-- SELECT * FROM public.settings LIMIT 5;
-- → Expected: 13 rows from schema.sql
--

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
-- ✅ Seed data inserted successfully!
--
-- Next steps:
-- 1. Create admin account (admin@arex.tech)
-- 2. Test login at /admin
-- 3. Verify dashboard shows this data
-- 4. Deploy to Vercel when ready

-- ============================================================
-- ROLES: KHÔNG ép CHECK constraint cứng.
-- Role do app quản lý (settings.permissions.custom_roles + role_capabilities).
-- Nhờ vậy tạo thêm role mới trong admin là dùng được ngay, KHÔNG cần chạy
-- migration DB mỗi lần thêm role ("tự đồng bộ"). Câu lệnh này chạy CUỐI cùng
-- nên là trạng thái sau chót: bỏ mọi ràng buộc role còn sót từ các bản cũ.
-- ============================================================
alter table if exists public.users drop constraint if exists users_role_check;
