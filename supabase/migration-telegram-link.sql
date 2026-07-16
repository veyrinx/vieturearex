-- Liên kết tài khoản Telegram Mini App <-> tài khoản site.
-- Chạy 1 lần. An toàn chạy lại.

-- Bảng liên kết: 1 telegram_user_id <-> 1 user_id.
create table if not exists public.telegram_account_links (
  telegram_user_id bigint primary key,
  user_id          uuid not null unique references public.users(id) on delete cascade,
  linked_at        timestamptz not null default now()
);
alter table public.telegram_account_links enable row level security;

-- Mã liên kết dùng 1 lần (tạo trên web, nhập trong Mini App).
create table if not exists public.telegram_link_codes (
  code       text primary key,
  user_id    uuid not null references public.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists telegram_link_codes_user_idx on public.telegram_link_codes (user_id);
alter table public.telegram_link_codes enable row level security;

-- Chỉ service role (API) đọc/ghi. Không mở cho anon.
