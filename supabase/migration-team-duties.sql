-- ============================================================
-- Arex — Mảng phụ trách & việc đang làm của đội ngũ quản trị
--
-- Trang /team trước đây chỉ hiện tên + chức vụ chung (Admin, Manager…) nên
-- người ngoài không biết ai lo mảng nào, còn Google thì không có gì để đọc
-- ngoài mấy cái tên. Bốn cột dưới đây cho phép khai rõ từng người:
--
--   team_title  Chức danh cụ thể ("Trưởng ban Nội dung") — khác role kỹ thuật.
--   team_duties Mảng phụ trách, dạng JSON array chuỗi: ["Tin tức","Sự kiện"].
--   team_focus  Đang làm gì — một dòng ngắn, admin tự cập nhật.
--   team_order  Thứ tự hiển thị; nhỏ hơn đứng trước, bằng nhau thì theo role.
--
-- Chạy tay trên Supabase SQL Editor. Chạy lại nhiều lần không sao.
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS team_title  text,
  ADD COLUMN IF NOT EXISTS team_duties jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS team_focus  text,
  ADD COLUMN IF NOT EXISTS team_order  integer NOT NULL DEFAULT 0;

-- Chặn dữ liệu rác: team_duties phải là mảng, không phải object/chuỗi. Không có
-- ràng buộc này thì một lần ghi sai kiểu là trang /team vỡ lúc render.
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_team_duties_is_array;
ALTER TABLE public.users ADD CONSTRAINT users_team_duties_is_array CHECK (
  jsonb_typeof(team_duties) = 'array'
);

-- Độ dài vừa đủ để hiển thị gọn trên thẻ thành viên.
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_team_title_len;
ALTER TABLE public.users ADD CONSTRAINT users_team_title_len CHECK (
  team_title IS NULL OR char_length(team_title) <= 60
);

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_team_focus_len;
ALTER TABLE public.users ADD CONSTRAINT users_team_focus_len CHECK (
  team_focus IS NULL OR char_length(team_focus) <= 160
);

-- Trang /team sắp theo team_order rồi mới tới role, nên đánh chỉ mục kèm luôn
-- điều kiện lọc sẵn có.
CREATE INDEX IF NOT EXISTS users_team_order_idx
  ON public.users (team_order, created_at)
  WHERE show_in_team = true;
