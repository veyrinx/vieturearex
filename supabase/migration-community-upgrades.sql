-- ============================================================================
-- 5 tính năng cộng đồng — chạy TAY một lần trên Supabase SQL Editor.
-- An toàn chạy lại (idempotent): mọi lệnh đều IF NOT EXISTS / OR REPLACE.
--
--   1. ff_player_watches / ff_player_snapshots / ff_player_changes
--      → theo dõi nick FF, báo khi đổi tên / guild / level / rank
--   2. shop_price_history
--      → lịch sử giá chốt, để định giá acc từ số liệu thật
--   3. scam_reports
--      → hồ sơ rủi ro sinh từ tranh chấp đã xử, cấp cho /check-scam
--   4. (không cần bảng mới — trang xem giải trực tiếp đọc tms_* sẵn có)
--   5. quest_claims
--      → nhiệm vụ tuần; tiến độ ĐẾM từ bảng nguồn, chỉ lưu lần đã nhận thưởng
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. THEO DÕI NGƯỜI CHƠI FREE FIRE
-- ─────────────────────────────────────────────────────────────────────────────

-- Danh sách nick mỗi người dùng ghim theo dõi.
CREATE TABLE IF NOT EXISTS public.ff_player_watches (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ff_id      text NOT NULL,
  -- Ghi chú riêng của người theo dõi ("acc chính", "đối thủ giải X").
  label      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ff_id)
);
CREATE INDEX IF NOT EXISTS ff_player_watches_user_idx  ON public.ff_player_watches(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ff_player_watches_ff_id_idx ON public.ff_player_watches(ff_id);

-- Ảnh chụp chỉ số nick tại một thời điểm. Cron ghi mỗi ngày một dòng cho mỗi
-- nick đang có người theo dõi; so dòng mới với dòng gần nhất để ra biến động.
CREATE TABLE IF NOT EXISTS public.ff_player_snapshots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ff_id         text NOT NULL,
  nickname      text,
  level         integer,
  likes         integer,
  exp           integer,
  br_rank_point integer,
  cs_rank_point integer,
  guild_name    text,
  guild_level   integer,
  captured_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ff_player_snapshots_ff_idx ON public.ff_player_snapshots(ff_id, captured_at DESC);

-- Dòng thời gian biến động — thứ thật sự có giá trị cho chợ: một nick đổi tên
-- 3 lần trong 2 tháng là dấu hiệu acc đã qua tay nhiều người.
CREATE TABLE IF NOT EXISTS public.ff_player_changes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ff_id      text NOT NULL,
  field      text NOT NULL CHECK (field IN ('nickname','guild','level','br_rank','cs_rank')),
  old_value  text,
  new_value  text,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ff_player_changes_ff_idx    ON public.ff_player_changes(ff_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS ff_player_changes_field_idx ON public.ff_player_changes(ff_id, field);

ALTER TABLE public.ff_player_watches   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ff_player_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ff_player_changes   ENABLE ROW LEVEL SECURITY;

-- Người dùng chỉ thấy danh sách theo dõi của chính mình. Snapshot/changes là
-- dữ liệu công khai về nick (ai tra cũng xem được) nhưng chỉ server ghi.
DROP POLICY IF EXISTS "own ff watches" ON public.ff_player_watches;
CREATE POLICY "own ff watches" ON public.ff_player_watches
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "read ff snapshots" ON public.ff_player_snapshots;
CREATE POLICY "read ff snapshots" ON public.ff_player_snapshots FOR SELECT USING (true);

DROP POLICY IF EXISTS "read ff changes" ON public.ff_player_changes;
CREATE POLICY "read ff changes" ON public.ff_player_changes FOR SELECT USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. LỊCH SỬ GIÁ CHỢ AREX
-- ─────────────────────────────────────────────────────────────────────────────

-- Một dòng mỗi đơn hoàn tất. Ghi kèm chỉ số acc lấy từ API Free Fire tại thời
-- điểm chốt (khi tin đăng có game_uid) — nhờ vậy "acc tương tự" là so theo dữ
-- liệu thật chứ không phải theo lời người bán tự khai trong `details`.
CREATE TABLE IF NOT EXISTS public.shop_price_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid UNIQUE REFERENCES public.shop_orders(id) ON DELETE SET NULL,
  listing_id    uuid REFERENCES public.shop_listings(id) ON DELETE SET NULL,
  kind          text NOT NULL DEFAULT 'account' CHECK (kind IN ('account','item')),
  -- Giá người mua thật sự trả (shop_orders.amount), KHÔNG phải giá niêm yết.
  price         bigint NOT NULL CHECK (price >= 0),
  -- Giá rao lúc đăng, để đo mức mặc cả trung bình.
  listed_price  bigint,
  game_uid      text,
  level         integer,
  likes         integer,
  br_rank_point integer,
  cs_rank_point integer,
  -- Bản sao gọn của listings.details, phòng khi tin đăng bị xoá.
  details       jsonb NOT NULL DEFAULT '{}'::jsonb,
  sold_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shop_price_history_kind_idx  ON public.shop_price_history(kind, sold_at DESC);
CREATE INDEX IF NOT EXISTS shop_price_history_level_idx ON public.shop_price_history(kind, level);

ALTER TABLE public.shop_price_history ENABLE ROW LEVEL SECURITY;
-- Chỉ server (service role) đọc/ghi: dữ liệu tổng hợp trả ra qua API đã gộp
-- nhóm, không lộ giá từng đơn của ai.

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. HỒ SƠ RỦI RO (CHECK SCAM)
-- ─────────────────────────────────────────────────────────────────────────────

-- Mỗi dòng = một dấu hiệu rủi ro gắn với một định danh (UID game, SĐT, STK,
-- liên hệ Zalo/FB). `subject_value` LUÔN lưu bản đã chuẩn hoá (xem
-- lib/server/scam-registry.ts) để tra cứu không phụ thuộc cách gõ.
CREATE TABLE IF NOT EXISTS public.scam_reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL CHECK (subject_type IN ('uid','phone','bank','contact','name')),
  subject_value text NOT NULL,
  -- 'dispute' = sinh tự động khi tranh chấp xử người bán sai.
  -- 'admin'   = admin nhập tay.
  source       text NOT NULL DEFAULT 'admin' CHECK (source IN ('dispute','admin')),
  severity     text NOT NULL DEFAULT 'warning' CHECK (severity IN ('info','warning','danger')),
  note         text NOT NULL DEFAULT '',
  order_id     uuid REFERENCES public.shop_orders(id) ON DELETE SET NULL,
  dispute_id   uuid REFERENCES public.shop_disputes(id) ON DELETE SET NULL,
  seller_id    uuid REFERENCES public.shop_sellers(id) ON DELETE SET NULL,
  created_by   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  -- Admin gỡ cảnh báo sai mà không xoá dấu vết.
  revoked_at   timestamptz,
  revoke_reason text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS scam_reports_subject_idx ON public.scam_reports(subject_type, subject_value);
CREATE INDEX IF NOT EXISTS scam_reports_created_idx ON public.scam_reports(created_at DESC);
-- Một tranh chấp chỉ sinh đúng một cảnh báo cho mỗi định danh.
CREATE UNIQUE INDEX IF NOT EXISTS scam_reports_dispute_subject_uniq
  ON public.scam_reports(dispute_id, subject_type, subject_value)
  WHERE dispute_id IS NOT NULL;

ALTER TABLE public.scam_reports ENABLE ROW LEVEL SECURITY;
-- Không mở cho anon: tra cứu đi qua API để chặn cào toàn bộ danh sách.

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. NHIỆM VỤ TUẦN
-- ─────────────────────────────────────────────────────────────────────────────

-- Tiến độ KHÔNG lưu ở đây — nó được đếm trực tiếp từ bảng nguồn (quiz_scores,
-- forum_posts, forum_replies, shop_orders, users.login_streak…) nên không bao
-- giờ lệch với thực tế. Bảng này chỉ ghi "tuần này đã nhận thưởng chưa".
CREATE TABLE IF NOT EXISTS public.quest_claims (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  quest_key  text NOT NULL,
  -- Ngày thứ Hai (giờ VN) của tuần được tính, dạng YYYY-MM-DD.
  week_start date NOT NULL,
  points     integer NOT NULL DEFAULT 0,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, quest_key, week_start)
);
CREATE INDEX IF NOT EXISTS quest_claims_user_week_idx ON public.quest_claims(user_id, week_start DESC);

ALTER TABLE public.quest_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own quest claims" ON public.quest_claims;
CREATE POLICY "own quest claims" ON public.quest_claims
  FOR SELECT USING (auth.uid() = user_id);

-- Điểm thưởng nhiệm vụ phải nằm RIÊNG một cột: `contributor_points.total_points`
-- được contributor-sync.ts tính lại từ đầu (posts×10 + replies×3 + wiki×30) mỗi
-- lần người dùng đăng bài, nên cộng thẳng vào đó là mất trắng ở lần đăng kế tiếp.
ALTER TABLE IF EXISTS public.contributor_points
  ADD COLUMN IF NOT EXISTS bonus_points integer NOT NULL DEFAULT 0;
