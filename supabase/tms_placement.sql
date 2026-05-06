-- Add placement column to score submissions.
-- Run in Supabase SQL Editor.

alter table tms_score_submissions
  add column if not exists placement integer;
