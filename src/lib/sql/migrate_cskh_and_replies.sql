-- Migration: CSKH support chat + comment replies
-- Run this in your Supabase SQL editor

-- 1. Add parent_id to news_comments (for threaded replies)
ALTER TABLE news_comments
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES news_comments(id) ON DELETE CASCADE;

-- 2. Support chat sessions
CREATE TABLE IF NOT EXISTS support_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  anonymous_id TEXT,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Support chat messages
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES support_sessions(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_support_sessions_status ON support_sessions(status);
CREATE INDEX IF NOT EXISTS idx_support_sessions_last_message ON support_sessions(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_session ON support_messages(session_id, created_at ASC);

-- RLS policies (enable RLS and restrict access)
ALTER TABLE support_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Allow service role (used by server) full access
CREATE POLICY "service_role_sessions" ON support_sessions FOR ALL USING (true);
CREATE POLICY "service_role_messages" ON support_messages FOR ALL USING (true);
