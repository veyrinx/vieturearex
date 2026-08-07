-- ============================================================
-- Arex — Chợ v2 (chat trong đơn, tin nổi bật, theo dõi bộ lọc)
--        + Bot Discord (liên kết tài khoản, ticket, giveaway)
--
-- Chạy 1 lần trên Supabase SQL editor. An toàn khi chạy lại.
-- Cần chạy SAU migration-shop.sql.
-- ============================================================

-- ============================================================
-- PHẦN 1 — CHỢ
-- ============================================================

-- ── Chat trong đơn ──────────────────────────────────────────
-- Khác shop_order_events: events là nhật ký máy trạng thái (bắt buộc ảnh, đổi
-- trạng thái đơn), còn đây là chỗ ba bên nói chuyện tự do. Tách bảng để một
-- cuộc trò chuyện dài không làm nhật ký bằng chứng bị loãng.
CREATE TABLE IF NOT EXISTS public.shop_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  sender_id   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('buyer','seller','agent','admin','system')),
  body        text NOT NULL DEFAULT '',
  images      text[] NOT NULL DEFAULT '{}'::text[],
  -- Nội dung gốc trước khi che số điện thoại/link (chỉ admin đọc, để xử lý
  -- tranh chấp và bắt người rủ nhau giao dịch ngoài sàn).
  raw_body    text,
  flagged     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shop_messages_order_idx ON public.shop_messages(order_id, created_at);
CREATE INDEX IF NOT EXISTS shop_messages_flagged_idx ON public.shop_messages(flagged, created_at DESC)
  WHERE flagged;

-- Mốc đọc để đếm tin chưa xem cho từng người trong đơn.
CREATE TABLE IF NOT EXISTS public.shop_message_reads (
  order_id     uuid NOT NULL REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (order_id, user_id)
);

-- ── Tin nổi bật + đẩy tin ───────────────────────────────────
ALTER TABLE public.shop_listings ADD COLUMN IF NOT EXISTS featured_until timestamptz;
ALTER TABLE public.shop_listings ADD COLUMN IF NOT EXISTS bumped_at timestamptz;
-- Tin cũ: coi như được đẩy đúng lúc đăng.
UPDATE public.shop_listings SET bumped_at = created_at WHERE bumped_at IS NULL;
ALTER TABLE public.shop_listings ALTER COLUMN bumped_at SET DEFAULT now();

CREATE INDEX IF NOT EXISTS shop_listings_bumped_idx   ON public.shop_listings(bumped_at DESC);
CREATE INDEX IF NOT EXISTS shop_listings_featured_idx ON public.shop_listings(featured_until DESC)
  WHERE featured_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS shop_listings_price_idx    ON public.shop_listings(price);

-- ── Theo dõi bộ lọc ─────────────────────────────────────────
-- Người mua lưu điều kiện tìm; có tin mới được duyệt khớp điều kiện thì được
-- báo. Rẻ hơn cron quét định kỳ: chỉ so khớp đúng lúc tin lên sàn.
CREATE TABLE IF NOT EXISTS public.shop_watchlists (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  label      text NOT NULL DEFAULT '',
  keyword    text,
  kind       text CHECK (kind IN ('account','item')),
  min_price  bigint,
  max_price  bigint,
  notify     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shop_watchlists_user_idx   ON public.shop_watchlists(user_id);
CREATE INDEX IF NOT EXISTS shop_watchlists_notify_idx ON public.shop_watchlists(notify) WHERE notify;

-- Mỗi người tối đa 10 bộ lọc — chặn ở tầng DB để API không phải tin client.
CREATE OR REPLACE FUNCTION public.shop_limit_watchlists()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT count(*) FROM public.shop_watchlists WHERE user_id = NEW.user_id) >= 10 THEN
    RAISE EXCEPTION 'Tối đa 10 bộ lọc theo dõi';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS shop_watchlists_limit ON public.shop_watchlists;
CREATE TRIGGER shop_watchlists_limit BEFORE INSERT ON public.shop_watchlists
  FOR EACH ROW EXECUTE FUNCTION public.shop_limit_watchlists();

-- ── RLS cho bảng mới của chợ ────────────────────────────────
ALTER TABLE public.shop_messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_message_reads  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_watchlists     ENABLE ROW LEVEL SECURITY;

-- Tin nhắn: đọc theo quyền của đơn tương ứng (giống shop_order_events).
DROP POLICY IF EXISTS "shop_messages_read" ON public.shop_messages;
CREATE POLICY "shop_messages_read" ON public.shop_messages FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM public.shop_orders
       WHERE buyer_id = auth.uid()
          OR agent_id = auth.uid()
          OR seller_id IN (SELECT id FROM public.shop_sellers WHERE user_id = auth.uid())
    )
    OR public.is_shop_agent()
  );
