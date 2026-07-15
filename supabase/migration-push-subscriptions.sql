-- Tách push subscriptions ra bảng riêng (thay vì lưu chung 1 ô settings JSON).
-- Chạy 1 lần trên Supabase SQL editor.

create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  endpoint     text not null unique,
  subscription jsonb not null,   -- object PushSubscription đầy đủ { endpoint, keys }
  created_at   timestamptz not null default now()
);

-- Chỉ service role (API routes) truy cập — không mở cho anon/authenticated.
alter table public.push_subscriptions enable row level security;
-- (không tạo policy nào → mọi client thường bị chặn; service role bypass RLS)
