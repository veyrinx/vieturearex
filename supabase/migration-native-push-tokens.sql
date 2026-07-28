-- Token thông báo đẩy của app native iOS/Android (vỏ Capacitor ở thư mục mobile/).
-- Khác push_subscriptions (Web Push của trình duyệt): đây là token FCM (Android)
-- hoặc APNs (iOS). Chạy 1 lần trên Supabase SQL editor.

create table if not exists public.native_push_tokens (
  id         uuid primary key default gen_random_uuid(),
  token      text not null unique,          -- token FCM / APNs
  platform   text not null check (platform in ('ios', 'android')),
  user_id    uuid references public.users (id) on delete set null,
  app_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists native_push_tokens_user_idx on public.native_push_tokens (user_id);
create index if not exists native_push_tokens_platform_idx on public.native_push_tokens (platform);

-- Chỉ service role (API routes) truy cập — không mở cho anon/authenticated.
alter table public.native_push_tokens enable row level security;
-- (không tạo policy nào → client thường bị chặn; service role bypass RLS)
