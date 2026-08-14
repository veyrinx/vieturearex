-- ============================================================
-- Arex — Chợ: giảm giá tin đăng + hồ sơ gian hàng sửa được
--
-- Chạy 1 lần trên Supabase SQL editor. An toàn khi chạy lại.
-- Cần chạy SAU migration-shop.sql.
-- ============================================================

-- ── Giảm giá ────────────────────────────────────────────────
-- Giá gốc vẫn nằm ở `price` chứ không bị ghi đè: người mua cần thấy mình được
-- bớt bao nhiêu, và khi đợt giảm hết hạn thì tin tự về giá cũ mà không cần ai
-- sửa lại. `sale_until` NULL = giảm không thời hạn tới khi chủ shop tắt.
ALTER TABLE public.shop_listings
  ADD COLUMN IF NOT EXISTS sale_price bigint CHECK (sale_price IS NULL OR sale_price >= 0),
  ADD COLUMN IF NOT EXISTS sale_until timestamptz;

-- Partial index: số tin đang giảm luôn nhỏ so với cả chợ.
CREATE INDEX IF NOT EXISTS shop_listings_sale_idx
  ON public.shop_listings(sale_until)
  WHERE sale_price IS NOT NULL;

-- ── Hồ sơ gian hàng ─────────────────────────────────────────
-- Hai cột này KHÔNG phải giấy tờ xác minh: chúng là phần chủ shop tự trang trí
-- gian hàng công khai, nên sửa được bất cứ lúc nào mà không phải duyệt lại.
ALTER TABLE public.shop_sellers
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- ── Nhật ký truy cập ────────────────────────────────────────
-- Đổi số tài khoản nhận tiền là việc nhạy cảm nhất một chủ shop làm được (tiền
-- của mọi đơn sau đó chảy về đấy), nên nó phải để lại dấu vết như lúc admin mở
-- giấy tờ. Thêm hai loại mới vào ràng buộc đang có.
ALTER TABLE public.shop_access_logs
  DROP CONSTRAINT IF EXISTS shop_access_logs_kind_check;
ALTER TABLE public.shop_access_logs
  ADD CONSTRAINT shop_access_logs_kind_check CHECK (kind IN (
    'seller_documents','seller_bank','order_secret','private_file',
    'seller_profile_edit','listing_edit'));
