-- Điểm Quiz theo tài khoản (dùng cho BXH Quiz trong Mini App).
-- Chạy 1 lần. An toàn chạy lại.

create table if not exists public.quiz_scores (
  user_id     uuid primary key references public.users(id) on delete cascade,
  best_score  integer not null default 0,
  best_total  integer not null default 0,
  plays       integer not null default 0,
  updated_at  timestamptz not null default now()
);

create index if not exists quiz_scores_best_idx on public.quiz_scores (best_score desc);

alter table public.quiz_scores enable row level security;
-- Chỉ service role (API) ghi; đọc qua server.
