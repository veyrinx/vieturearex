-- ============================================================
-- Hợp đồng hợp tác điện tử (/partnership/hop-dong)
--
-- Đối tác điền thông tin hai bên, đọc toàn văn điều khoản rồi ký điện tử ngay
-- trên trình duyệt. Bản ghi ở đây là BẰNG CHỨNG GIAO KẾT theo Luật Giao dịch
-- điện tử 2023, nên phải chụp lại đủ ba thứ:
--
--   terms_text  — toàn văn điều khoản ĐÚNG lúc ký (mẫu đổi sau không ảnh hưởng)
--   terms_hash  — SHA-256 của toàn văn, để chứng minh bản lưu chưa bị sửa
--   b_sign_*    — thời điểm, IP, thiết bị, trình duyệt của người ký
--
-- Quy trình: Bên B ký -> status 'pending' -> admin Arex ký -> 'signed' (có hiệu
-- lực) hoặc 'rejected'. Hết term_end thì cron/quản trị chuyển 'expired'.
--
-- Chạy 1 lần trên Supabase SQL editor. An toàn khi chạy lại.
-- ============================================================

-- Số hợp đồng chạy liên tục, lấy từ sequence nên hai người ký cùng lúc không
-- đụng số (đếm bằng COUNT(*) thì có).
CREATE SEQUENCE IF NOT EXISTS public.partnership_contract_no_seq;

CREATE TABLE IF NOT EXISTS public.partnership_contracts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code               text NOT NULL UNIQUE
                     DEFAULT ('HDHT-AREX-'
                       || to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY') || '-'
                       || lpad(nextval('public.partnership_contract_no_seq')::text, 4, '0')),
  status             text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','signed','rejected','terminated','expired')),

  -- ── Bên B ──────────────────────────────────────────────
  party_type         text NOT NULL DEFAULT 'individual'
                     CHECK (party_type IN ('individual','organization')),
  full_name          text NOT NULL,
  date_of_birth      date,
  id_number          text NOT NULL,
  id_issued_date     date,
  id_issued_by       text,
  address            text NOT NULL,
  phone              text NOT NULL,
  email              text NOT NULL,

  -- Chỉ dùng khi party_type = 'organization'
  org_name           text,
  org_tax_code       text,
  org_reg_no         text,
  rep_title          text,

  -- Người đại diện theo pháp luật — bắt buộc khi Bên B chưa đủ 18 tuổi
  -- (Điều 21 Bộ luật Dân sự 2015). API tự kiểm tra theo date_of_birth.
  guardian_name      text,
  guardian_relation  text,
  guardian_id_number text,
  guardian_phone     text,

  -- ── Nội dung hợp tác ───────────────────────────────────
  tier               text NOT NULL CHECK (tier IN ('sponsor','media','community')),
  scope              text NOT NULL,
  channels           text,
  term_start         date NOT NULL,
  term_end           date NOT NULL,
  consideration      text,
  payment_terms      text,

  -- ── Bản điều khoản đã ký ───────────────────────────────
  -- Chụp luôn thông tin pháp lý của Bên A lúc ký: sau này Arex đổi địa chỉ hay
  -- người đại diện thì hợp đồng cũ vẫn dựng lại đúng như bản đối tác đã đọc.
  party_a            jsonb,
  terms_version      text NOT NULL,
  terms_text         text NOT NULL,
  terms_hash         text NOT NULL,

  -- ── Chữ ký Bên B ───────────────────────────────────────
  b_signature        text,               -- data:image/png;base64,... (nét vẽ tay)
  b_signed_name      text NOT NULL,      -- họ tên người ký tự gõ lại
  b_signed_at        timestamptz NOT NULL DEFAULT now(),
  b_sign_ip          text,
  b_sign_device      text,
  b_sign_browser     text,

  -- ── Chữ ký Bên A (Arex) ────────────────────────────────
  a_signer_id        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  a_signer_name      text,
  a_signer_title     text,
  a_signature        text,
  a_signed_at        timestamptz,
  a_sign_ip          text,

  -- ── Đồng ý (lưu riêng để chứng minh từng ô đã tick) ────
  consent_terms      boolean NOT NULL DEFAULT false,
  consent_privacy    boolean NOT NULL DEFAULT false,
  consent_esign      boolean NOT NULL DEFAULT false,

  -- Mở lại hợp đồng bằng link cho người không có tài khoản site.
  access_token       text NOT NULL,

  user_id            uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reject_reason      text,
  admin_note         text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partnership_contracts_status_idx  ON public.partnership_contracts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS partnership_contracts_email_idx   ON public.partnership_contracts(lower(email));
CREATE INDEX IF NOT EXISTS partnership_contracts_user_idx    ON public.partnership_contracts(user_id);
CREATE INDEX IF NOT EXISTS partnership_contracts_term_idx    ON public.partnership_contracts(term_end)
  WHERE status = 'signed';

-- ── Nhật ký thao tác trên hợp đồng ─────────────────────────
-- Mỗi lần xem / ký / từ chối / chấm dứt ghi một dòng. Đây là phần "dấu vết
-- kiểm toán" mà Điều 9.3 của mẫu hợp đồng hứa với đối tác.
CREATE TABLE IF NOT EXISTS public.partnership_contract_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.partnership_contracts(id) ON DELETE CASCADE,
  event       text NOT NULL
              CHECK (event IN ('created','viewed','signed_b','signed_a','rejected','terminated','expired','note')),
  actor       text,          -- email admin, hoặc "Bên B", hoặc "system"
  detail      text,
  ip          text,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partnership_contract_events_idx
  ON public.partnership_contract_events(contract_id, created_at DESC);

-- ── updated_at ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.partnership_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS partnership_contracts_touch ON public.partnership_contracts;
CREATE TRIGGER partnership_contracts_touch BEFORE UPDATE ON public.partnership_contracts
  FOR EACH ROW EXECUTE FUNCTION public.partnership_touch_updated_at();

-- ── RLS ────────────────────────────────────────────────────
-- Hợp đồng chứa CCCD, địa chỉ, chữ ký — không mở cho anon/authenticated đọc
-- thẳng qua PostgREST. Mọi truy cập đi qua API bằng service role, API tự kiểm
-- tra quyền (admin) hoặc access_token (chính chủ Bên B).
ALTER TABLE public.partnership_contracts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partnership_contract_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partnership_contracts_admin" ON public.partnership_contracts;
CREATE POLICY "partnership_contracts_admin" ON public.partnership_contracts FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "partnership_contract_events_admin" ON public.partnership_contract_events;
CREATE POLICY "partnership_contract_events_admin" ON public.partnership_contract_events FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
