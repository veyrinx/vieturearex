-- Tên định danh (handle) cho URL /u/<handle> — chỉ quản trị viên đặt.
-- User thường vẫn dùng UUID. Handle 3–20 ký tự: a-z, 0-9, _.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS handle text;

-- Định dạng hợp lệ (cho phép NULL = không đặt handle)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_handle_valid;
ALTER TABLE public.users ADD CONSTRAINT users_handle_valid CHECK (
  handle IS NULL OR handle ~ '^[a-z0-9_]{3,20}$'
);

-- Duy nhất, không phân biệt hoa/thường (dù handle luôn lưu chữ thường)
CREATE UNIQUE INDEX IF NOT EXISTS users_handle_lower_idx
  ON public.users (lower(handle))
  WHERE handle IS NOT NULL;
