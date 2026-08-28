-- ============================================================
-- events.server_region — cột chia server cho sự kiện
--
-- Toàn bộ code (form admin, chip lọc, badge, tìm kiếm, cron nhắc sự kiện) đã
-- viết theo cột này từ lâu, nhưng cột chưa từng được tạo trên CSDL đang chạy.
-- Hậu quả: mọi lần lưu sự kiện đều bị lớp fallback trong content-service âm
-- thầm cắt bỏ server_region, nên không sự kiện nào có server → badge không
-- hiện, chip lọc server nào cũng ra rỗng; còn /api/search và cron
-- event-reminders (select thẳng cột này) thì lỗi 400.
--
-- Chạy 1 lần trên Supabase SQL editor (cần quyền chủ bảng — service_role qua
-- exec_sql KHÔNG chạy được ALTER TABLE). An toàn khi chạy lại.
-- ============================================================

ALTER TABLE IF EXISTS public.events
  ADD COLUMN IF NOT EXISTS server_region text;

CREATE INDEX IF NOT EXISTS events_server_region_idx
  ON public.events(server_region);

-- Sự kiện cũ đều là sự kiện Free Fire VN → gán 'vn' để chip lọc có dữ liệu.
-- Bỏ dòng này nếu muốn tự gán tay từng sự kiện trong trang admin.
UPDATE public.events
   SET server_region = 'vn'
 WHERE server_region IS NULL;