DROP POLICY IF EXISTS "shop_messages_write" ON public.shop_messages;
CREATE POLICY "shop_messages_write" ON public.shop_messages FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "shop_message_reads_own" ON public.shop_message_reads;
CREATE POLICY "shop_message_reads_own" ON public.shop_message_reads FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "shop_watchlists_own" ON public.shop_watchlists;
CREATE POLICY "shop_watchlists_own" ON public.shop_watchlists FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── Push web: biết token thuộc về ai ────────────────────────
-- Trước đây web push chỉ bắn được cho TẤT CẢ. Đơn hàng cần bắn đúng một người,
-- nên ghi thêm chủ sở hữu khi người đã đăng nhập bấm "bật thông báo".
ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON public.push_subscriptions(user_id);

-- ============================================================
-- PHẦN 2 — DISCORD
-- ============================================================

-- ── Liên kết tài khoản Discord <-> tài khoản site ───────────
-- discord_user_id là snowflake: lưu text để không mất chính xác ở JS.
CREATE TABLE IF NOT EXISTS public.discord_account_links (
  discord_user_id  text PRIMARY KEY,
  user_id          uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  discord_username text,
  guild_id         text,
  roles_synced_at  timestamptz,
  linked_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS discord_links_user_idx ON public.discord_account_links(user_id);

-- Mã liên kết dùng 1 lần (tạo trên web, gõ /lienket trong Discord).
CREATE TABLE IF NOT EXISTS public.discord_link_codes (
  code       text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS discord_link_codes_user_idx ON public.discord_link_codes(user_id);

-- ── Ticket hỗ trợ ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.discord_tickets (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id          text,
  channel_id        text NOT NULL,
  thread_id         text NOT NULL UNIQUE,
  opener_discord_id text NOT NULL,
  opener_user_id    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  topic             text NOT NULL DEFAULT 'khac',
  subject           text NOT NULL DEFAULT '',
  status            text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  closed_by         text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  closed_at         timestamptz
);
CREATE INDEX IF NOT EXISTS discord_tickets_status_idx ON public.discord_tickets(status, created_at DESC);
CREATE INDEX IF NOT EXISTS discord_tickets_opener_idx ON public.discord_tickets(opener_discord_id, created_at DESC);

-- ── Giveaway ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.discord_giveaways (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id     text,
  channel_id   text NOT NULL,
  message_id   text UNIQUE,
  prize        text NOT NULL,
  description  text NOT NULL DEFAULT '',
  winner_count integer NOT NULL DEFAULT 1 CHECK (winner_count BETWEEN 1 AND 20),
  -- Điều kiện tham gia: phải liên kết tài khoản site hay không.
  require_link boolean NOT NULL DEFAULT false,
  ends_at      timestamptz NOT NULL,
  ended        boolean NOT NULL DEFAULT false,
  winners      text[] NOT NULL DEFAULT '{}'::text[],
  created_by   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS discord_giveaways_open_idx ON public.discord_giveaways(ended, ends_at);

CREATE TABLE IF NOT EXISTS public.discord_giveaway_entries (
  giveaway_id     uuid NOT NULL REFERENCES public.discord_giveaways(id) ON DELETE CASCADE,
  discord_user_id text NOT NULL,
  user_id         uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (giveaway_id, discord_user_id)
);

-- ── Nhắc sự kiện: nhớ cái nào đã nhắc để cron không đăng lại ─
CREATE TABLE IF NOT EXISTS public.discord_event_reminders (
  event_id   text PRIMARY KEY,
  kind       text NOT NULL DEFAULT 'start',
  sent_at    timestamptz NOT NULL DEFAULT now()
);

-- ── RLS: chỉ service role (API) đụng được ───────────────────
ALTER TABLE public.discord_account_links    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_link_codes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_tickets          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_giveaways        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_giveaway_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_event_reminders  ENABLE ROW LEVEL SECURITY;

-- Người dùng được xem liên kết Discord của chính mình (trang cài đặt).
DROP POLICY IF EXISTS "discord_links_read_own" ON public.discord_account_links;
CREATE POLICY "discord_links_read_own" ON public.discord_account_links FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

-- Giveaway công khai để trang web hiện danh sách đang mở.
DROP POLICY IF EXISTS "discord_giveaways_read" ON public.discord_giveaways;
CREATE POLICY "discord_giveaways_read" ON public.discord_giveaways FOR SELECT USING (true);
