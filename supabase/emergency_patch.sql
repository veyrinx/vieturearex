-- ============================================================
-- emergency_patch.sql  — CHẠY NGAY trong Supabase SQL Editor
-- Vá 3 bảng đang bị hở hoàn toàn do USING (true)
-- ============================================================

-- ── 1. support_sessions ──────────────────────────────────────
-- Hiện tại: FOR ALL USING (true) → anon đọc/ghi toàn bộ

DROP POLICY IF EXISTS "service_role_sessions" ON public.support_sessions;

-- Admin đọc + quản lý tất cả
CREATE POLICY "admin manage support_sessions" ON public.support_sessions
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- User chỉ đọc/ghi session của chính mình
CREATE POLICY "owner read support_sessions" ON public.support_sessions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "owner insert support_sessions" ON public.support_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- ── 2. support_messages ──────────────────────────────────────

DROP POLICY IF EXISTS "service_role_messages" ON public.support_messages;

-- Admin đọc + quản lý tất cả
CREATE POLICY "admin manage support_messages" ON public.support_messages
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- User chỉ đọc/ghi message trong session của mình
CREATE POLICY "owner read support_messages" ON public.support_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "owner insert support_messages" ON public.support_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_sessions s
      WHERE s.id = session_id
        AND (s.user_id = auth.uid() OR s.user_id IS NULL)
    )
  );

-- ── 3. admin_activity_logs ───────────────────────────────────
-- "Service role all on activity logs" FOR ALL USING (true) → xoá ngay
-- service_role bypass RLS tự động — không cần policy này

DROP POLICY IF EXISTS "Service role all on activity logs" ON public.admin_activity_logs;
-- Giữ nguyên "Admin/editor view logs" và "Admin/editor insert logs" đã có

-- ── Verify ───────────────────────────────────────────────────
-- Kiểm tra không còn policy USING (true) nào:
-- SELECT schemaname, tablename, policyname, qual
-- FROM pg_policies
-- WHERE qual = 'true' OR qual LIKE '%true%';
