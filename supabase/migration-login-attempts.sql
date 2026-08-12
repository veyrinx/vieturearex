-- ============================================================
-- Chặn đăng nhập sai nhiều lần — bảng đếm dùng chung
--
-- `login-guard.ts` vốn hỏi bảng này rồi nuốt lỗi và rơi về đếm trong bộ nhớ
-- tiến trình. Bảng chưa từng được tạo, nên trên thực tế mỗi instance đếm riêng
-- và khởi động lại là quên sạch: ngưỡng cảnh báo 10 lần và khoá 20 lần gần như
-- không bao giờ chạm tới. Có bảng này thì số lần sai mới sống qua restart và
-- dùng chung giữa các instance.
--
-- Vòng đời một dòng:
--   sai lần đầu   → tạo dòng, count = 1
--   sai tiếp      → count tăng dần, tới 20 thì đặt banned_until = now + 30 ngày
--   đăng nhập được → xoá hẳn dòng (resetLoginAttempts)
--
-- Không có policy nào bên dưới là cố ý: chỉ service role chạm được, PostgREST
-- công khai không đọc nổi danh sách IP đang bị khoá.
--
-- Chạy 1 lần trên Supabase SQL editor. An toàn khi chạy lại.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.login_attempts (
  ip           text PRIMARY KEY,
  count        integer     NOT NULL DEFAULT 0,
  banned_until timestamptz,
  last_attempt timestamptz NOT NULL DEFAULT now()
);

-- Lọc nhanh danh sách đang bị khoá cho trang an ninh.
CREATE INDEX IF NOT EXISTS login_attempts_banned_idx
  ON public.login_attempts(banned_until)
  WHERE banned_until IS NOT NULL;

-- Dọn dòng cũ: IP sai vài lần rồi bỏ đi thì không ai xoá hộ.
CREATE INDEX IF NOT EXISTS login_attempts_last_idx
  ON public.login_attempts(last_attempt);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Kiểm tra sau khi chạy: phải trả về 0 dòng chứ không phải lỗi "không tìm thấy bảng".
-- SELECT count(*) FROM public.login_attempts;
