-- BXH độ khủng nick (người dùng tự khai điểm từ máy ước tính). Chạy 1 lần.

create table if not exists public.account_scores (
  id         uuid primary key default gen_random_uuid(),
  ff_name    text not null unique,
  score      integer not null check (score >= 0 and score <= 100000),
  tier       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists account_scores_score_idx on public.account_scores (score desc);

-- Chỉ service role (API) ghi; đọc qua server. Không mở cho anon.
alter table public.account_scores enable row level security;
