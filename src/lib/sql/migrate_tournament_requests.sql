-- Community tournament requests (submitted by users, reviewed by admins)
CREATE TABLE IF NOT EXISTS tournament_requests (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL CHECK (length(name) BETWEEN 5 AND 150),
  format           TEXT        NOT NULL DEFAULT 'squad',
  estimated_date   TEXT,
  max_teams        INT         NOT NULL DEFAULT 8,
  prize_pool       TEXT,
  contact_name     TEXT        NOT NULL,
  contact_discord  TEXT,
  contact_email    TEXT        NOT NULL,
  notes            TEXT,
  status           TEXT        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tournament_requests_status_idx   ON tournament_requests (status);
CREATE INDEX IF NOT EXISTS tournament_requests_created_idx  ON tournament_requests (created_at DESC);

ALTER TABLE tournament_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can request tournament"
  ON tournament_requests FOR INSERT WITH CHECK (true);

CREATE POLICY "admins read tournament requests"
  ON tournament_requests FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
                 AND users.role IN ('super_admin','admin','manager','support')));

CREATE POLICY "admins update tournament requests"
  ON tournament_requests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
                 AND users.role IN ('super_admin','admin','manager')));
