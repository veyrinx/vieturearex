-- ============================================================
-- EVENT COMMENTS — Migration
-- Chạy trong Supabase SQL Editor (sau schema.sql)
-- ============================================================

create table if not exists public.event_comments (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  user_id      uuid references public.users(id) on delete set null,
  display_name text not null check (char_length(display_name) <= 80),
  content      text not null check (char_length(content) >= 2 and char_length(content) <= 1000),
  status       text not null check (status in ('pending', 'approved', 'rejected')) default 'pending',
  parent_id    uuid references public.event_comments(id) on delete cascade,
  created_at   timestamptz not null default now()
);

create index if not exists event_comments_event_id_idx   on public.event_comments(event_id);
create index if not exists event_comments_status_idx     on public.event_comments(status);
create index if not exists event_comments_created_at_idx on public.event_comments(created_at desc);
create index if not exists event_comments_parent_id_idx  on public.event_comments(parent_id);

alter table public.event_comments enable row level security;

drop policy if exists "Auth can view approved event comments" on public.event_comments;
create policy "Auth can view approved event comments" on public.event_comments for select
using (auth.uid() is not null and (status = 'approved' or public.is_admin_or_editor()));

drop policy if exists "Auth can insert pending event comment" on public.event_comments;
create policy "Auth can insert pending event comment" on public.event_comments for insert
with check (auth.uid() is not null and status = 'pending');

drop policy if exists "Admin manage event comments" on public.event_comments;
create policy "Admin manage event comments" on public.event_comments for all
using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());
