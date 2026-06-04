-- ============================================================================
-- User-to-User Follow System
-- ============================================================================
-- Allows users to follow each other; integrates with notification system.

CREATE TABLE IF NOT EXISTS public.user_user_follows (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_user_follows_unique UNIQUE (follower_id, following_id),
  CONSTRAINT user_user_follows_no_self CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS user_user_follows_follower_idx ON public.user_user_follows (follower_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_user_follows_following_idx ON public.user_user_follows (following_id, created_at DESC);

ALTER TABLE public.user_user_follows ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read follows (used to display counts/lists)
DROP POLICY IF EXISTS "user_follows_read_all" ON public.user_user_follows;
CREATE POLICY "user_follows_read_all"
  ON public.user_user_follows
  FOR SELECT
  USING (true);

-- Users can only follow as themselves
DROP POLICY IF EXISTS "user_follows_insert_own" ON public.user_user_follows;
CREATE POLICY "user_follows_insert_own"
  ON public.user_user_follows
  FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- Users can only unfollow their own relationships
DROP POLICY IF EXISTS "user_follows_delete_own" ON public.user_user_follows;
CREATE POLICY "user_follows_delete_own"
  ON public.user_user_follows
  FOR DELETE
  USING (auth.uid() = follower_id);
