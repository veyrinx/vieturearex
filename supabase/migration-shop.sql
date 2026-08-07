-- ============================================================
-- Arex Shop — chợ mua bán acc & vật phẩm có trung gian giữ tiền
--
-- Luồng đơn:
--   pending_agent   → chờ giao dịch viên nhận đơn
--   awaiting_payment→ GDV đã nhận, gửi STK cho người mua
--   payment_review  → người mua đã chụp bill, chờ GDV soát tiền
--   holding         → TIỀN ĐANG GIỮ Ở TRUNG GIAN, người bán bàn giao
--   delivering      → đã bàn giao, người mua đăng nhập & kiểm tra
--   payout          → người mua xác nhận OK, chờ GDV chuyển tiền người bán
--   completed       → GDV đã chuyển tiền, đơn hoàn tất
--   disputed        → có tranh chấp, admin/GDV xử lý
--   cancelled       → huỷ (hoàn tiền nếu đã giữ)
--
-- Mọi bước đều ghi vào shop_order_events kèm ảnh chụp màn hình bắt buộc.
-- aChạy 1 lần trên Supabase SQL editor. An toàn khi chạy lại.
-- ============================================================

-- ── Vai trò mới: seller (người bán) + agent (giao dịch viên) ─
ALTER TABLE IF EXISTS public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE IF EXISTS public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('super_admin','admin','it','manager','support','team_member','agent','seller','user'));

-- ── Người bán ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shop_sellers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  -- Hồ sơ bắt buộc khi xin bán
  display_name  text NOT NULL,
  real_name     text NOT NULL,
  phone         text NOT NULL,
  contact       text NOT NULL,                       -- Zalo / Facebook / Telegram
  bank_name     text NOT NULL,
  bank_account  text NOT NULL,
  bank_holder   text NOT NULL,
  id_images     text[] NOT NULL DEFAULT '{}'::text[],-- ảnh CCCD / xác minh (admin xem)
  note          text,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','approved','rejected','suspended')),
  reject_reason text,
  orders_done   integer NOT NULL DEFAULT 0,
  rating_sum    integer NOT NULL DEFAULT 0,
  rating_count  integer NOT NULL DEFAULT 0,
  approved_at   timestamptz,
  approved_by   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shop_sellers_status_idx ON public.shop_sellers(status);

-- ── Tin đăng bán ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shop_listings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id     uuid NOT NULL REFERENCES public.shop_sellers(id) ON DELETE CASCADE,
  kind          text NOT NULL DEFAULT 'account' CHECK (kind IN ('account','item')),
  title         text NOT NULL,
  description   text NOT NULL DEFAULT '',
  price         bigint NOT NULL CHECK (price >= 0),   -- VNĐ
  negotiable    boolean NOT NULL DEFAULT false,
  images        text[] NOT NULL DEFAULT '{}'::text[], -- ảnh chụp acc/vật phẩm (bắt buộc ≥1)
  -- Thông tin acc: level, rank, số skin, nhân vật, đã đổi tên, liên kết…
  details       jsonb NOT NULL DEFAULT '{}'::jsonb,
  game_uid      text,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','active','reserved','sold','rejected','hidden')),
  reject_reason text,
  views         integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  sold_at       timestamptz
);
CREATE INDEX IF NOT EXISTS shop_listings_status_idx  ON public.shop_listings(status, created_at DESC);
CREATE INDEX IF NOT EXISTS shop_listings_seller_idx  ON public.shop_listings(seller_id);
CREATE INDEX IF NOT EXISTS shop_listings_kind_idx    ON public.shop_listings(kind);

