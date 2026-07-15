-- BXH độ khủng nick — gắn theo tài khoản người chơi (lấy ID FF từ hồ sơ, không nhập tay).
-- Chạy 1 lần. An toàn chạy lại (drop bảng cũ nếu có).

drop table if exists public.account_scores;

create table public.account_scores (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null unique references public.users(id) on delete cascade,
  ff_id        text,
  display_name text,
  avatar_url   text,
  score        integer not null check (score >= 0 and score <= 100000),
  tier         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists account_scores_score_idx on public.account_scores (score desc);

-- Chỉ service role (API) ghi; đọc qua server. Không mở cho anon.
alter table public.account_scores enable row level security;
