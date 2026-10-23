-- ============================================================
-- Arex Network — Biến môi trường lưu trong DB
--
-- Trên Vercel chỉ còn cấu hình Supabase; mọi biến còn lại (APP_SECRET, token
-- bot, khoá API...) nằm ở bảng app_env và được nạp vào process.env lúc máy chủ
-- khởi động (src/instrumentation.ts).
--
-- Bảng bật RLS và KHÔNG có policy nào: chỉ service role (server) đọc/ghi được.
-- Client anon/authenticated không bao giờ thấy.
--
-- Chạy lại nhiều lần an toàn (idempotent).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.app_env (
  name TEXT PRIMARY KEY CHECK (name ~ '^[A-Z][A-Z0-9_]*$'),
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_env ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_env FROM anon, authenticated;

-- ── Setting nhạy cảm ─────────────────────────────────────────
-- Setting nhạy cảm giờ lưu dạng rõ, nên danh sách chặn đọc phải khớp đủ với
-- SENSITIVE_KEYS (src/lib/server/setting-crypto.ts). Trước đây nhiều token bot
-- vắng mặt ở đây — user đã đăng nhập nào cũng SELECT được.
CREATE OR REPLACE FUNCTION public.is_sensitive_setting_key(k text)
RETURNS boolean LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT k = ANY(ARRAY[
    'mail.smtp_pass',
    'mail.smtp_user',
    'mail.smtp_host',
    'mail.from_email',
    'site.discord_webhook',
    'zalo.webhook_url',
    'zalo.group_id',
    'zalo.oa_access_token',
    'zalo.recipient_user_id',
    'ads.google_adsense_id',
    'ads.slot_header',
    'ads.slot_sidebar',
    'ads.slot_article',
    'integrations.lark_webhook_url',
    'integrations.lark_alerts_webhook_url',
    'integrations.telegram_bot_token',
    'integrations.zalo_bot_token',
    'integrations.zalo_bot_webhook_secret',
    'integrations.telegram_chat_id',
    'integrations.telegram_user_bot_token',
    'integrations.telegram_user_chat_id',
    'integrations.discord_bot_token',
    'integrations.firebase_private_key',
    'integrations.ai_api_key',
    'integrations.discord_internal_webhook',
    'integrations.discord_public_webhook',
    'integrations.lark_app_id',
    'integrations.lark_app_secret',
    'integrations.lark_sheet_token',
    'tms.payment_info',
    'push.vapid_private_key',
    'streams.youtube_api_key'
  ]);
$$;
REVOKE EXECUTE ON FUNCTION public.is_sensitive_setting_key(text) FROM anon, authenticated;
