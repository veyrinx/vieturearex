-- Add server/region field to tournaments and teams.
-- Run in Supabase SQL Editor.

alter table tms_tournaments
  add column if not exists server text not null default 'vn'
  check (server in ('vn', 'sg', 'global'));

alter table tms_teams
  add column if not exists server text not null default 'vn'
  check (server in ('vn', 'sg', 'global'));
