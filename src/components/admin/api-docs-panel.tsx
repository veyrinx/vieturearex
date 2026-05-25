"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Copy, Check, Globe, Clock, Webhook, Bot, Lock, Terminal,
  ChevronDown, ChevronRight, ExternalLink, Key, Zap, MessageSquare,
  RefreshCw, Plug, Unplug, AlertCircle, CheckCircle2, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────
type Method = "GET" | "POST" | "PATCH" | "DELETE" | "PUT";

type Param = { name: string; type: string; desc: string; required?: boolean };

type Endpoint = {
  method: Method;
  path: string;
  desc: string;
  auth?: string;
  rateLimit?: string;
  params?: Param[];
  body?: string;
  response?: string;
  note?: string;
};

type Section = {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  desc: string;
  endpoints: Endpoint[];
};

// ── Constants ──────────────────────────────────────────────────────────────────
const METHOD_STYLE: Record<Method, string> = {
  GET:    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  POST:   "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25",
  PATCH:  "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
  DELETE: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25",
  PUT:    "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/25",
};

const BASE_URL = "https://arexnetwork.site";

const SECTIONS: Section[] = [
  // ── AUTH ────────────────────────────────────────────────────────────────────
  {
    id: "auth",
    title: "Xác thực",
    icon: Key,
    color: "text-violet-500",
    desc: "Các phương thức xác thực được sử dụng trong hệ thống.",
    endpoints: [
      {
        method: "POST",
        path: "/api/auth/register",
        desc: "Đăng ký tài khoản qua invited email (nếu bật chế độ mời).",
        body: JSON.stringify({ email: "user@example.com", password: "••••••••", invite_token: "optional" }, null, 2),
        response: JSON.stringify({ ok: true }, null, 2),
      },
      {
        method: "GET",
        path: "/api/auth/login-check",
        desc: "Kiểm tra trạng thái đăng nhập — trả về session hiện tại.",
        response: JSON.stringify({ loggedIn: true, email: "user@example.com" }, null, 2),
      },
      {
        method: "GET",
        path: "/api/user/me",
        desc: "Trả về role và quyền của user hiện đang đăng nhập.",
        auth: "Session cookie (Supabase Auth)",
        response: JSON.stringify({ role: "admin", isAdmin: true, canEdit: true }, null, 2),
      },
      {
        method: "GET",
        path: "/api/user/profile",
        desc: "Lấy thông tin hồ sơ đầy đủ của user đang đăng nhập.",
        auth: "Session cookie",
        response: JSON.stringify({ id: "uuid", display_name: "Tên hiển thị", email: "...", ff_id: "12345678", avatar_url: null }, null, 2),
      },
      {
        method: "PATCH",
        path: "/api/user/profile",
        desc: "Cập nhật hồ sơ user: display_name, bio, ff_id, social links…",
        auth: "Session cookie",
        rateLimit: "20 req/phút",
        body: JSON.stringify({ display_name: "Tên mới", bio: "Bio", ff_id: "12345678" }, null, 2),
        response: JSON.stringify({ ok: true }, null, 2),
      },
    ],
  },

  // ── WEBHOOK ─────────────────────────────────────────────────────────────────
  {
    id: "webhook",
    title: "Webhook",
    icon: Webhook,
    color: "text-pink-500",
    desc: "Nhận events từ Telegram bot và Zalo OA. Luôn trả về HTTP 200 kể cả lỗi logic.",
    endpoints: [
      {
        method: "POST",
        path: "/api/telegram/webhook",
        desc: "Nhận Telegram updates. Admin reply tin nhắn CSKH trong group → bot tự chèn vào support_messages.",
        auth: "Header: X-Telegram-Bot-Api-Secret-Token = TELEGRAM_WEBHOOK_SECRET",
        note: "Chỉ xử lý khi message là reply vào notification CSKH (chứa 'Session:' và UUID). Bỏ qua tin nhắn khác.",
        body: JSON.stringify({
          message: {
            from: { id: 123456, first_name: "Admin" },
            chat: { id: -1001234567890 },
            text: "OK bạn chờ xíu nhé",
            reply_to_message: { text: "💬 CSKH — Tin nhắn mới\n┗ Session: uuid-here" },
          },
        }, null, 2),
        response: JSON.stringify({ ok: true }, null, 2),
      },
      {
        method: "GET",
        path: "/api/telegram/webhook",
        desc: "Health check — Telegram gọi để kiểm tra endpoint còn sống.",
        response: JSON.stringify({ ok: true }, null, 2),
      },
      {
        method: "POST",
        path: "/api/admin/telegram/webhook-setup",
        desc: "Đăng ký hoặc xóa webhook URL với Telegram API. Chạy 1 lần để kích hoạt.",
        auth: "Admin session (minimumRole: admin)",
        body: JSON.stringify({ action: "set" }, null, 2),
        response: JSON.stringify({ ok: true, action: "set", webhook_url: `${BASE_URL}/api/telegram/webhook` }, null, 2),
        note: `action: "set" | "delete". Cần env TELEGRAM_WEBHOOK_SECRET để bảo mật.`,
      },
      {
        method: "GET",
        path: "/api/admin/telegram/webhook-setup",
        desc: "Kiểm tra thông tin webhook đang đăng ký với Telegram.",
        auth: "Admin session (minimumRole: admin)",
        response: JSON.stringify({ ok: true, info: { url: `${BASE_URL}/api/telegram/webhook`, pending_update_count: 0 } }, null, 2),
      },
      {
        method: "POST",
        path: "/api/admin/telegram/test",
        desc: "Gửi tin nhắn test tới bot Telegram để kiểm tra cấu hình.",
        auth: "Admin session (minimumRole: admin)",
        body: JSON.stringify({ bot: "admin" }, null, 2),
        response: JSON.stringify({ ok: true, bot: "admin" }, null, 2),
        note: `bot: "admin" (bot nội bộ) | "user" (bot public).`,
      },
      {
        method: "POST",
        path: "/api/zalo/webhook",
        desc: "Nhận Zalo OA events. Tự động OCR ảnh kết quả Free Fire và trả về K/A/D.",
        auth: "Header: X-Zalo-Signature = ZALO_WEBHOOK_SECRET (nếu cấu hình)",
        note: "Hỗ trợ: user_send_image, user_send_file, user_send_text (share link). OCR từ ảnh FF.",
        response: JSON.stringify({ ok: true }, null, 2),
      },
      {
        method: "GET",
        path: "/api/zalo/webhook",
        desc: "Verification endpoint khi đăng ký Zalo OA webhook — trả về challenge code.",
        response: "challenge_code (plain text)",
      },
      {
        method: "POST",
        path: "https://discord.com/api/webhooks/{id}/{token}",
        desc: "Outgoing — hệ thống GỬI thông báo ra Discord. Không phải route của server này.",
        auth: "Không cần — URL webhook đã chứa token (cấu hình trong Settings → Tích Hợp → Discord)",
        note: "Trigger: bài viết mới được duyệt. Cấu hình Webhook URL trong Server Settings → Integrations → Webhooks của Discord.",
        body: JSON.stringify({
          content: null,
          embeds: [{
            title: "📰 Bài mới: Tên bài viết",
            url: `${BASE_URL}/news/ten-bai-viet`,
            color: 0xfbbf24,
            description: "Mô tả bài viết...",
            footer: { text: "Arex Network" },
          }],
        }, null, 2),
        response: "HTTP 204 No Content (Discord)",
      },
      {
        method: "POST",
        path: "https://open.larksuite.com/open-apis/bot/v2/hook/{token}",
        desc: "Outgoing — hệ thống GỬI thông báo ra Lark/Feishu. Không phải route của server này.",
        auth: "Không cần — URL webhook đã chứa token (cấu hình trong Settings → Tích Hợp → Lark)",
        note: "Trigger: team join mới, báo cáo ngày (cron 07:00 ICT), cảnh báo bảo mật. Cấu hình webhook trong Lark → Bot → Webhook Bot.",
        body: JSON.stringify({
          msg_type: "interactive",
          card: {
            header: { title: { tag: "plain_text", content: "📊 Báo cáo ngày — Arex" } },
            elements: [{ tag: "div", text: { tag: "lark_md", content: "**Hôm nay:** 1,234 lượt xem" } }],
          },
        }, null, 2),
        response: JSON.stringify({ code: 0, msg: "success" }, null, 2),
      },
    ],
  },

  // ── CRON ────────────────────────────────────────────────────────────────────
  {
    id: "cron",
    title: "Cron Jobs",
    icon: Clock,
    color: "text-amber-500",
    desc: "Gọi tự động theo lịch (Vercel Cron). Auth: Bearer token trong header Authorization.",
    endpoints: [
      {
        method: "GET",
        path: "/api/cron/daily-report",
        desc: "Tổng hợp và gửi báo cáo hàng ngày qua Telegram + Lark. Chạy mỗi ngày lúc 7:00 ICT.",
        auth: "Authorization: Bearer CRON_SECRET",
        note: "Vercel cron: `0 0 * * *` (UTC = 7:00 ICT). Cần settings: integrations.lark_daily_report / integrations.telegram_daily_report.",
        response: JSON.stringify({ ok: true, sent: true, lark: true, telegram: true, today: 1234, yesterday: 890 }, null, 2),
      },
      {
        method: "GET",
        path: "/api/cron/ff-version-check",
        desc: "Kiểm tra phiên bản Free Fire mới trên Play Store và thông báo nếu có bản cập nhật.",
        auth: "Authorization: Bearer CRON_SECRET",
        note: "Vercel cron: `0 */24 * * *` (mỗi ngày 1 lần — giới hạn Hobby plan). Gửi thông báo qua Telegram + Lark + Push Notification.",
        response: JSON.stringify({ ok: true, isNew: true, version: "1.104.1", lastVersion: "1.103.0", cdnLinks: [] }, null, 2),
      },
    ],
  },

  // ── CSKH ────────────────────────────────────────────────────────────────────
  {
    id: "cskh",
    title: "CSKH / Support Chat",
    icon: MessageSquare,
    color: "text-green-500",
    desc: "API quản lý phiên hỗ trợ khách hàng (chat CSKH). User không cần đăng nhập.",
    endpoints: [
      {
        method: "POST",
        path: "/api/support/session",
        desc: "Tạo phiên CSKH mới hoặc lấy phiên đang mở. Nếu user đăng nhập, tự link user_id.",
        rateLimit: "20 req/phút",
        body: JSON.stringify({ display_name: "Khách", anonymous_id: "KH_ABCD1234" }, null, 2),
        response: JSON.stringify({ session_id: "uuid" }, null, 2),
        note: "Nếu đã có phiên đang mở (cùng anonymous_id hoặc user_id), trả về phiên cũ thay vì tạo mới.",
      },
      {
        method: "GET",
        path: "/api/support/session/[sessionId]/messages",
        desc: "Lấy tối đa 200 tin nhắn của phiên (poll mỗi 5 giây từ client).",
        response: JSON.stringify({
          messages: [
            { id: "uuid", sender_type: "user", sender_name: "Khách", content: "Xin chào", created_at: "2025-01-01T00:00:00Z" },
            { id: "uuid2", sender_type: "admin", sender_name: "[AI] Trợ Lý AI", content: "Chào bạn!", created_at: "2025-01-01T00:00:05Z" },
          ],
        }, null, 2),
      },
      {
        method: "POST",
        path: "/api/support/session/[sessionId]/messages",
        desc: "Gửi tin nhắn từ phía user. Tự động trigger AI auto-reply sau khi lưu.",
        rateLimit: "15 req/phút",
        body: JSON.stringify({ content: "Tôi cần hỗ trợ về tài khoản", sender_name: "Khách", anonymous_id: "KH_ABCD1234" }, null, 2),
        response: JSON.stringify({ ok: true }, null, 2),
        note: "AI reply được trigger fire-and-forget qua /api/support/session/[id]/ai-reply (internal, protected by x-internal-secret).",
      },
      {
        method: "POST",
        path: "/api/support/session/[sessionId]/ai-reply",
        desc: "Endpoint nội bộ — tự động generate và lưu AI reply. Không gọi trực tiếp từ client.",
        auth: "Header: x-internal-secret = CRON_SECRET hoặc APP_SECRET",
        response: JSON.stringify({ ok: true, refused: false, category: "general" }, null, 2),
        note: "AI sử dụng Claude Haiku. Từ chối các yêu cầu lập trình / hack. Bật/tắt qua settings: integrations.ai_auto_reply.",
      },
      {
        method: "GET",
        path: "/api/admin/support",
        desc: "Lấy danh sách tất cả phiên CSKH (admin panel).",
        auth: "Admin session (minimumRole: support)",
        rateLimit: "60 req/phút",
        response: JSON.stringify({ sessions: [{ id: "uuid", display_name: "Khách", status: "open", last_message_at: "..." }] }, null, 2),
      },
      {
        method: "PATCH",
        path: "/api/admin/support",
        desc: "Cập nhật trạng thái phiên (open/closed).",
        auth: "Admin session (minimumRole: support)",
        body: JSON.stringify({ id: "session-uuid", status: "closed" }, null, 2),
        response: JSON.stringify({ ok: true }, null, 2),
      },
      {
        method: "POST",
        path: "/api/admin/support/reply",
        desc: "Admin gửi tin nhắn vào phiên CSKH từ web panel.",
        auth: "Admin session (minimumRole: support)",
        rateLimit: "30 req/phút",
        body: JSON.stringify({ session_id: "uuid", content: "Xin chào, mình có thể giúp gì?" }, null, 2),
        response: JSON.stringify({ ok: true }, null, 2),
      },
    ],
  },

  // ── PUBLIC ───────────────────────────────────────────────────────────────────
  {
    id: "public",
    title: "Public API",
    icon: Globe,
    color: "text-blue-500",
    desc: "Các endpoint công khai, không cần xác thực. Phù hợp để tích hợp bên ngoài.",
    endpoints: [
      {
        method: "GET",
        path: "/api/events",
        desc: "Danh sách sự kiện (có filter theo status, search).",
        params: [
          { name: "status", type: "string", desc: '"upcoming" | "ongoing" | "ended" | "all"' },
          { name: "search", type: "string", desc: "Tìm kiếm theo tên sự kiện" },
          { name: "limit", type: "number", desc: "Số lượng kết quả (mặc định: 20)" },
        ],
        response: JSON.stringify({ events: [{ id: "uuid", title: "Sự kiện", status: "upcoming" }] }, null, 2),
      },
      {
        method: "GET",
        path: "/api/news",
        desc: "Danh sách bài viết tin tức đã xuất bản.",
        params: [
          { name: "limit", type: "number", desc: "Số lượng (mặc định: 10)" },
          { name: "offset", type: "number", desc: "Bỏ qua N bài đầu (pagination)" },
          { name: "category", type: "string", desc: "Lọc theo danh mục" },
        ],
        response: JSON.stringify({ news: [{ id: "uuid", title: "Bài viết", slug: "bai-viet" }] }, null, 2),
      },
      {
        method: "GET",
        path: "/api/streams",
        desc: "Danh sách stream đang/sắp live được cấu hình trong hệ thống.",
        response: JSON.stringify({ streams: [{ id: "uuid", channel: "example", platform: "youtube", status: "live" }] }, null, 2),
      },
      {
        method: "GET",
        path: "/api/gallery",
        desc: "Ảnh thư viện cộng đồng.",
        response: JSON.stringify({ items: [{ id: "uuid", url: "https://...", caption: "..." }] }, null, 2),
      },
      {
        method: "GET",
        path: "/api/notifications",
        desc: "Thông báo hệ thống (popup, banner) cho user đăng nhập.",
        auth: "Session cookie (không bắt buộc — trả thông báo public nếu không có session)",
        response: JSON.stringify({ notifications: [] }, null, 2),
      },
      {
        method: "GET",
        path: "/api/public/active-admins",
        desc: "Danh sách admin đang online trong 90 giây gần nhất.",
        response: JSON.stringify({ admins: [{ display_name: "Admin", avatar_url: null, role: "admin" }] }, null, 2),
      },
      {
        method: "GET",
        path: "/api/public/event-servers",
        desc: "Danh sách server sự kiện (phòng thi đấu) đang hoạt động.",
        response: JSON.stringify({ servers: [] }, null, 2),
      },
      {
        method: "GET",
        path: "/api/tms/tournaments",
        desc: "Danh sách giải đấu TMS.",
        response: JSON.stringify({ tournaments: [] }, null, 2),
      },
      {
        method: "GET",
        path: "/api/tms/matches",
        desc: "Kết quả các trận đấu.",
        params: [{ name: "tournament_id", type: "string", desc: "Lọc theo giải đấu" }],
        response: JSON.stringify({ matches: [] }, null, 2),
      },
      {
        method: "POST",
        path: "/api/analytics/pageview",
        desc: "Ghi lại lượt xem trang (gọi từ client sau khi tải trang).",
        body: JSON.stringify({ path: "/news/bai-viet-abc" }, null, 2),
        response: JSON.stringify({ ok: true }, null, 2),
      },
      {
        method: "POST",
        path: "/api/push/subscribe",
        desc: "Đăng ký nhận push notification trên browser.",
        body: JSON.stringify({ subscription: { endpoint: "...", keys: { p256dh: "...", auth: "..." } } }, null, 2),
        response: JSON.stringify({ ok: true }, null, 2),
      },
    ],
  },

  // ── ADMIN ────────────────────────────────────────────────────────────────────
  {
    id: "admin",
    title: "Admin API",
    icon: Lock,
    color: "text-red-500",
    desc: "Chỉ dành cho admin đã đăng nhập. Yêu cầu session cookie hợp lệ và role phù hợp.",
    endpoints: [
      {
        method: "GET",
        path: "/api/admin/users",
        desc: "Danh sách tất cả người dùng.",
        auth: "Admin session (minimumRole: manager)",
        response: JSON.stringify({ users: [{ id: "uuid", email: "...", display_name: "...", role: "user" }] }, null, 2),
      },
      {
        method: "GET",
        path: "/api/admin/stats",
        desc: "Thống kê tổng quan: user, event, news, views.",
        auth: "Admin session",
        response: JSON.stringify({ users: 100, events: 20, news: 50, views: 99999 }, null, 2),
      },
      {
        method: "GET",
        path: "/api/admin/logs",
        desc: "Nhật ký hoạt động admin (48 giờ gần nhất).",
        auth: "Admin session (minimumRole: manager)",
        response: JSON.stringify({ logs: [{ id: "uuid", email: "...", action: "...", created_at: "..." }] }, null, 2),
      },
      {
        method: "GET",
        path: "/api/admin/settings",
        desc: "Lấy toàn bộ cài đặt hệ thống (kể cả sensitive được decrypt).",
        auth: "Admin session (minimumRole: admin)",
        response: JSON.stringify({ settings: [{ key: "branding.site_name", value: "Arex" }] }, null, 2),
      },
      {
        method: "POST",
        path: "/api/push/send",
        desc: "Gửi push notification tới tất cả subscriber.",
        auth: "Admin session (minimumRole: admin)",
        body: JSON.stringify({ title: "Thông báo", body: "Nội dung", url: "/news/slug" }, null, 2),
        response: JSON.stringify({ ok: true, sent: 42 }, null, 2),
      },
      {
        method: "GET",
        path: "/api/admin/ff-version",
        desc: "Lấy thông tin phiên bản Free Fire đang lưu trong hệ thống.",
        auth: "Admin session",
        response: JSON.stringify({ version: "1.104.1", checkedAt: "2025-01-01T00:00:00Z" }, null, 2),
      },
    ],
  },
];

