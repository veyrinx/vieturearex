-- Add damage column to score submissions.
-- Run in Supabase SQL Editor.

alter table tms_score_submissions
  add column if not exists damage integer not null default 0;
