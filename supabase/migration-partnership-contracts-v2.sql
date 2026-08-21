-- ============================================================
-- Hợp đồng điện tử v2 — bỏ giấy tờ tùy thân, tách ba hình thức
--
-- Bản đầu (migration-partnership-contracts.sql) dựng theo kiểu hợp đồng giữa
-- hai doanh nghiệp: hỏi CCCD, mã số thuế, số ĐKKD, địa chỉ trụ sở. Arex không
-- phải doanh nghiệp và các bên ký cũng không: đây là hợp đồng giữa đội nhóm,
-- thành viên và đối tác kỹ thuật trong cộng đồng.
--
-- Bản này:
--   • thêm cột `kind` — team | member | tech (ba mẫu điều khoản khác nhau)
--   • đổi party_type sang person | team
--   • thay danh tính giấy tờ bằng biệt danh, UID, kênh liên lạc, khu vực
--   • thêm `extra_terms` — điều khoản riêng do Bên B tự đưa vào hợp đồng
--   • XÓA các cột giấy tờ tùy thân (id_number, org_tax_code, …)
--
-- LƯU Ý khi đã có hợp đồng ký theo mẫu 1.0: cột bị xóa chỉ là bản sao có cấu
-- trúc; toàn văn hợp đồng đã ký nằm nguyên trong `terms_text` kèm `terms_hash`
-- nên bằng chứng giao kết không mất. Muốn giữ lại thì sao lưu bảng trước khi
-- chạy: CREATE TABLE partnership_contracts_v1_backup AS
--        SELECT * FROM public.partnership_contracts;
--
-- Chạy 1 lần trên Supabase SQL editor, SAU migration-partnership-contracts.sql.
-- An toàn khi chạy lại.
-- ============================================================

-- ── Hình thức hợp đồng ─────────────────────────────────────
ALTER TABLE public.partnership_contracts
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'team';

ALTER TABLE public.partnership_contracts
  DROP CONSTRAINT IF EXISTS partnership_contracts_kind_check;
ALTER TABLE public.partnership_contracts
  ADD CONSTRAINT partnership_contracts_kind_check CHECK (kind IN ('team','member','tech'));

-- ── Bên B: danh tính cộng đồng thay cho giấy tờ ────────────
-- org_name của mẫu cũ chính là tên đội — đổi tên cột cho khớp cách gọi mới.
DO $$
BEGIN
  IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'partnership_contracts' AND column_name = 'org_name')
     AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'partnership_contracts' AND column_name = 'team_name')
  THEN
    ALTER TABLE public.partnership_contracts RENAME COLUMN org_name TO team_name;
  END IF;
END $$;

ALTER TABLE public.partnership_contracts
  ADD COLUMN IF NOT EXISTS display_name  text,
  ADD COLUMN IF NOT EXISTS game_uid      text,
  ADD COLUMN IF NOT EXISTS contact_link  text,
  ADD COLUMN IF NOT EXISTS area          text,
  ADD COLUMN IF NOT EXISTS team_name     text,
  ADD COLUMN IF NOT EXISTS team_tag      text,
  ADD COLUMN IF NOT EXISTS team_size     text,
  ADD COLUMN IF NOT EXISTS member_role   text,
  ADD COLUMN IF NOT EXISTS duties        jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS commitment    text,
  ADD COLUMN IF NOT EXISTS deliverables  text,
  ADD COLUMN IF NOT EXISTS sla           text,
  ADD COLUMN IF NOT EXISTS ip_ownership  text,
  -- Điều khoản riêng Bên B tự soạn: [{ "title": "...", "body": "..." }]
  ADD COLUMN IF NOT EXISTS extra_terms   jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.partnership_contracts
  DROP CONSTRAINT IF EXISTS partnership_contracts_ip_ownership_check;
ALTER TABLE public.partnership_contracts
  ADD CONSTRAINT partnership_contracts_ip_ownership_check
  CHECK (ip_ownership IS NULL OR ip_ownership IN ('arex','partner','shared'));

-- ── party_type: individual/organization → person/team ──────
UPDATE public.partnership_contracts SET party_type = 'person' WHERE party_type = 'individual';
UPDATE public.partnership_contracts SET party_type = 'team'   WHERE party_type = 'organization';

ALTER TABLE public.partnership_contracts
  DROP CONSTRAINT IF EXISTS partnership_contracts_party_type_check;
ALTER TABLE public.partnership_contracts
  ADD CONSTRAINT partnership_contracts_party_type_check CHECK (party_type IN ('person','team'));
ALTER TABLE public.partnership_contracts ALTER COLUMN party_type SET DEFAULT 'person';

-- ── Nới các cột không còn bắt buộc ─────────────────────────
-- tier chỉ còn nghĩa với kind = 'team'; phone không bắt buộc vì nhiều đội chỉ
-- liên lạc qua Discord/Zalo.
ALTER TABLE public.partnership_contracts ALTER COLUMN tier  DROP NOT NULL;
ALTER TABLE public.partnership_contracts ALTER COLUMN phone DROP NOT NULL;

-- ── Bỏ hẳn dữ liệu giấy tờ tùy thân ────────────────────────
-- Không hỏi nữa thì cũng không giữ chỗ để lỡ tay ghi vào.
ALTER TABLE public.partnership_contracts
  DROP COLUMN IF EXISTS id_number,
  DROP COLUMN IF EXISTS id_issued_date,
  DROP COLUMN IF EXISTS id_issued_by,
  DROP COLUMN IF EXISTS org_tax_code,
  DROP COLUMN IF EXISTS org_reg_no,
  DROP COLUMN IF EXISTS guardian_id_number,
  DROP COLUMN IF EXISTS address;

CREATE INDEX IF NOT EXISTS partnership_contracts_kind_idx
  ON public.partnership_contracts(kind, status, created_at DESC);
