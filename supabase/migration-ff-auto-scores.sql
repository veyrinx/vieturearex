-- BXH nick khủng TỰ ĐỘNG (chỉ tài khoản VN) — tự chấm điểm từ dữ liệu thật
-- khi có người tra cứu nick qua công cụ FF. Không cần định giá tay / không cần login.
--
-- Chạy 1 lần trong Supabase SQL editor.

create table if not exists public.ff_auto_scores (
  ff_id         text primary key,
  nickname      text,
  region        text,
  level         integer     default 0,
  likes         integer     default 0,
  exp           bigint      default 0,
  br_rank_point integer     default 0,
  score         integer     default 0,
  lookups       integer     default 1,   -- số lần được tra cứu
  updated_at    timestamptz default now()
);

create index if not exists idx_ff_auto_scores_score  on public.ff_auto_scores (score desc);
create index if not exists idx_ff_auto_scores_region on public.ff_auto_scores (region);

-- Đọc công khai; ghi chỉ qua service role (bypass RLS).
alter table public.ff_auto_scores enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ff_auto_scores' and policyname = 'ff_auto_scores_read'
  ) then
    create policy "ff_auto_scores_read" on public.ff_auto_scores for select using (true);
  end if;
end $$;
