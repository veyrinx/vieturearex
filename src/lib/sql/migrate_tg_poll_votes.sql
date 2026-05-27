-- Telegram Mini App poll votes
-- Run in Supabase SQL editor

CREATE TABLE IF NOT EXISTS tg_poll_votes (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id    uuid        NOT NULL REFERENCES polls(id)        ON DELETE CASCADE,
  option_id  uuid        NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  tg_user_id bigint      NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(poll_id, tg_user_id)
);

CREATE INDEX IF NOT EXISTS idx_tg_poll_votes_poll ON tg_poll_votes(poll_id);
