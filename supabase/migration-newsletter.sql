-- Đăng ký nhận tin qua email. Chạy 1 lần trên Supabase SQL editor.

create table if not exists public.newsletter_subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz not null default now()
);

-- Chỉ service role (API) truy cập — không mở cho anon/authenticated.
alter table public.newsletter_subscribers enable row level security;
