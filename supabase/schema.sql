-- ============================================================
-- AREX – Supabase Schema
-- Chạy toàn bộ file này trong Supabase SQL Editor
-- ============================================================

create extension if not exists pgcrypto;

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
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role in ('super_admin', 'admin', 'manager', 'support')
  );
$$;

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
create policy "Public can view events" on public.events for select using (true);

drop policy if exists "Admin/editor manage events" on public.events;
create policy "Admin/editor manage events" on public.events for all
using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());

-- ============================================================
-- POLICIES – NEWS
-- ============================================================

drop policy if exists "Public can view published news" on public.news;
create policy "Public can view published news" on public.news for select
using (status = 'published' or public.is_admin_or_editor());

drop policy if exists "Admin/editor manage news" on public.news;
create policy "Admin/editor manage news" on public.news for all
using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());

-- ============================================================
-- POLICIES – GALLERY
-- ============================================================

drop policy if exists "Public can view gallery" on public.gallery;
create policy "Public can view gallery" on public.gallery for select using (true);

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

drop policy if exists "Public can read settings" on public.settings;
create policy "Public can read settings" on public.settings for select using (true);

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
create policy "Public can view approved comments" on public.news_comments for select
using (status = 'approved' or public.is_admin_or_editor());

drop policy if exists "Anyone can insert pending comment" on public.news_comments;
create policy "Anyone can insert pending comment" on public.news_comments for insert
with check (status = 'pending');

drop policy if exists "Admin manage comments" on public.news_comments;
create policy "Admin manage comments" on public.news_comments for all
using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());

-- ============================================================
-- POLICIES – NEWS RATINGS
-- ============================================================

drop policy if exists "Public can view ratings" on public.news_ratings;
create policy "Public can view ratings" on public.news_ratings for select using (true);

drop policy if exists "Anyone can submit rating" on public.news_ratings;
create policy "Anyone can submit rating" on public.news_ratings for insert with check (true);

drop policy if exists "Admin manage ratings" on public.news_ratings;
create policy "Admin manage ratings" on public.news_ratings for all
using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- POLICIES – RATING LIKES
-- ============================================================

drop policy if exists "Public can view likes" on public.rating_likes;
create policy "Public can view likes" on public.rating_likes for select using (true);

drop policy if exists "Anyone can like" on public.rating_likes;
create policy "Anyone can like" on public.rating_likes for insert with check (true);

drop policy if exists "Anyone can remove own like" on public.rating_likes;
create policy "Anyone can remove own like" on public.rating_likes for delete using (true);

-- ============================================================
-- POLICIES – RATING REPLIES
-- ============================================================

drop policy if exists "Public can view replies" on public.rating_replies;
create policy "Public can view replies" on public.rating_replies for select using (true);

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