-- ── Đơn hàng (có trung gian giữ tiền) ───────────────────────
CREATE TABLE IF NOT EXISTS public.shop_orders (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code           text NOT NULL UNIQUE,                 -- AX-8K3P2Q, hiện cho 2 bên
  listing_id     uuid NOT NULL REFERENCES public.shop_listings(id) ON DELETE RESTRICT,
  seller_id      uuid NOT NULL REFERENCES public.shop_sellers(id) ON DELETE RESTRICT,
  buyer_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  agent_id       uuid REFERENCES public.users(id) ON DELETE SET NULL, -- giao dịch viên
  -- Thông tin người mua (bắt buộc, để đối chiếu khi tranh chấp)
  buyer_name     text NOT NULL,
  buyer_phone    text NOT NULL,
  buyer_contact  text NOT NULL,
  buyer_bank     text,                                  -- STK hoàn tiền nếu huỷ
  amount         bigint NOT NULL CHECK (amount >= 0),   -- tiền người mua trả
  fee            bigint NOT NULL DEFAULT 0,             -- phí trung gian
  payout_amount  bigint NOT NULL DEFAULT 0,             -- tiền người bán nhận
  status         text NOT NULL DEFAULT 'pending_agent' CHECK (status IN (
                   'pending_agent','awaiting_payment','payment_review','holding',
                   'delivering','payout','completed','disputed','cancelled')),
  cancel_reason  text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  claimed_at     timestamptz,   -- GDV nhận đơn
  held_at        timestamptz,   -- tiền vào tay trung gian
  delivered_at   timestamptz,   -- người bán bàn giao
  confirmed_at   timestamptz,   -- người mua xác nhận nhận được
  completed_at   timestamptz,   -- GDV đã chuyển tiền người bán
  cancelled_at   timestamptz,
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shop_orders_buyer_idx  ON public.shop_orders(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS shop_orders_seller_idx ON public.shop_orders(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS shop_orders_agent_idx  ON public.shop_orders(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS shop_orders_status_idx ON public.shop_orders(status, created_at DESC);

-- ── Nhật ký từng bước + ảnh bằng chứng ──────────────────────
-- Mọi thao tác tiền/bàn giao/đăng nhập đều phải kèm ảnh chụp.
CREATE TABLE IF NOT EXISTS public.shop_order_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   uuid NOT NULL REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  actor_id   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  actor_role text NOT NULL CHECK (actor_role IN ('buyer','seller','agent','admin','system')),
  type       text NOT NULL CHECK (type IN (
               'created','claimed','bank_info','payment_proof','payment_confirmed',
               'account_info','delivered','login_proof','received','payout_proof',
               'completed','cancelled','dispute_opened','dispute_resolved','note')),
  message    text NOT NULL DEFAULT '',
  images     text[] NOT NULL DEFAULT '{}'::text[],
  -- Dữ liệu nhạy cảm (tài khoản/mật khẩu bàn giao) — chỉ 2 bên + GDV đọc được
  secret     jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shop_order_events_order_idx ON public.shop_order_events(order_id, created_at);

-- ── Tranh chấp ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shop_disputes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  opened_by   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  opened_role text NOT NULL CHECK (opened_role IN ('buyer','seller','agent')),
  reason      text NOT NULL,
  images      text[] NOT NULL DEFAULT '{}'::text[],
  status      text NOT NULL DEFAULT 'open'
              CHECK (status IN ('open','resolving','refund_buyer','pay_seller','closed')),
  resolution  text,
  handled_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS shop_disputes_status_idx ON public.shop_disputes(status, created_at DESC);

-- ── Đánh giá người bán (chỉ sau đơn hoàn tất) ───────────────
CREATE TABLE IF NOT EXISTS public.shop_reviews (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   uuid NOT NULL UNIQUE REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  seller_id  uuid NOT NULL REFERENCES public.shop_sellers(id) ON DELETE CASCADE,
  buyer_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating     smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shop_reviews_seller_idx ON public.shop_reviews(seller_id, created_at DESC);

-- ── updated_at tự động ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.shop_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shop_sellers_touch  ON public.shop_sellers;
DROP TRIGGER IF EXISTS shop_listings_touch ON public.shop_listings;
DROP TRIGGER IF EXISTS shop_orders_touch   ON public.shop_orders;
CREATE TRIGGER shop_sellers_touch  BEFORE UPDATE ON public.shop_sellers  FOR EACH ROW EXECUTE FUNCTION public.shop_touch_updated_at();
CREATE TRIGGER shop_listings_touch BEFORE UPDATE ON public.shop_listings FOR EACH ROW EXECUTE FUNCTION public.shop_touch_updated_at();
CREATE TRIGGER shop_orders_touch   BEFORE UPDATE ON public.shop_orders   FOR EACH ROW EXECUTE FUNCTION public.shop_touch_updated_at();

-- Cộng điểm uy tín người bán khi có đánh giá mới
CREATE OR REPLACE FUNCTION public.shop_apply_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.shop_sellers
     SET rating_sum = rating_sum + NEW.rating,
         rating_count = rating_count + 1
   WHERE id = NEW.seller_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS shop_reviews_apply ON public.shop_reviews;
CREATE TRIGGER shop_reviews_apply AFTER INSERT ON public.shop_reviews
  FOR EACH ROW EXECUTE FUNCTION public.shop_apply_review();

-- ── Hàm tiện ích: có phải giao dịch viên không ───────────────
CREATE OR REPLACE FUNCTION public.is_shop_agent()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
     WHERE id = auth.uid()
       AND role IN ('super_admin','admin','it','manager','agent')
  );
$$;

-- ============================================================
-- RLS — mặc định khoá hết; API dùng service role để ghi.
-- Người dùng chỉ đọc được phần của mình.
-- ============================================================
ALTER TABLE public.shop_sellers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_listings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_disputes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_reviews      ENABLE ROW LEVEL SECURITY;

-- Người bán: ai cũng xem được hồ sơ đã duyệt (trang người bán), chủ hồ sơ xem hồ sơ mình
DROP POLICY IF EXISTS "shop_sellers_read"  ON public.shop_sellers;
CREATE POLICY "shop_sellers_read" ON public.shop_sellers FOR SELECT
  USING (status = 'approved' OR user_id = auth.uid() OR public.is_admin_or_editor());
DROP POLICY IF EXISTS "shop_sellers_write" ON public.shop_sellers;
CREATE POLICY "shop_sellers_write" ON public.shop_sellers FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Tin đăng: công khai tin đang bán; chủ tin xem tin của mình
DROP POLICY IF EXISTS "shop_listings_read"  ON public.shop_listings;
CREATE POLICY "shop_listings_read" ON public.shop_listings FOR SELECT
  USING (
    status IN ('active','reserved','sold')
    OR public.is_admin_or_editor()
    OR seller_id IN (SELECT id FROM public.shop_sellers WHERE user_id = auth.uid())
  );
DROP POLICY IF EXISTS "shop_listings_write" ON public.shop_listings;
CREATE POLICY "shop_listings_write" ON public.shop_listings FOR ALL
  USING (public.is_admin_or_editor()) WITH CHECK (public.is_admin_or_editor());

-- Đơn hàng: chỉ người mua, người bán, GDV phụ trách và admin
DROP POLICY IF EXISTS "shop_orders_read" ON public.shop_orders;
CREATE POLICY "shop_orders_read" ON public.shop_orders FOR SELECT
  USING (
    buyer_id = auth.uid()
    OR agent_id = auth.uid()
    OR seller_id IN (SELECT id FROM public.shop_sellers WHERE user_id = auth.uid())
    OR public.is_shop_agent()
  );
DROP POLICY IF EXISTS "shop_orders_write" ON public.shop_orders;
CREATE POLICY "shop_orders_write" ON public.shop_orders FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Nhật ký đơn: đọc theo quyền của đơn tương ứng
DROP POLICY IF EXISTS "shop_events_read" ON public.shop_order_events;
CREATE POLICY "shop_events_read" ON public.shop_order_events FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM public.shop_orders
       WHERE buyer_id = auth.uid()
          OR agent_id = auth.uid()
          OR seller_id IN (SELECT id FROM public.shop_sellers WHERE user_id = auth.uid())
    )
    OR public.is_shop_agent()
  );
DROP POLICY IF EXISTS "shop_events_write" ON public.shop_order_events;
CREATE POLICY "shop_events_write" ON public.shop_order_events FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Tranh chấp
DROP POLICY IF EXISTS "shop_disputes_read" ON public.shop_disputes;
CREATE POLICY "shop_disputes_read" ON public.shop_disputes FOR SELECT
  USING (
    opened_by = auth.uid()
    OR public.is_shop_agent()
    OR order_id IN (
      SELECT id FROM public.shop_orders
       WHERE buyer_id = auth.uid()
          OR seller_id IN (SELECT id FROM public.shop_sellers WHERE user_id = auth.uid())
    )
  );
DROP POLICY IF EXISTS "shop_disputes_write" ON public.shop_disputes;
CREATE POLICY "shop_disputes_write" ON public.shop_disputes FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Đánh giá: công khai
DROP POLICY IF EXISTS "shop_reviews_read" ON public.shop_reviews;
CREATE POLICY "shop_reviews_read" ON public.shop_reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "shop_reviews_write" ON public.shop_reviews;
CREATE POLICY "shop_reviews_write" ON public.shop_reviews FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- Storage: hai bucket, tách theo mức nhạy cảm
--   shop         — CÔNG KHAI, chỉ chứa ảnh tin đăng (ai cũng phải xem được)
--   shop-private — KÍN, chứa CCCD người bán + ảnh chuyển khoản + ảnh bàn giao
--
-- Bucket kín không có policy đọc nào cả: chỉ service role vào được, và web
-- chỉ cấp link ký 60 giây qua /api/shop/file sau khi kiểm tra người xem là ai.
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop', 'shop', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-private', 'shop-private', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "shop_bucket_read" ON storage.objects;
CREATE POLICY "shop_bucket_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'shop');

-- Chặn hẳn đường đọc trực tiếp vào bucket kín (kể cả người đã đăng nhập).
DROP POLICY IF EXISTS "shop_private_bucket_read" ON storage.objects;

-- ============================================================
-- Nhật ký truy cập dữ liệu nhạy cảm
-- Ghi lại mọi lần ai đó mở giấy tờ người bán hoặc thông tin bàn giao acc.
-- Chỉ ghi thêm, không ai sửa/xoá được qua API — để còn đối chiếu khi có sự cố.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.shop_access_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  actor_role text NOT NULL DEFAULT 'unknown',
  kind       text NOT NULL CHECK (kind IN (
               'seller_documents','seller_bank','order_secret','private_file')),
  target     text NOT NULL,
  ip         text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shop_access_logs_actor_idx  ON public.shop_access_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS shop_access_logs_target_idx ON public.shop_access_logs(kind, created_at DESC);

ALTER TABLE public.shop_access_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shop_access_logs_read" ON public.shop_access_logs;
CREATE POLICY "shop_access_logs_read" ON public.shop_access_logs FOR SELECT
  USING (public.is_admin());
-- Không có policy INSERT/UPDATE/DELETE: chỉ service role ghi được.
