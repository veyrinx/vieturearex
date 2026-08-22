-- Bảng người theo dõi bot Telegram (đăng ký nhận DM từ bot / Mini App).
-- Có trong supabase/schema.sql nhưng CHƯA từng chạy trên project
-- kjqqukageltvdohkakxb → /start và Mini App gọi subscribeUser() đều nuốt lỗi
-- "Could not find the table 'public.telegram_subscribers'".
-- Chạy trong Admin → SQL, hoặc Supabase SQL editor.

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

-- Chỉ service role (bot/webhook) đụng vào bảng này; không policy nào = anon/
-- authenticated không đọc được gì.
alter table telegram_subscribers enable row level security;
