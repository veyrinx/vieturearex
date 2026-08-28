-- ============================================================
-- zalo_bot_chats.server_region — mỗi nhóm Zalo theo dõi một server
--
-- Nhóm cộng đồng VN không cần biết sự kiện server BR hay IN, mà bot đang đăng
-- tất cho tất cả. Có cột này thì:
--   • lệnh ".server vn" trong nhóm ghi lại server nhóm đó theo dõi;
--   • ".sukien" chỉ trả sự kiện đúng server ấy;
--   • luồng tự đăng bỏ qua nhóm khác server (nhóm chưa đặt vẫn nhận tất).
--
-- Chạy 1 lần trên Supabase SQL editor. An toàn khi chạy lại.
-- ============================================================

ALTER TABLE IF EXISTS public.zalo_bot_chats
  ADD COLUMN IF NOT EXISTS server_region text;

CREATE INDEX IF NOT EXISTS zalo_bot_chats_server_region_idx
  ON public.zalo_bot_chats(server_region);
