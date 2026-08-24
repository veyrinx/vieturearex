-- Bot Zalo (bot.zapps.vn) — liên kết tài khoản + danh sách chat để phát tin.
-- Chạy 1 lần trên Supabase SQL Editor. An toàn chạy lại.

-- Liên kết: 1 zalo_user_id <-> 1 user_id Arex.
create table if not exists public.zalo_account_links (
  zalo_user_id text primary key,
  user_id      uuid not null unique references public.users(id) on delete cascade,
  linked_at    timestamptz not null default now()
);
alter table public.zalo_account_links enable row level security;

-- Mã liên kết dùng 1 lần (tạo ở /zalo-link, gõ "lienket MÃ" cho bot).
create table if not exists public.zalo_link_codes (
  code       text primary key,
  user_id    uuid not null references public.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists zalo_link_codes_user_idx on public.zalo_link_codes (user_id);
alter table public.zalo_link_codes enable row level security;

-- Chat đã nhắn bot (1-1 hoặc nhóm) — dùng để gửi thông báo về sau.
create table if not exists public.zalo_bot_chats (
  chat_id      text primary key,
  chat_type    text,
  display_name text,
  last_seen_at timestamptz not null default now(),
  is_active    boolean not null default true
);
alter table public.zalo_bot_chats enable row level security;

-- Không tạo policy: chỉ service role (API server) đọc/ghi, anon không đụng tới.
