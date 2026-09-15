-- ============================================================
-- Mã khôi phục dùng một lần cho /api/admin/ff-items/import
--
-- Kịch bản: site chính gặp sự cố, dựng site mới nhưng chưa có tài khoản
-- admin/Supabase hoạt động để đăng nhập bình thường. Admin đang đăng nhập
-- được ở site (còn sống) tạo một mã ký bằng APP_SECRET (xem
-- src/lib/server/ff-items-recovery.ts), mang mã đó gọi thẳng route import
-- trên site mới kèm header `x-recovery-token` — không cần phiên đăng nhập.
--
-- Bảng này chỉ giữ đúng một việc: đánh dấu mã đã dùng, chống phát lại (replay).
-- Chữ ký JWT (APP_SECRET) đã tự lo phần "mã có hợp lệ/còn hạn không" — bảng
-- này lo phần chữ ký không tự lo được: "mã đã dùng chưa".
--
-- Chạy 1 lần trên Supabase SQL editor. An toàn khi chạy lại.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ff_items_recovery_tokens (
  jti         text PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  used_at     timestamptz
);

CREATE INDEX IF NOT EXISTS ff_items_recovery_tokens_used_at_idx
  ON public.ff_items_recovery_tokens(used_at);

ALTER TABLE public.ff_items_recovery_tokens ENABLE ROW LEVEL SECURITY;

-- Không policy công khai nào cả — bảng chỉ được đụng tới qua service-role
-- client (createAdminSupabaseClient), route nào cũng tự kiểm quyền/chữ ký
-- trước khi chạm bảng này.
