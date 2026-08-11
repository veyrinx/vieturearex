-- ============================================================
-- Chợ Arex — CTV của gian hàng (nhân sự do chính người bán mời)
--
-- Khác với `agent` (giao dịch viên toàn sàn, do admin gán vai): CTV ở đây
-- thuộc về MỘT gian hàng, do chủ gian hàng tự mời và tự gỡ. CTV làm hộ chủ
-- shop hai nhóm việc, bật/tắt riêng từng nhóm:
--
--   can_manage_listings — đăng tin, sửa tin, ẩn tin, đẩy tin, xin nổi bật
--   can_handle_orders   — xem đơn của shop, bàn giao acc, nhắn với người mua
--
-- CTV KHÔNG bao giờ thấy: ảnh giấy tờ, số điện thoại, tài khoản ngân hàng của
-- chủ shop, và không sửa được hồ sơ người bán hay mời/gỡ CTV khác. Trong nhật
-- ký đơn, thao tác của CTV ghi vai "seller" nhưng `actor_id` là chính họ — nên
-- vẫn truy được ai đã bàn giao khi có tranh chấp.
--
-- Lời mời phải được người nhận bấm đồng ý (status 'invited' → 'active'), không
-- ai bị kéo vào làm CTV cho một gian hàng mà không biết.
--
-- Chạy 1 lần trên Supabase SQL editor. An toàn khi chạy lại.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.shop_staff (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id           uuid NOT NULL REFERENCES public.shop_sellers(id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invited_by          uuid REFERENCES public.users(id) ON DELETE SET NULL,
  can_manage_listings boolean NOT NULL DEFAULT true,
  can_handle_orders   boolean NOT NULL DEFAULT false,
  status              text NOT NULL DEFAULT 'invited'
                      CHECK (status IN ('invited','active','declined','revoked')),
  note                text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  accepted_at         timestamptz,
  revoked_at          timestamptz,
  updated_at          timestamptz NOT NULL DEFAULT now(),
  -- Một người chỉ có một dòng cho mỗi gian hàng: mời lại thì ghi đè dòng cũ.
  UNIQUE (seller_id, user_id)
);

CREATE INDEX IF NOT EXISTS shop_staff_seller_idx ON public.shop_staff(seller_id, status);
CREATE INDEX IF NOT EXISTS shop_staff_user_idx   ON public.shop_staff(user_id, status);

DROP TRIGGER IF EXISTS shop_staff_touch ON public.shop_staff;
CREATE TRIGGER shop_staff_touch BEFORE UPDATE ON public.shop_staff
  FOR EACH ROW EXECUTE FUNCTION public.shop_touch_updated_at();

-- ── RLS ─────────────────────────────────────────────────────
-- API dùng service role và tự kiểm tra quyền trong code; policy ở đây chỉ là
-- lớp chặn thứ hai cho ai gọi thẳng PostgREST.
ALTER TABLE public.shop_staff ENABLE ROW LEVEL SECURITY;

-- Đọc: chính CTV đó, chủ gian hàng, và nhân sự sàn.
DROP POLICY IF EXISTS "shop_staff_read" ON public.shop_staff;
CREATE POLICY "shop_staff_read" ON public.shop_staff FOR SELECT
  USING (
    user_id = auth.uid()
    OR seller_id IN (SELECT id FROM public.shop_sellers WHERE user_id = auth.uid())
    OR public.is_shop_agent()
  );

-- Ghi: chỉ service role (không policy nào cho phép) — trừ admin.
DROP POLICY IF EXISTS "shop_staff_write" ON public.shop_staff;
CREATE POLICY "shop_staff_write" ON public.shop_staff FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── Mở quyền đọc dữ liệu của gian hàng cho CTV đang hoạt động ─
-- Ba policy dưới đây vốn chỉ nhận chủ shop; thêm nhánh CTV để RLS không mâu
-- thuẫn với những gì API đã cho phép.
CREATE OR REPLACE FUNCTION public.shop_seller_ids_for_viewer()
RETURNS TABLE (seller_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.shop_sellers WHERE user_id = auth.uid()
  UNION
  SELECT s.seller_id FROM public.shop_staff s
   WHERE s.user_id = auth.uid() AND s.status = 'active';
$$;

DROP POLICY IF EXISTS "shop_listings_read" ON public.shop_listings;
CREATE POLICY "shop_listings_read" ON public.shop_listings FOR SELECT
  USING (
    status IN ('active','reserved','sold')
    OR public.is_admin_or_editor()
    OR seller_id IN (SELECT seller_id FROM public.shop_seller_ids_for_viewer())
  );

DROP POLICY IF EXISTS "shop_orders_read" ON public.shop_orders;
CREATE POLICY "shop_orders_read" ON public.shop_orders FOR SELECT
  USING (
    buyer_id = auth.uid()
    OR agent_id = auth.uid()
    OR seller_id IN (SELECT seller_id FROM public.shop_seller_ids_for_viewer())
    OR public.is_shop_agent()
  );

DROP POLICY IF EXISTS "shop_events_read" ON public.shop_order_events;
CREATE POLICY "shop_events_read" ON public.shop_order_events FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM public.shop_orders
       WHERE buyer_id = auth.uid()
          OR agent_id = auth.uid()
          OR seller_id IN (SELECT seller_id FROM public.shop_seller_ids_for_viewer())
    )
    OR public.is_shop_agent()
  );