// ── CopyButton ──────────────────────────────────────────────────────────────────
function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      {copied ? <Check className="size-3 text-green-500" /> : <Copy className="size-3" />}
      {copied ? "Đã copy" : "Copy"}
    </button>
  );
}

// ── CodeBlock ───────────────────────────────────────────────────────────────────
function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-[#0d1117] dark:bg-[#161b22]">
      {label && (
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">{label}</span>
          <CopyButton text={code} />
        </div>
      )}
      <pre className="overflow-x-auto p-3 text-[11px] leading-relaxed text-slate-300">{code}</pre>
    </div>
  );
}

// ── MethodBadge ─────────────────────────────────────────────────────────────────
function MethodBadge({ method }: { method: Method }) {
  return (
    <span className={cn(
      "inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[10px] font-black tracking-wider",
      METHOD_STYLE[method],
    )}>
      {method}
    </span>
  );
}

// ── EndpointCard ────────────────────────────────────────────────────────────────
function EndpointCard({ ep }: { ep: Endpoint }) {
  const [open, setOpen] = useState(false);
  const fullPath = `${BASE_URL}${ep.path}`;
  const hasDetails = ep.auth || ep.rateLimit || ep.params?.length || ep.body || ep.response || ep.note;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/60 transition hover:border-border/80">
      {/* Header row */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3",
          hasDetails && "cursor-pointer hover:bg-muted/30",
        )}
        onClick={() => hasDetails && setOpen((v) => !v)}
        role={hasDetails ? "button" : undefined}
        tabIndex={hasDetails ? 0 : undefined}
        onKeyDown={(e) => { if (hasDetails && (e.key === "Enter" || e.key === " ")) setOpen((v) => !v); }}
      >
        <MethodBadge method={ep.method} />
        <code className="flex-1 truncate font-mono text-xs font-medium text-foreground">{ep.path}</code>
        <div className="flex shrink-0 items-center gap-1">
          <CopyButton text={fullPath} />
          {hasDetails && (
            <span className="text-muted-foreground/50">
              {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
            </span>
          )}
        </div>
      </div>

      <div className={cn("border-t border-border/60 px-4 pb-4 pt-3 space-y-3", !open && "hidden")}>
        <p className="text-xs text-muted-foreground leading-relaxed">{ep.desc}</p>

        <div className="grid gap-2 sm:grid-cols-2">
          {ep.auth && (
            <div className="flex items-start gap-2 rounded-lg border border-border bg-background/50 px-3 py-2">
              <Lock className="mt-0.5 size-3 shrink-0 text-amber-500" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Xác thực</p>
                <p className="text-xs text-foreground">{ep.auth}</p>
              </div>
            </div>
          )}
          {ep.rateLimit && (
            <div className="flex items-start gap-2 rounded-lg border border-border bg-background/50 px-3 py-2">
              <Zap className="mt-0.5 size-3 shrink-0 text-blue-500" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Rate Limit</p>
                <p className="text-xs text-foreground">{ep.rateLimit}</p>
              </div>
            </div>
          )}
        </div>

        {ep.note && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
            <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">⚠ {ep.note}</p>
          </div>
        )}

        {ep.params && ep.params.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Query Params</p>
            <div className="overflow-hidden rounded-xl border border-border">
              {ep.params.map((p, i) => (
                <div key={p.name} className={cn("flex items-start gap-3 px-3 py-2 text-xs", i > 0 && "border-t border-border")}>
                  <code className="shrink-0 font-mono font-semibold text-primary dark:text-amber-400">{p.name}</code>
                  <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">{p.type}</span>
                  <span className="text-muted-foreground">{p.desc}</span>
                  {p.required && <span className="shrink-0 text-red-500">*</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {ep.body && (
          <div>
            <CodeBlock code={ep.body} label="Request Body (JSON)" />
          </div>
        )}

        {ep.response && (
          <div>
            <CodeBlock code={ep.response} label="Response" />
          </div>
        )}

        {/* Full URL */}
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background/50 px-3 py-2">
          <Terminal className="size-3 shrink-0 text-muted-foreground" />
          <code className="flex-1 truncate font-mono text-[11px] text-muted-foreground">{fullPath}</code>
          <a
            href={ep.method === "GET" ? fullPath : undefined}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => ep.method !== "GET" && e.preventDefault()}
            className={cn("shrink-0 rounded-lg p-1 text-muted-foreground transition hover:text-foreground", ep.method !== "GET" && "cursor-default opacity-30")}
          >
            <ExternalLink className="size-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

// ── WebhookSetupCard ────────────────────────────────────────────────────────────
type WebhookInfo = {
  url?: string;
  pending_update_count?: number;
  last_error_message?: string;
  max_connections?: number;
};

type SetupStatus = "idle" | "loading" | "success" | "error";

function WebhookSetupCard() {
  const [info, setInfo] = useState<WebhookInfo | null>(null);
  const [fetching, setFetching] = useState(true);
  const [status, setStatus] = useState<SetupStatus>("idle");
  const [message, setMessage] = useState("");

  const fetchInfo = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch("/api/admin/telegram/webhook-setup");
      if (res.ok) {
        const data = (await res.json()) as { ok: boolean; info?: WebhookInfo };
        setInfo(data.info ?? null);
      }
    } catch { /**/ } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => { void fetchInfo(); }, [fetchInfo]);

  const run = async (action: "set" | "delete") => {
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/admin/telegram/webhook-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as { ok: boolean; reason?: string; webhook_url?: string };
      if (data.ok) {
        setStatus("success");
        setMessage(action === "set" ? "Webhook đã được đăng ký thành công!" : "Webhook đã được gỡ bỏ.");
        await fetchInfo();
      } else {
        setStatus("error");
        setMessage(data.reason ?? "Thao tác thất bại.");
      }
    } catch {
      setStatus("error");
      setMessage("Lỗi kết nối. Vui lòng thử lại.");
    }
    setTimeout(() => { setStatus("idle"); setMessage(""); }, 4000);
  };

  const isRegistered = Boolean(info?.url);

  return (
    <div className="overflow-hidden rounded-2xl border border-pink-500/20 bg-pink-500/5 dark:border-pink-500/15 dark:bg-pink-500/5">
      {/* Title bar */}
      <div className="flex items-center justify-between border-b border-pink-500/15 px-4 py-3">
        <div className="flex items-center gap-2">
          <Webhook className="size-4 text-pink-500" />
          <span className="text-sm font-bold uppercase tracking-wider text-foreground">Telegram Webhook</span>
          {fetching ? (
            <Loader2 className="size-3 animate-spin text-muted-foreground" />
          ) : (
            <span className={cn(
              "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider",
              isRegistered
                ? "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400"
                : "border-red-500/30 bg-red-500/10 text-red-500",
            )}>
              <span className={cn("size-1.5 rounded-full", isRegistered ? "bg-green-500" : "bg-red-500")} />
              {isRegistered ? "Đã kết nối" : "Chưa kết nối"}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={fetchInfo}
          disabled={fetching}
          className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
          title="Làm mới trạng thái"
        >
          <RefreshCw className={cn("size-3.5", fetching && "animate-spin")} />
        </button>
      </div>

      <div className="space-y-3 p-4">
        {/* Current webhook URL */}
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Webhook URL hiện tại</p>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background/70 px-3 py-2">
            <Terminal className="size-3 shrink-0 text-muted-foreground" />
            {fetching ? (
              <span className="text-xs text-muted-foreground">Đang kiểm tra…</span>
            ) : info?.url ? (
              <>
                <code className="flex-1 truncate font-mono text-[11px] text-foreground">{info.url}</code>
                <CopyButton text={info.url} />
              </>
            ) : (
              <span className="text-xs text-muted-foreground italic">Chưa đăng ký</span>
            )}
          </div>
        </div>

        {/* Stats row when registered */}
        {info?.url && (
          <div className="flex flex-wrap gap-2">
            {info.pending_update_count !== undefined && (
              <div className="rounded-lg border border-border bg-background/60 px-2.5 py-1.5 text-center">
                <p className="text-[10px] text-muted-foreground">Pending updates</p>
                <p className="text-sm font-bold text-foreground">{info.pending_update_count}</p>
              </div>
            )}
            {info.max_connections && (
              <div className="rounded-lg border border-border bg-background/60 px-2.5 py-1.5 text-center">
                <p className="text-[10px] text-muted-foreground">Max connections</p>
                <p className="text-sm font-bold text-foreground">{info.max_connections}</p>
              </div>
            )}
            {info.last_error_message && (
              <div className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-2.5 py-1.5">
                <AlertCircle className="size-3 text-red-500" />
                <p className="text-[11px] text-red-500">{info.last_error_message}</p>
              </div>
            )}
          </div>
        )}

        {/* Feedback message */}
        {message && (
          <div className={cn(
            "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium",
            status === "success"
              ? "border-green-500/25 bg-green-500/10 text-green-600 dark:text-green-400"
              : "border-red-500/25 bg-red-500/10 text-red-500",
          )}>
            {status === "success" ? <CheckCircle2 className="size-3.5 shrink-0" /> : <AlertCircle className="size-3.5 shrink-0" />}
            {message}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => run("set")}
            disabled={status === "loading"}
            className="flex items-center gap-1.5 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-green-600 transition hover:bg-green-500/20 dark:text-green-400 disabled:opacity-50"
          >
            {status === "loading" ? <Loader2 className="size-3.5 animate-spin" /> : <Plug className="size-3.5" />}
            {isRegistered ? "Cập nhật Webhook" : "Setup Webhook"}
          </button>

          {isRegistered && (
            <button
              type="button"
              onClick={() => run("delete")}
              disabled={status === "loading"}
              className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-500 transition hover:bg-red-500/20 disabled:opacity-50"
            >
              {status === "loading" ? <Loader2 className="size-3.5 animate-spin" /> : <Unplug className="size-3.5" />}
              Gỡ Webhook
            </button>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground">
          Cần env <code className="font-mono">TELEGRAM_WEBHOOK_SECRET</code> và bot token được cấu hình trong Settings → Integrations.
        </p>
      </div>
    </div>
  );
}

// ── TelegramTestCard ────────────────────────────────────────────────────────────
function TelegramTestCard() {
  const [statusAdmin, setStatusAdmin] = useState<SetupStatus>("idle");
  const [statusUser, setStatusUser] = useState<SetupStatus>("idle");
  const [msgAdmin, setMsgAdmin] = useState("");
  const [msgUser, setMsgUser] = useState("");

  const test = async (bot: "admin" | "user") => {
    const setStatus = bot === "admin" ? setStatusAdmin : setStatusUser;
    const setMsg    = bot === "admin" ? setMsgAdmin    : setMsgUser;
    setStatus("loading");
    setMsg("");
    try {
      const res = await fetch("/api/admin/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot }),
      });
      const data = (await res.json()) as { ok: boolean; reason?: string };
      if (data.ok) {
        setStatus("success");
        setMsg(bot === "admin" ? "Bot Admin đã gửi tin nhắn test!" : "Bot User đã gửi tin nhắn test!");
      } else {
        setStatus("error");
        setMsg(data.reason ?? "Gửi thất bại — kiểm tra token trong Settings.");
      }
    } catch {
      setStatus("error");
      setMsg("Lỗi kết nối.");
    }
    setTimeout(() => { setStatus("idle"); setMsg(""); }, 4000);
  };

  const BotRow = ({
    bot, label, desc, color, status, msg,
  }: {
    bot: "admin" | "user";
    label: string;
    desc: string;
    color: string;
    status: SetupStatus;
    msg: string;
  }) => (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-background/60 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={`text-xs font-bold ${color}`}>{label}</p>
          <p className="text-[10px] text-muted-foreground">{desc}</p>
        </div>
        <button
          type="button"
          onClick={() => test(bot)}
          disabled={status === "loading"}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition disabled:opacity-50",
            bot === "admin"
              ? "border-violet-500/30 bg-violet-500/10 text-violet-600 hover:bg-violet-500/20 dark:text-violet-400"
              : "border-blue-500/30 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:text-blue-400",
          )}
        >
          {status === "loading" ? <Loader2 className="size-3 animate-spin" /> : <Bot className="size-3" />}
          Test
        </button>
      </div>
      {msg && (
        <div className={cn(
          "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium",
          status === "success"
            ? "border-green-500/25 bg-green-500/10 text-green-600 dark:text-green-400"
            : "border-red-500/25 bg-red-500/10 text-red-500",
        )}>
          {status === "success" ? <CheckCircle2 className="size-3 shrink-0" /> : <AlertCircle className="size-3 shrink-0" />}
          {msg}
        </div>
      )}
    </div>
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-violet-500/20 bg-violet-500/5 dark:border-violet-500/15">
      <div className="flex items-center gap-2 border-b border-violet-500/15 px-4 py-3">
        <Bot className="size-4 text-violet-500" />
        <span className="text-sm font-bold uppercase tracking-wider text-foreground">Test Bot Telegram</span>
        <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-violet-600 dark:text-violet-400">
          2 bots
        </span>
      </div>
      <div className="space-y-2 p-4">
        <BotRow
          bot="admin"
          label="Bot Admin (nội bộ)"
          desc="Gửi vào group/channel nội bộ — nhận alerts CSKH, bảo mật, báo cáo ngày"
          color="text-violet-600 dark:text-violet-400"
          status={statusAdmin}
          msg={msgAdmin}
        />
        <BotRow
          bot="user"
          label="Bot User (public)"
          desc="Gửi vào channel public — thông báo sự kiện mới, bài viết, FF update"
          color="text-blue-600 dark:text-blue-400"
          status={statusUser}
          msg={msgUser}
        />
        <p className="text-[10px] text-muted-foreground">
          Bot token cấu hình trong Settings → Integrations → Telegram.
        </p>
      </div>
    </div>
  );
}

// ── Main panel ──────────────────────────────────────────────────────────────────
export function ApiDocsPanel() {
  const [activeSection, setActiveSection] = useState<string>("webhook");

  const current = SECTIONS.find((s) => s.id === activeSection) ?? SECTIONS[0];

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[24px] border border-primary/15 bg-gradient-to-br from-primary/8 via-primary/4 to-card p-6 dark:border-amber-400/15 dark:from-amber-500/8 dark:via-amber-400/4">
        <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-primary/10 blur-[50px] dark:bg-amber-400/10" />
        <div className="relative z-10">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 dark:bg-amber-400/10">
              <Bot className="size-4 text-primary dark:text-amber-400" />
            </div>
            <h1 className="font-heading text-2xl font-bold uppercase tracking-[0.06em] text-foreground">API DOCS</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Tài liệu đầy đủ cho tất cả API, Webhook và Cron Job của hệ thống.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background/60 px-3 py-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Base URL</span>
              <code className="font-mono text-[11px] font-semibold text-foreground">{BASE_URL}</code>
              <CopyButton text={BASE_URL} />
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background/60 px-3 py-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Auth Cron</span>
              <code className="font-mono text-[11px] text-foreground">Authorization: Bearer {"{CRON_SECRET}"}</code>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[200px_1fr]">
        {/* Section nav */}
        <nav className="flex flex-row flex-wrap gap-1.5 lg:flex-col">
          {SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const isActive = sec.id === activeSection;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] transition",
                  isActive
                    ? "border-primary/25 bg-primary/10 text-primary dark:border-primary/20 dark:bg-primary/12 dark:text-amber-300"
                    : "border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className={cn("size-3.5 shrink-0", isActive ? "text-primary dark:text-amber-400" : sec.color)} />
                {sec.title}
                <span className="ml-auto shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                  {sec.endpoints.length}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Endpoints */}
        <div className="min-w-0 space-y-4">
          <div className="flex items-center gap-2">
            {(() => { const Icon = current.icon; return <Icon className={cn("size-4", current.color)} />; })()}
            <div>
              <h2 className="font-heading text-base font-bold uppercase tracking-[0.08em] text-foreground">{current.title}</h2>
              <p className="text-xs text-muted-foreground">{current.desc}</p>
            </div>
          </div>

          <div className="space-y-2">
            {current.id === "webhook" && <WebhookSetupCard />}
            {current.id === "webhook" && <TelegramTestCard />}
            {current.endpoints.map((ep) => (
              <EndpointCard key={`${ep.method}-${ep.path}`} ep={ep} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
