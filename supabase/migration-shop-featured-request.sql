-- ============================================================
-- Arex — Chợ: người bán xin đẩy nổi bật, admin duyệt
--
-- Chạy 1 lần trên Supabase SQL editor. An toàn khi chạy lại.
-- Cần chạy SAU migration-shop-v2-discord.sql (cột featured_until).
-- ============================================================

-- `featured_until` đã có sẵn nhưng chỉ nhân sự đặt được, và không có nút nào
-- gọi tới — nên trên thực tế không tin nào từng nổi bật. Cột này là nửa còn
-- thiếu: chỗ người bán giơ tay, để admin biết ai đang chờ mà duyệt.
--
-- Không cần bảng riêng: mỗi tin chỉ có tối đa một yêu cầu đang chờ, nên một
-- mốc thời gian trên chính hàng tin là đủ. NULL = không có yêu cầu nào.
ALTER TABLE public.shop_listings
  ADD COLUMN IF NOT EXISTS featured_requested_at timestamptz;

-- Partial index: hàng chờ luôn nhỏ so với tổng số tin, nên chỉ đánh dấu những
-- hàng thật sự đang chờ thay vì cả bảng.
CREATE INDEX IF NOT EXISTS shop_listings_featured_req_idx
  ON public.shop_listings(featured_requested_at)
  WHERE featured_requested_at IS NOT NULL;
