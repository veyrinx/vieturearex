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

-- Sự kiện cũ: đoán server từ chính URL ảnh, y hệt luật guessServerFromImageUrl
-- trong src/lib/constants/event-servers.ts — ảnh Free Fire mang sẵn mã vùng
-- ("/Local/VN/", "OB47VN"). Không đoán được thì để 'vn': site phục vụ cộng đồng
-- VN, và admin sửa lại trong trang quản trị bằng bộ lọc "Chưa gán server".
UPDATE public.events
   SET server_region = CASE
         WHEN image_url ~* '/Local/(VN|VI)/' OR image_url ~* 'OB[0-9]+VN[_./-]' THEN 'vn'
         WHEN image_url ~* '/Local/BR/'      OR image_url ~* 'OB[0-9]+BR[_./-]' THEN 'br'
         WHEN image_url ~* '/Local/(IN|IND)/' OR image_url ~* 'OB[0-9]+IN[_./-]' THEN 'in'
         WHEN image_url ~* '/Local/ID/'      OR image_url ~* 'OB[0-9]+ID[_./-]' THEN 'id'
         WHEN image_url ~* '/Local/TH/'      OR image_url ~* 'OB[0-9]+TH[_./-]' THEN 'th'
         WHEN image_url ~* '/Local/PH/'      OR image_url ~* 'OB[0-9]+PH[_./-]' THEN 'ph'
         WHEN image_url ~* '/Local/TW/'      OR image_url ~* 'OB[0-9]+TW[_./-]' THEN 'tw'
         WHEN image_url ~* '/Local/(SG|MY|SEA)/' THEN 'sea'
         WHEN image_url ~* '/Local/(MENA|ME|AR)/' THEN 'mena'
         WHEN image_url ~* '/Local/(LATAM|LA|MX)/' THEN 'latam'
         WHEN image_url ~* '/Local/(ALL|WW|US|GLOBAL)/' THEN 'global'
         ELSE 'vn'
       END
 WHERE server_region IS NULL;
