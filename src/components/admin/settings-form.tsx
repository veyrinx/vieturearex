"use client";

import { SITE_URL } from "@/lib/constants/site";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Eye, EyeOff, ShieldCheck, Palette, Search, Home, Share2, Plug,
  User, Facebook, Youtube, Mail, Save, ImageIcon, Clock, Sparkles,
  Globe, BarChart3, MonitorPlay, LayoutGrid, Newspaper, Wrench,
  AlertTriangle, CheckCircle2, MessageSquare, BellRing, Users, Calendar, Trophy, Zap, CreditCard, SendHorizonal, Loader2,
  Bell, Tv, Paintbrush, UserCog, FileText, Hash, Columns3, Send, Trash2, Phone,
} from "lucide-react";
import { ImageUploadButton } from "@/components/common/image-upload-button";
import type { SiteSetting } from "@/lib/types/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MailTestButton } from "@/components/admin/mail-test-button";
import { ManualMailSender } from "@/components/admin/manual-mail-sender";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { defaultSiteSettingValues, defaultIscSettingValues, getConfiguredSensitiveKeys, getSettingsFormInitialState, SENSITIVE_FORM_KEYS, SITE_SPECIFIC_SETTING_KEYS } from "@/lib/utils/site-settings";

// ─── Types ──────────────────────────────────────────────────────────────────

type SettingsFormProps = { settings: SiteSetting[]; onSaved: () => Promise<void>; siteId?: "arex" | "isc" };

// ─── Nav config ─────────────────────────────────────────────────────────────

const NAV_GROUPS = {
  "Cá nhân": [
    { id: "account",      icon: User,         label: "Tài Khoản",   desc: "Hồ sơ & mật khẩu" },
  ],
  "Nội dung": [
    { id: "content",      icon: FileText,     label: "Nội Dung",    desc: "Bình luận & bài viết" },
    { id: "event_servers", icon: Globe,       label: "Server Sự Kiện", desc: "Server tuỳ chỉnh" },
    { id: "streams",      icon: Tv,           label: "Livestream",  desc: "YouTube livestream" },
    { id: "tms",          icon: Trophy,       label: "Giải Đấu",    desc: "Quota & thanh toán TMS" },
  ],
  "Giao diện": [
    { id: "branding",     icon: Palette,      label: "Thương Hiệu", desc: "Tên, logo, favicon" },
    { id: "appearance",   icon: Paintbrush,   label: "Giao Diện",   desc: "Màu sắc & card style" },
    { id: "seo",          icon: Search,       label: "SEO",         desc: "Tiêu đề & mô tả" },
    { id: "home",         icon: Home,         label: "Trang Chủ",   desc: "Hero & slider" },
    { id: "ads",          icon: BarChart3,    label: "Quảng Cáo",   desc: "Google AdSense" },
  ],
  "Hệ thống": [
    { id: "users",        icon: UserCog,      label: "Người Dùng",  desc: "Đăng ký & hồ sơ" },
    { id: "team_join",    icon: Users,        label: "Team Join",   desc: "Form mời gia nhập" },
    { id: "social",       icon: Share2,       label: "Mạng Xã Hội", desc: "Facebook, YouTube…" },
    { id: "community",    icon: Users,        label: "Cộng Đồng",   desc: "Thống kê & ngày ra mắt" },
    { id: "integrations", icon: Plug,         label: "Tích Hợp",    desc: "Zalo, Discord, Lark, Telegram, AI" },
    { id: "push",         icon: Bell,         label: "Push Notify", desc: "Web push notifications" },
    { id: "mail",         icon: Mail,         label: "Email",        desc: "Cấu hình SMTP" },
    { id: "maintenance",  icon: Wrench,       label: "Bảo Trì",     desc: "Chế độ bảo trì" },
  ],
} as const;

const NAV_ITEMS = Object.values(NAV_GROUPS).flat();

type SectionId = (typeof NAV_ITEMS)[number]["id"];

// ─── Static data ─────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  super_admin: { label: "Super Admin", color: "bg-red-500/10 text-red-500 border-red-500/20" },
  admin:       { label: "Admin",       color: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  it:          { label: "IT",          color: "bg-violet-500/10 text-violet-500 border-violet-500/20" },
  manager:     { label: "Manager",     color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  support:     { label: "Support",     color: "bg-green-500/10 text-green-500 border-green-500/20" },
  user:        { label: "User",        color: "bg-muted text-muted-foreground border-border" },
};

const SLIDER_EFFECTS = [
  { value: "fade",      label: "Fade",            desc: "Mờ dần mượt mà" },
  { value: "zoom",      label: "Zoom Cinematic",  desc: "Phóng to nhẹ" },
  { value: "slide",     label: "Slide Smooth",    desc: "Trượt ngang" },
  { value: "drift",     label: "Drift Parallax",  desc: "Parallax 3D" },
  { value: "cinematic", label: "Cinematic Blur",  desc: "Mờ điện ảnh" },
] as const;

// ─── Small components ────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc?: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-border pb-5 mb-5">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="font-heading text-base font-bold uppercase tracking-[0.08em] text-foreground">{title}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
    </div>
  );
}

function Field({ label, hint, children, icon: Icon }: {
  label: string; hint?: string; children: React.ReactNode; icon?: React.ElementType;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-[200px_1fr] sm:items-start sm:gap-4">
      <div className="flex items-center gap-1.5 sm:pt-2.5">
        {Icon && <Icon className="size-3.5 shrink-0 text-muted-foreground" />}
        <div>
          <p className="text-xs font-semibold text-foreground">{label}</p>
          {hint && <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{hint}</p>}
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("divide-y divide-border rounded-2xl border border-border/50 bg-card/50 px-5 shadow-sm", className)}>
      {children}
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder, show, onToggle }: {
  value: string; onChange: (v: string) => void; placeholder: string; show: boolean; onToggle: () => void;
}) {
  const strength = value.length === 0 ? 0 : value.length < 8 ? 1 : value.length < 12 ? 2 : 3;
  const colors = ["", "bg-red-500", "bg-yellow-500", "bg-green-500"];
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pr-10" />
        <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {value.length > 0 && (
        <div className="flex gap-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className={cn("h-1 flex-1 rounded-full transition-colors", i <= strength ? colors[strength] : "bg-border")} />
          ))}
        </div>
      )}
    </div>
  );
}

function SensitiveHint({ hint }: { hint: string | null }) {
  if (!hint) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
      <ShieldCheck className="size-3" /> {hint}
    </p>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none",
        checked ? "bg-primary" : "bg-muted",
      )}
    >
      <span className={cn("pointer-events-none inline-block size-5 rounded-full bg-white shadow-md transition-transform", checked ? "translate-x-5" : "translate-x-0")} />
      {label && <span className="sr-only">{label}</span>}
    </button>
  );
}

/** Xem trước đúng hình dáng tin nhắn sẽ gửi — chữ nào ra chữ nấy, kể cả xuống dòng. */
// Giữ khớp với DEFAULT_WELCOME_TEXT / DEFAULT_FAREWELL_TEXT trong
// lib/server/group-greeting.ts — hai chỗ này phải nói cùng một câu.
const DEFAULT_WELCOME_PREVIEW =
  "👋 Chào {name} đã vào nhóm!\n\n" +
  "Gõ `help` để xem bot làm được gì, `diemdanh` để điểm danh nhận điểm.\n" +
  `🔗 ${SITE_URL}`;

const DEFAULT_FAREWELL_PREVIEW = "🙋 {name} vừa rời nhóm. Hẹn gặp lại!";

/** Tách danh sách chat id — khớp parseChatIds trong lib/server/zalo-broadcast.ts. */
function splitChatIds(raw: string): string[] {
  return [...new Set(raw.split(/[\r\n,;]+/).map((x) => x.trim()).filter(Boolean))];
}

/** Thay chỗ trống bằng tên mẫu để xem trước — đúng cách bot thay lúc chạy thật. */
function previewGreeting(template: string): string {
  return template
    .replaceAll("{name}", "Minh Anh")
    .replaceAll("{group}", "Cộng đồng Arex")
    .replaceAll("{site}", SITE_URL);
}

function ChatPreview({ text, empty = "Chưa có nội dung" }: { text: string; empty?: string }) {
  const body = text.trim();
  return (
    <div className="mt-2 rounded-xl border border-border/60 bg-muted/30 p-3">
      <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <MessageSquare className="size-3" /> Xem trước
      </p>
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-primary/10 px-3 py-2">
        {body ? (
          <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground">{body}</p>
        ) : (
          <p className="text-xs italic text-muted-foreground">{empty}</p>
        )}
      </div>
    </div>
  );
}

function HourSelect({ value, onChange, hint }: { value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Select value={value || "__global__"} onValueChange={(v) => onChange(!v || v === "__global__" ? "" : v)}>
        <SelectTrigger className="max-w-44">
          <SelectValue placeholder="Theo lịch chung" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__global__">
            <span className="text-muted-foreground">Theo lịch chung</span>
          </SelectItem>
          {Array.from({ length: 24 }, (_, h) => (
            <SelectItem key={h} value={String(h)}>
              {String(h).padStart(2, "0")}:00 ICT
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

function getSlots(value: string) {
  const s = value.split(/\r?\n/);
  return Array.from({ length: 3 }, (_, i) => s[i] ?? "");
}

// ─── Main component ──────────────────────────────────────────────────────────

export function SettingsForm({ settings, onSaved, siteId = "arex" }: SettingsFormProps) {
  const [active, setActive] = useState<SectionId>("account");
  const [state, setState] = useState<Record<string, string>>(() => getSettingsFormInitialState(settings));
  const [configuredKeys] = useState<Set<string>>(() => getConfiguredSensitiveKeys(settings));

  // Returns the storage key for a setting — ISC site-specific keys get an "isc:" prefix
  const pk = (key: string) =>
    siteId === "isc" && SITE_SPECIFIC_SETTING_KEYS.has(key) ? `isc:${key}` : key;

  // Account state
  const [profile, setProfile] = useState<{ email: string; display_name: string; role: string } | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [tgTest, setTgTest] = useState<Record<string, "idle" | "loading" | "ok" | "err">>({});
  const [reportSending, setReportSending] = useState(false);
  const [miniAppStats, setMiniAppStats] = useState<{ active: number; total: number } | null>(null);
  const [miniAppBroadcast, setMiniAppBroadcast] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [webhookStatus, setWebhookStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [zaloHookStatus, setZaloHookStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [zaloTestStatus, setZaloTestStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  // Toast bay mất sau vài giây, admin chỉ kịp thấy dấu X — giữ nguyên văn phản hồi
  // của Zalo ngay dưới nút để còn lần ra lý do.
  const [zaloHookDetail, setZaloHookDetail] = useState<string | null>(null);
  const [zaloChats, setZaloChats] = useState<{ chat_id: string; name: string; type: string; last_text: string }[] | null>(null);
  const [zaloChatsStatus, setZaloChatsStatus] = useState<"idle" | "loading">("idle");
  const [zaloNotify, setZaloNotify] = useState({ title: "", text: "", image: "", target: "configured" as "configured" | "all" });
  const [zaloNotifyStatus, setZaloNotifyStatus] = useState<"idle" | "loading">("idle");
  type HealthCheck = { name: string; ok: boolean; detail: string; fix?: string };
  const [health, setHealth] = useState<{ ok: boolean; checks: HealthCheck[] } | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const dirtyRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  async function sendReportNow() {
    setReportSending(true);
    try {
      const res = await fetch("/api/admin/report/trigger", { method: "POST" });
      const d = await res.json().catch(() => ({})) as { sent?: boolean; reason?: string };
      if (res.ok && d.sent) toast.success("Đã gửi báo cáo thành công tới các kênh!");
      else toast.error(`Gửi thất bại: ${d.reason ?? "kiểm tra cấu hình channel"}`);
    } catch {
      toast.error("Lỗi kết nối");
    } finally {
      setReportSending(false);
    }
  }

  async function loadMiniAppStats() {
    const res = await fetch("/api/admin/telegram/miniapp").catch(() => null);
    if (!res?.ok) return;
    const d = (await res.json().catch(() => null)) as { active: number; total: number } | null;
    if (d) setMiniAppStats(d);
  }

  async function sendBroadcastTest() {
    setMiniAppBroadcast("loading");
    try {
      const res = await fetch("/api/admin/telegram/miniapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "broadcast_test" }),
      });
      setMiniAppBroadcast(res.ok ? "ok" : "err");
      if (res.ok) toast.success("Đã broadcast test tới tất cả subscribers!");
      else toast.error("Broadcast thất bại — kiểm tra bot token");
    } catch {
      setMiniAppBroadcast("err");
      toast.error("Lỗi kết nối");
    }
    setTimeout(() => setMiniAppBroadcast("idle"), 4000);
  }

  /** Soi một lượt: email, bot Telegram, webhook, Discord. Không gửi thư/tin nào. */
  async function checkIntegrations() {
    setHealthLoading(true);
    try {
      const res = await fetch("/api/admin/integrations-health");
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; checks?: HealthCheck[] };
      if (!res.ok || !d.checks) {
        toast.error("Không kiểm tra được — thử lại sau.");
      } else {
        setHealth({ ok: Boolean(d.ok), checks: d.checks });
        if (d.ok) toast.success("Tất cả tích hợp đều ổn.");
        else toast.warning(`${d.checks.filter((c) => !c.ok).length} mục đang có vấn đề.`);
      }
    } catch {
      toast.error("Lỗi kết nối");
    }
    setHealthLoading(false);
  }

  async function setupZaloWebhook() {
    setZaloHookStatus("loading");
    setZaloHookDetail(null);
    try {
      const res = await fetch("/api/admin/zalo/webhook-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set" }),
      });
      const d = (await res.json().catch(() => ({}))) as {
        ok?: boolean; webhook_url?: string; reason?: string;
        switched_from?: string; secret_configured?: boolean;
        verification?: {
          success?: boolean; ok?: boolean; status?: string | number;
          status_code?: number; error?: string; message?: string; description?: string;
        } | null;
        self_check?: { status: number; ms: number; redirected_to: string | null; body: string } | null;
        probes?: { url: string; status: number }[];
        blocked_by_cdn?: boolean;
        protected_by_vercel?: boolean;
        diagnosis?: string | null;
        bot?: { display_name?: string; account_name?: string } | null;
      };
      setZaloHookStatus(res.ok && d.ok ? "ok" : "err");
      setZaloHookDetail(`HTTP ${res.status}
${JSON.stringify(d, null, 2)}`);
      if (res.ok && d.ok) {
        const ver = d.verification;
        // setWebhook báo ok chưa có nghĩa là chạy: Zalo tự gọi thử webhook ngay
        // sau đó, hỏng ở bước này là bot câm.
        const verFailed = Boolean(ver && (ver.success === false || ver.ok === false));
        const botName = d.bot?.display_name ?? d.bot?.account_name ?? "";
        if (!verFailed && !d.diagnosis) {
          toast.success(`Webhook Zalo đã set: ${d.webhook_url}${botName ? ` — ${botName}` : ""}`);
        } else {
          setZaloHookStatus("err");
          // MỘT câu thôi. Chi tiết đầy đủ nằm ở khối bên dưới nút, không bay mất.
          toast.error(
            d.diagnosis ??
              `Zalo gọi thử webhook không thành công (${
                ver?.error ?? ver?.message ?? ver?.description ?? ver?.status_code ?? "không rõ lý do"
              }) trong khi cửa vào vẫn trả HTTP ${d.self_check?.status ?? "?"} — xem chi tiết bên dưới.`,
            { duration: 30000 },
          );
        }
        if (d.secret_configured === false) {
          toast.warning("Không lưu được secret webhook — ai cũng giả được cập nhật gửi tới webhook.");
        }
      } else {
        toast.error(
          d.reason === "bot_token_not_configured"
            ? "Chưa có Zalo Bot Token — nhập token ở trên rồi Lưu trước."
            : d.reason === "bot_token_malformed"
              ? "Zalo Bot Token sai dạng — phải là <số>:<chuỗi>, ví dụ 1234567890:abcDEF_123. Dán lại từ bot.zapps.me, đừng kèm dấu nháy hay khoảng trắng."
              : `Set webhook Zalo thất bại: ${d.reason ?? "kiểm tra token"}`,
        );
      }
    } catch (err) {
      setZaloHookStatus("err");
      setZaloHookDetail(`Lỗi kết nối: ${String(err)}`);
      toast.error("Lỗi kết nối");
    }
    setTimeout(() => setZaloHookStatus("idle"), 5000);
  }

  // Lấy chat_id mà không phải mò: hỏi thẳng Zalo xem ai đã nhắn bot.
  async function loadZaloChats() {
    setZaloChatsStatus("loading");
    try {
      const res = await fetch("/api/admin/zalo/webhook-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "chats" }),
      });
      const d = (await res.json().catch(() => ({}))) as {
        ok?: boolean; reason?: string; hint?: string | null; updates_error?: string | null;
        chats?: { chat_id: string; name: string; type: string; last_text: string }[];
      };
      if (res.ok && d.ok) {
        setZaloChats(d.chats ?? []);
        if (!d.chats?.length) toast.info(d.hint ?? "Chưa có chat nào nhắn bot.");
        else toast.success(`Tìm thấy ${d.chats.length} chat — bấm vào một dòng để điền Chat ID.`);
        if (d.updates_error) {
          toast.warning(`Zalo không trả được lịch sử tin (${d.updates_error}) — danh sách dưới đây lấy từ những chat đã nhắn bot trước đó.`);
        }
      } else {
        toast.error(`Không lấy được danh sách chat: ${d.reason ?? "kiểm tra token"}`);
      }
    } catch {
      toast.error("Lỗi kết nối");
    }
    setZaloChatsStatus("idle");
  }

  async function sendZaloNotify() {
    if (!zaloNotify.text.trim()) {
      toast.error("Nhập nội dung thông báo đã.");
      return;
    }
    setZaloNotifyStatus("loading");
    try {
      const res = await fetch("/api/admin/zalo/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: zaloNotify.title.trim() || undefined,
          text: zaloNotify.text.trim(),
          image_url: zaloNotify.image.trim() || undefined,
          target: zaloNotify.target,
        }),
      });
      const d = (await res.json().catch(() => ({}))) as {
        ok?: boolean; sent?: number; failed?: number; skipped?: number; reason?: string; hint?: string;
      };
      if (res.ok && d.ok) {
        toast.success(
          `Đã gửi tới ${d.sent} chat${d.failed ? `, ${d.failed} chat lỗi` : ""}${d.skipped ? `, còn ${d.skipped} chat chưa gửi` : ""}.`,
          { duration: 12000 },
        );
        setZaloNotify((prev) => ({ ...prev, title: "", text: "", image: "" }));
      } else {
        toast.error(d.hint ?? `Gửi thông báo thất bại: ${d.reason ?? "kiểm tra token"}`, { duration: 15000 });
      }
    } catch {
      toast.error("Lỗi kết nối");
    }
    setZaloNotifyStatus("idle");
  }

  async function testZaloBot() {
    // Gửi thử vào nhóm đầu danh sách; ô một-chat cũ vẫn nhận để cấu hình sẵn không mất.
    const chatId =
      splitChatIds(v("integrations.zalo_bot_chat_ids"))[0] ?? v("integrations.zalo_bot_chat_id").trim();
    if (!chatId) {
      toast.error("Chọn nhóm nhận thông báo rồi Lưu trước đã.");
      return;
    }
    setZaloTestStatus("loading");
    try {
      const res = await fetch("/api/admin/zalo/webhook-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", chat_id: chatId }),
      });
      const d = (await res.json().catch(() => ({}))) as {
        ok?: boolean; reason?: string; error_code?: number | null; hint?: string | null;
      };
      setZaloTestStatus(res.ok && d.ok ? "ok" : "err");
      setZaloHookDetail(`GỬI THỬ — HTTP ${res.status}
${JSON.stringify(d, null, 2)}`);
      if (res.ok && d.ok) toast.success("Đã gửi tin thử qua bot Zalo.");
      else {
        toast.error(
          d.hint ?? `Gửi thử thất bại: ${d.reason ?? "kiểm tra token & chat id"}${d.error_code ? ` (mã ${d.error_code})` : ""}`,
          { duration: 20000 },
        );
      }
    } catch {
      setZaloTestStatus("err");
      toast.error("Lỗi kết nối");
    }
    setTimeout(() => setZaloTestStatus("idle"), 5000);
  }

  async function setupWebhook() {
    setWebhookStatus("loading");
    try {
      const res = await fetch("/api/admin/telegram/webhook-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set" }),
      });
      const d = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        webhook_url?: string;
        reason?: string;
        switched_from?: string;
        secret_configured?: boolean;
      };
      setWebhookStatus(res.ok && d.ok ? "ok" : "err");
      if (res.ok && d.ok) {
        toast.success(`Webhook đã được set: ${d.webhook_url}`);
        // Địa chỉ cấu hình bị chuyển hướng — vẫn chạy nhờ tự đổi, nhưng phải sửa
        // NEXT_PUBLIC_SITE_URL, không thì lần sau lại lệch chỗ khác.
        if (d.switched_from) toast.warning(`NEXT_PUBLIC_SITE_URL đang trỏ vào địa chỉ bị chuyển hướng (${d.switched_from}) — sửa lại trên Vercel.`);
        if (d.secret_configured === false) toast.warning("Chưa đặt TELEGRAM_WEBHOOK_SECRET — ai cũng giả được cập nhật gửi tới webhook.");
      } else {
        toast.error(
          d.reason === "bot_token_decrypt_failed"
            ? "Không giải mã được bot token — APP_SECRET trên Vercel khác lúc lưu. Nhập lại token rồi thử lại."
            : `Set webhook thất bại: ${d.reason ?? "kiểm tra bot token"}`,
        );
      }
    } catch {
      setWebhookStatus("err");
      toast.error("Lỗi kết nối");
    }
    setTimeout(() => setWebhookStatus("idle"), 5000);
  }

  async function testTelegramBot(bot: "admin" | "user") {
    setTgTest((p) => ({ ...p, [bot]: "loading" }));
    try {
      const res = await fetch("/api/admin/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot }),
      });
      setTgTest((p) => ({ ...p, [bot]: res.ok ? "ok" : "err" }));
      if (res.ok) toast.success(`Bot ${bot === "admin" ? "Admin" : "User"} hoạt động — kiểm tra Telegram!`);
      else {
        const d = await res.json().catch(() => ({})) as { reason?: string };
        toast.error(`Gửi thất bại: ${d.reason ?? "Kiểm tra token & chat ID"}`);
      }
    } catch {
      setTgTest((p) => ({ ...p, [bot]: "err" }));
      toast.error("Lỗi kết nối");
    }
    setTimeout(() => setTgTest((p) => ({ ...p, [bot]: "idle" })), 4000);
  }

  useEffect(() => { setState(getSettingsFormInitialState(settings)); }, [settings]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      type ProfileRow = { display_name: string | null; role: string };
      const { data: row } = await supabase.from("users").select("display_name, role").eq("id", data.user.id).maybeSingle() as { data: ProfileRow | null; error: unknown };
      const p = { email: data.user.email ?? "", display_name: row?.display_name ?? "", role: row?.role ?? "user" };
      setProfile(p);
      setDisplayName(p.display_name);
    });
  }, []);

  const defaults = siteId === "isc" ? { ...defaultSiteSettingValues, ...defaultIscSettingValues } : defaultSiteSettingValues;
  const v = (key: string) => state[pk(key)] ?? defaults[key] ?? "";

  function scheduleAutoSave() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const keys = [...dirtyRef.current];
      if (keys.length === 0) return;
      dirtyRef.current.clear();
      setAutoSaveStatus("saving");
      try {
        await Promise.all(keys.map(async (k) => {
          if (SENSITIVE_FORM_KEYS.has(k) && !stateRef.current[k]) return;
          await fetch("/api/admin/settings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: k, value: stateRef.current[k] ?? "" }),
          });
        }));
        setAutoSaveStatus("saved");
        void onSaved();
        setTimeout(() => setAutoSaveStatus("idle"), 2500);
      } catch {
        setAutoSaveStatus("idle");
      }
    }, 1500);
  }

  const set = (key: string, value: string) => {
    const fullKey = pk(key);
    setState((p) => ({ ...p, [fullKey]: value }));
    dirtyRef.current.add(fullKey);
    scheduleAutoSave();
  };
  const setSlot = (key: string, i: number, value: string) => {
    const fullKey = pk(key);
    setState((p) => {
      const slots = getSlots(p[fullKey] ?? "");
      slots[i] = value;
      return { ...p, [fullKey]: slots.join("\n") };
    });
    dirtyRef.current.add(fullKey);
    scheduleAutoSave();
  };

  const sensitiveHint = (key: string) =>
    SENSITIVE_FORM_KEYS.has(key) && configuredKeys.has(key) && !v(key)
      ? "đã lưu — để trống để giữ nguyên"
      : null;

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const r = await fetch("/api/admin/profile", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName }),
      });
      if (!r.ok) {
        const body = (await r.json().catch(() => null)) as { error?: string } | null;
        toast.error(body?.error ?? "Lưu thất bại."); return;
      }
      setProfile((p) => p ? { ...p, display_name: displayName } : p);
      toast.success("Đã cập nhật hồ sơ.");
    } catch {
      toast.error("Lỗi mạng, không thể lưu hồ sơ.");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePw = async () => {
    if (newPw.length < 8) { toast.error("Tối thiểu 8 ký tự."); return; }
    if (newPw !== confirmPw) { toast.error("Mật khẩu không khớp."); return; }
    const supabase = createClient();
    if (!supabase) return;
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setSavingPw(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Đổi mật khẩu thành công.");
    setNewPw(""); setConfirmPw("");
  };

  const migrateEncrypt = async () => {
    setMigrating(true);
    try {
      const r = await fetch("/api/admin/settings/migrate-encrypt", { method: "POST" });
      const body = (await r.json().catch(() => null)) as { migrated?: number; total?: number; message?: string; error?: string } | null;
      if (!r.ok) { toast.error(body?.error ?? "Lỗi không xác định."); return; }
      if (body?.migrated === 0) { toast.success(body.message ?? "Không có dữ liệu cần mã hoá."); return; }
      toast.success(`Đã mã hoá ${body?.migrated}/${body?.total} setting thành công.`);
    } catch {
      toast.error("Lỗi mạng.");
    } finally {
      setMigrating(false);
    }
  };

  const roleInfo = profile?.role ? ROLE_LABELS[profile.role] : null;
  const seoTitleLen = v("seo.default_title").length;
  const seoDescLen = v("seo.default_description").length;
  const maintenanceOn = v("site.maintenance_mode") === "true";

  // ── Section renderers ───────────────────────────────────────────────────────

  const sections: Record<SectionId, React.ReactNode> = {

    // ── TÀI KHOẢN ────────────────────────────────────────────────────────────
    account: (
      <div className="space-y-5">
        <Card>
          <div className="py-4">
            <SectionHeader icon={User} title="Thông Tin Cá Nhân" desc="Quản lý hồ sơ của bạn" />
          </div>
          <div className="py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <div className="relative">
                <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 shadow-lg ring-2 ring-primary/20">
                  <ShieldCheck className="size-9 text-primary" />
                </div>
                {roleInfo && (
                  <div className="absolute -bottom-1 -right-1">
                    <span className={cn("inline-flex items-center rounded-full border-2 border-background px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-sm", roleInfo.color)}>
                      {roleInfo.label}
                    </span>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate font-heading text-lg font-bold text-foreground">{profile?.display_name || "Chưa đặt tên"}</p>
                <p className="truncate text-sm text-muted-foreground">{profile?.email || "Đang tải..."}</p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-medium text-green-600 dark:text-green-400">Đang hoạt động</span>
                </div>
              </div>
            </div>
          </div>
          <Field label="Tên hiển thị" hint="Hiển thị trong admin" icon={User}>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Nhập tên hiển thị..." className="flex-1" />
              <Button type="button" size="sm" disabled={savingProfile || displayName === profile?.display_name} onClick={saveProfile} className="shrink-0 rounded-xl gap-1.5 px-4">
                <Save className="size-3.5" />
                {savingProfile ? "Đang lưu..." : "Cập nhật"}
              </Button>
            </div>
            {displayName !== profile?.display_name && displayName.length > 0 && (
              <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <span className="size-1 rounded-full bg-amber-500" /> Có thay đổi chưa lưu
              </p>
            )}
          </Field>
          <Field label="Email" hint="Không thể thay đổi" icon={Mail}>
            <div className="relative">
              <Input value={profile?.email ?? ""} disabled className="cursor-not-allowed bg-muted/50 opacity-60 pr-20" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cố định</span>
            </div>
          </Field>
        </Card>
        <Card>
          <div className="py-4">
            <SectionHeader icon={ShieldCheck} title="Bảo Mật" desc="Đổi mật khẩu đăng nhập" />
          </div>
          <Field label="Mật khẩu mới" hint="Tối thiểu 8 ký tự">
            <PasswordInput value={newPw} onChange={setNewPw} placeholder="Nhập mật khẩu mới..." show={showNew} onToggle={() => setShowNew((p) => !p)} />
          </Field>
          <Field label="Xác nhận" hint="Nhập lại để xác nhận">
            <div className="space-y-2">
              <PasswordInput value={confirmPw} onChange={setConfirmPw} placeholder="Nhập lại mật khẩu..." show={showConfirm} onToggle={() => setShowConfirm((p) => !p)} />
              {confirmPw.length > 0 && (
                <div className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
                  newPw === confirmPw ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-red-500/10 text-red-600 dark:text-red-400",
                )}>
                  <span>{newPw === confirmPw ? "✓" : "✗"}</span>
                  {newPw === confirmPw ? "Mật khẩu khớp" : "Mật khẩu không khớp"}
                </div>
              )}
            </div>
          </Field>
          <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">Mật khẩu mạnh nên có chữ hoa, số và ký tự đặc biệt</p>
            <Button type="button" size="sm" disabled={savingPw || !newPw || !confirmPw || newPw !== confirmPw || newPw.length < 8} onClick={savePw} className="shrink-0 gap-1.5 rounded-xl px-5">
              <ShieldCheck className="size-3.5" />
              {savingPw ? "Đang đổi..." : "Đổi mật khẩu"}
            </Button>
          </div>
        </Card>
      </div>
    ),

    // ── THƯƠNG HIỆU ──────────────────────────────────────────────────────────
    branding: (
      <div className="space-y-5">
        <Card>
          <div className="py-4">
            <SectionHeader icon={Palette} title="Thương Hiệu" desc="Tên và logo hiển thị trên toàn bộ website" />
          </div>
          <Field label="Tên website" hint="Navbar & tab trình duyệt" icon={Globe}>
            <Input value={v("branding.site_name")} onChange={(e) => set("branding.site_name", e.target.value)} placeholder="Arex" />
          </Field>
          <Field label="Favicon" hint="Icon tab · 32×32 ICO/PNG">
            <div className="space-y-2">
              <Input value={v("branding.favicon_url")} onChange={(e) => set("branding.favicon_url", e.target.value)} placeholder="https://..." />
              {v("branding.favicon_url") && (
                <div className="flex items-center gap-3 rounded-xl border bg-muted/30 px-3 py-2">
                  <Image src={v("branding.favicon_url")} alt="" width={20} height={20} className="rounded object-contain" unoptimized />
                  <span className="text-xs text-muted-foreground">Tab preview</span>
                </div>
              )}
            </div>
          </Field>
          <Field label="Logo sáng" hint="Light mode · PNG nền trong">
            <div className="space-y-2">
              <Input value={v("branding.logo_light_url")} onChange={(e) => set("branding.logo_light_url", e.target.value)} placeholder="https://..." />
              {v("branding.logo_light_url") && (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2">
                  <Image src={v("branding.logo_light_url")} alt="" width={36} height={36} className="rounded object-contain" unoptimized />
                  <span className="text-xs text-muted-foreground">Light preview</span>
                </div>
              )}
            </div>
          </Field>
          <Field label="Logo tối" hint="Dark mode · màu sáng">
            <div className="space-y-2">
              <Input value={v("branding.logo_dark_url")} onChange={(e) => set("branding.logo_dark_url", e.target.value)} placeholder="https://..." />
              {v("branding.logo_dark_url") && (
                <div className="flex items-center gap-3 rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2">
                  <Image src={v("branding.logo_dark_url")} alt="" width={36} height={36} className="rounded object-contain" unoptimized />
                  <span className="text-xs text-zinc-400">Dark preview</span>
                </div>
              )}
            </div>
          </Field>
        </Card>
      </div>
    ),

    // ── SEO ──────────────────────────────────────────────────────────────────
    seo: (
      <div className="space-y-5">
        <Card>
          <div className="py-4">
            <SectionHeader icon={Search} title="SEO" desc="Tối ưu xuất hiện trên Google và mạng xã hội" />
          </div>
          <Field label="Tiêu đề" hint={`${seoTitleLen}/60 ký tự`} icon={Sparkles}>
            <div className="space-y-1">
              <Input value={v("seo.default_title")} onChange={(e) => set("seo.default_title", e.target.value)} placeholder="Arex - Trang Tin Tức..." />
              <div className="h-1 rounded-full bg-border overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", seoTitleLen > 60 ? "bg-red-500" : seoTitleLen > 45 ? "bg-yellow-500" : "bg-primary")} style={{ width: `${Math.min(100, (seoTitleLen / 60) * 100)}%` }} />
              </div>
            </div>
          </Field>
          <Field label="Mô tả" hint={`${seoDescLen}/160 ký tự`}>
            <div className="space-y-1">
              <Textarea value={v("seo.default_description")} onChange={(e) => set("seo.default_description", e.target.value)} placeholder="Mô tả ngắn về website..." rows={3} className="resize-none" />
              <div className="h-1 rounded-full bg-border overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", seoDescLen > 160 ? "bg-red-500" : seoDescLen > 130 ? "bg-yellow-500" : "bg-primary")} style={{ width: `${Math.min(100, (seoDescLen / 160) * 100)}%` }} />
              </div>
            </div>
          </Field>
        </Card>

        <div className="rounded-2xl border bg-card p-4">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <Globe className="size-3.5" /> Xem trước Google
          </p>
          <div className="rounded-xl border bg-background p-4 space-y-1 font-sans">
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">{v("seo.default_title") || "Tiêu đề website"}</p>
            <p className="text-xs text-green-700 dark:text-green-500">https://arex.tech</p>
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{v("seo.default_description") || "Mô tả sẽ xuất hiện ở đây..."}</p>
          </div>
        </div>
      </div>
    ),

    // ── TRANG CHỦ ────────────────────────────────────────────────────────────
    home: (
      <div className="space-y-5">
        <Card>
          <div className="py-4">
            <SectionHeader icon={Home} title="Trang Chủ" desc="Hero section và slider ảnh nền" />
          </div>
          <Field label="Tiêu đề Hero" icon={Sparkles}>
            <Input value={v("home.hero.title")} onChange={(e) => set("home.hero.title", e.target.value)} placeholder="Arex" />
          </Field>
          <Field label="Hiệu ứng slider">
            <Select value={v("home.background.transition_effect")} onValueChange={(val) => set("home.background.transition_effect", val ?? "fade")}>
              <SelectTrigger><SelectValue placeholder="Chọn hiệu ứng" /></SelectTrigger>
              <SelectContent>
                {SLIDER_EFFECTS.map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    <span className="font-medium">{e.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{e.desc}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Thời gian chờ" hint="giây · mặc định 5s" icon={Clock}>
            <div className="flex items-center gap-2">
              <Input type="number" min="2" max="30" step="0.5" value={v("home.background.interval_seconds")} onChange={(e) => set("home.background.interval_seconds", e.target.value)} className="max-w-28" />
              <span className="text-xs text-muted-foreground">giây</span>
            </div>
          </Field>
          <Field label="Thời gian chuyển" hint="giây · mặc định 1s" icon={Clock}>
            <div className="flex items-center gap-2">
              <Input type="number" min="0.4" max="5" step="0.1" value={v("home.background.transition_seconds")} onChange={(e) => set("home.background.transition_seconds", e.target.value)} className="max-w-28" />
              <span className="text-xs text-muted-foreground">giây</span>
            </div>
          </Field>
        </Card>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
          <p className="text-xs font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
            <ImageIcon className="size-4 text-primary" /> Ảnh nền Slider
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Desktop <span className="text-[10px]">(16:9 · 1920×1080)</span></p>
              {getSlots(v("home.background.desktop_urls")).map((slot, i) => (
                <div key={`d${i}`} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{i + 1}</span>
                    <Input value={slot} onChange={(e) => setSlot("home.background.desktop_urls", i, e.target.value)} placeholder={`Ảnh ${i + 1}…`} className="text-xs" />
                  </div>
                  {slot && (
                    <div className="relative ml-7 aspect-video w-full overflow-hidden rounded-lg border">
                      <Image src={slot} alt="" fill className="object-cover" unoptimized />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mobile <span className="text-[10px]">(9:16 · 720×1280)</span></p>
              {getSlots(v("home.background.mobile_urls")).map((slot, i) => (
                <div key={`m${i}`} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{i + 1}</span>
                    <Input value={slot} onChange={(e) => setSlot("home.background.mobile_urls", i, e.target.value)} placeholder={`Ảnh ${i + 1}…`} className="text-xs" />
                  </div>
                  {slot && (
                    <div className="relative ml-7 aspect-[9/16] w-16 overflow-hidden rounded-lg border">
                      <Image src={slot} alt="" fill className="object-cover" unoptimized />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Background phía sau khối Sự kiện */}
          <div className="mt-6 border-t border-border pt-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Background khối &quot;Sự kiện&quot; (Việt Nam, ví dụ event đang chạy…)
            </p>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">URL ảnh nền</label>
              <Input
                value={v("home.events_bg.image_url")}
                onChange={(e) => set("home.events_bg.image_url", e.target.value)}
                placeholder="https://... (jpg/png/webp)"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">URL video nền (mp4) — tuỳ chọn, ưu tiên hơn ảnh</label>
              <Input
                value={v("home.events_bg.video_url")}
                onChange={(e) => set("home.events_bg.video_url", e.target.value)}
                placeholder="https://....mp4"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Caption ngắn (tuỳ chọn)</label>
              <Input
                value={v("home.events_bg.caption")}
                onChange={(e) => set("home.events_bg.caption", e.target.value)}
                placeholder="VD: SỰ KIỆN HOT TUẦN NÀY"
                maxLength={80}
              />
            </div>
          </div>
        </div>
      </div>
    ),

    // ── SỰ KIỆN: SERVER ─────────────────────────────────────────────────────
    event_servers: (
      <div className="space-y-5">
        <Card>
          <div className="py-4">
            <SectionHeader icon={Globe} title="Server sự kiện tuỳ chỉnh" desc="Thêm server riêng (vd. CN, JP, KR…) ngoài 11 preset có sẵn" />
          </div>
          <Field
            label="Custom servers (JSON)"
            hint='[{"key":"cn","label":"Trung Quốc","short":"CN","flag":"🇨🇳","colorKey":"red"}] — colorKey: red, orange, amber, yellow, emerald, teal, cyan, blue, violet, pink, rose'
            icon={Globe}
          >
            <Textarea
              value={v("events.custom_servers")}
              onChange={(e) => set("events.custom_servers", e.target.value)}
              placeholder='[{"key":"cn","label":"Trung Quốc","short":"CN","flag":"🇨🇳","colorKey":"red"}]'
              rows={6}
              className="resize-none font-mono text-xs"
            />
          </Field>
          <Field
            label="Ẩn server preset"
            hint="Liệt kê key cách nhau bởi dấu phẩy (vd: latam,mena,tw) để ẩn các server không dùng"
            icon={Globe}
          >
            <Input
              value={v("events.hidden_servers")}
              onChange={(e) => set("events.hidden_servers", e.target.value)}
              placeholder="latam,mena,tw"
              className="font-mono text-xs"
            />
          </Field>
          <Field
            label="Logo cho server (JSON)"
            hint='Ghi đè cờ emoji bằng URL ảnh — { "vn": "https://...", "global": "https://...", "cn": "https://..." }'
            icon={Globe}
          >
            <Textarea
              value={v("events.server_logos")}
              onChange={(e) => set("events.server_logos", e.target.value)}
              placeholder='{"vn":"https://cdn.example.com/vn.png","global":"https://cdn.example.com/global.png"}'
              rows={4}
              className="resize-none font-mono text-xs"
            />
          </Field>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Preset có sẵn (bấm key để copy nhanh)
            </p>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              {[
                ["vn","🇻🇳 Việt Nam"],["global","🌐 Global"],["sea","🌏 SEA"],
                ["br","🇧🇷 Brazil"],["in","🇮🇳 Ấn Độ"],["id","🇮🇩 Indonesia"],
                ["th","🇹🇭 Thái Lan"],["ph","🇵🇭 Philippines"],["tw","🇹🇼 Đài Loan"],
                ["mena","🌍 Trung Đông"],["latam","🌎 Mỹ Latin"],
              ].map(([k, l]) => (
                <span key={k} className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5">
                  <code className="font-mono font-bold text-primary">{k}</code> · {l}
                </span>
              ))}
            </div>
          </div>
        </Card>
      </div>
    ),

    // ── MẠNG XÃ HỘI ─────────────────────────────────────────────────────────
    social: (
      <div className="space-y-5">
        <Card>
          <div className="py-4">
            <SectionHeader icon={Share2} title="Mạng Xã Hội" desc="Liên kết đồng bộ footer và trang liên hệ" />
          </div>
          <Field label="Facebook" icon={Facebook}>
            <Input value={v("social.facebook_url")} onChange={(e) => set("social.facebook_url", e.target.value)} placeholder="https://facebook.com/..." />
          </Field>
          <Field label="TikTok">
            <div className="flex items-center gap-2">
              <svg className="size-3.5 shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.74a4.85 4.85 0 0 1-1.01-.05z" /></svg>
              <Input value={v("social.tiktok_url")} onChange={(e) => set("social.tiktok_url", e.target.value)} placeholder="https://tiktok.com/@..." />
            </div>
          </Field>
          <Field label="YouTube" icon={Youtube}>
            <Input value={v("social.youtube_url")} onChange={(e) => set("social.youtube_url", e.target.value)} placeholder="https://youtube.com/@..." />
          </Field>
          <Field label="Email liên hệ" icon={Mail}>
            <Input type="email" value={v("social.email")} onChange={(e) => set("social.email", e.target.value)} placeholder="admin@arex.tech" />
          </Field>
          <Field label="Số điện thoại" icon={Phone}>
            <Input value={v("social.phone")} onChange={(e) => set("social.phone", e.target.value)} placeholder="0900 000 000" />
          </Field>
          <Field label="Zalo (link nhóm/OA)" icon={MessageSquare}>
            <Input value={v("social.zalo_url")} onChange={(e) => set("social.zalo_url", e.target.value)} placeholder="https://zalo.me/g/..." />
          </Field>
          <Field label="Telegram" icon={Send}>
            <Input value={v("social.telegram_url")} onChange={(e) => set("social.telegram_url", e.target.value)} placeholder="https://t.me/..." />
          </Field>
          <Field label="Discord" icon={MessageSquare}>
            <Input value={v("social.discord_url")} onChange={(e) => set("social.discord_url", e.target.value)} placeholder="https://discord.gg/..." />
          </Field>
        </Card>
      </div>
    ),

    // ── CỘNG ĐỒNG ────────────────────────────────────────────────────────────
    community: (() => {
      const launchDate = v("community.launch_date");
      const daysActive = launchDate
        ? Math.max(0, Math.floor((Date.now() - new Date(launchDate).getTime()) / 86_400_000))
        : null;

      const platforms = [
        { key: "community.facebook_members",    label: "Facebook",    icon: Facebook,  hint: "VD: 12.500 hoặc 12.5K",  statLabel: "Thành viên" },
        { key: "community.youtube_subscribers", label: "YouTube",     icon: Youtube,   hint: "VD: 8.000 hoặc 8K",      statLabel: "Subscribers" },
        { key: "community.tiktok_followers",    label: "TikTok",      icon: BarChart3, hint: "VD: 5.000 hoặc 5K",      statLabel: "Followers" },
        { key: "community.zalo_members",        label: "Zalo Group",  icon: Users,     hint: "VD: 3.200 hoặc 3.2K",    statLabel: "Thành viên" },
      ];

      return (
        <div className="space-y-5">
          {/* Days active preview */}
          {daysActive !== null && (
            <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Calendar className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  Website đã hoạt động được <span className="text-primary">{daysActive.toLocaleString("vi-VN")} ngày</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Kể từ {new Date(launchDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                </p>
              </div>
            </div>
          )}

          <Card>
            <div className="py-4">
              <SectionHeader icon={Calendar} title="Ngày Ra Mắt" desc="Dùng để tính số ngày website đã hoạt động" />
            </div>
            <Field label="Ngày ra mắt" hint="Hiển thị đếm ngày hoạt động ở trang chủ" icon={Calendar}>
              <div className="space-y-2">
                <Input
                  type="date"
                  value={v("community.launch_date")}
                  onChange={(e) => set("community.launch_date", e.target.value)}
                />
                {v("community.launch_date") && (
                  <p className="text-xs text-muted-foreground">
                    Sẽ hiển thị <span className="font-semibold text-foreground">&quot;{daysActive?.toLocaleString("vi-VN")} ngày hoạt động&quot;</span> ở khu vực Tham gia cộng đồng.
                  </p>
                )}
              </div>
            </Field>
          </Card>

          <Card>
            <div className="py-4">
              <SectionHeader icon={Users} title="Thống Kê Cộng Đồng" desc="Số liệu hiển thị trong khu vực Tham gia cộng đồng trang chủ" />
            </div>
            {platforms.map(({ key, label, icon: Icon, hint, statLabel }) => (
              <Field key={key} label={label} hint={hint} icon={Icon}>
                <div className="flex items-center gap-2">
                  <Input
                    value={v(key)}
                    onChange={(e) => set(key, e.target.value)}
                    placeholder={`Nhập số ${statLabel.toLowerCase()}...`}
                    className="max-w-48"
                  />
                  {v(key) && (
                    <span className="rounded-full border bg-muted px-3 py-1 text-xs font-bold tabular-nums text-foreground">
                      {v(key)} {statLabel}
                    </span>
                  )}
                </div>
              </Field>
            ))}
          </Card>

          {/* Preview card */}
          <div className="rounded-2xl border bg-card p-4">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <Globe className="size-3.5" /> Xem trước trang chủ
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "Facebook", stat: v("community.facebook_members"), color: "bg-[#1877F2]/10 text-[#1877F2]" },
                { label: "YouTube",  stat: v("community.youtube_subscribers"), color: "bg-red-500/10 text-red-500" },
                { label: "TikTok",   stat: v("community.tiktok_followers"), color: "bg-foreground/10 text-foreground" },
                { label: "Zalo",     stat: v("community.zalo_members"), color: "bg-[#0068FF]/10 text-[#0068FF]" },
              ].map(({ label, stat, color }) => (
                <div key={label} className={cn("flex flex-col items-center gap-1 rounded-xl border p-3 text-center", stat ? "border-border" : "border-dashed opacity-40")}>
                  <p className={cn("text-lg font-extrabold tabular-nums", color)}>{stat || "—"}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      );
    })(),

    // ── QUẢNG CÁO ────────────────────────────────────────────────────────────
    ads: (
      <div className="space-y-5">
        <Card>
          <div className="py-4">
            <SectionHeader icon={BarChart3} title="Google AdSense" desc="Cấu hình quảng cáo Google trên website" />
          </div>
          <div className="space-y-2 py-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Hiển thị theo thiết bị</p>
            <label className="flex items-start justify-between gap-4 rounded-xl border border-border bg-muted/30 p-3">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">Hiện quảng cáo trên điện thoại</p>
                <p className="text-xs text-muted-foreground">
                  Tắt để màn hình dưới 768px sạch hoàn toàn. Ô quảng cáo không được tải chứ không phải bị giấu bằng CSS,
                  nên không tính lượt hiển thị.
                </p>
              </div>
              <input
                type="checkbox"
                checked={v("ads.show_on_mobile") !== "false"}
                onChange={(e) => set("ads.show_on_mobile", e.target.checked ? "true" : "false")}
                className="mt-1 size-4 cursor-pointer accent-primary"
              />
            </label>
            <label className="flex items-start justify-between gap-4 rounded-xl border border-border bg-muted/30 p-3">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">Hiện quảng cáo trên máy tính</p>
                <p className="text-xs text-muted-foreground">
                  Bao gồm cả hai cột quảng cáo hai bên ở trang chủ.
                </p>
              </div>
              <input
                type="checkbox"
                checked={v("ads.show_on_desktop") !== "false"}
                onChange={(e) => set("ads.show_on_desktop", e.target.checked ? "true" : "false")}
                className="mt-1 size-4 cursor-pointer accent-primary"
              />
            </label>
            {v("ads.show_on_mobile") === "false" && v("ads.show_on_desktop") === "false" && (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-400">
                Đang tắt ở cả hai thiết bị — không quảng cáo nào chạy, doanh thu AdSense về 0.
              </p>
            )}
          </div>
          <Field label="Publisher ID" hint="ca-pub-XXXXXXXXXX" icon={BarChart3}>
            <div className="space-y-2">
              <Input value={v("ads.google_adsense_id")} onChange={(e) => set("ads.google_adsense_id", e.target.value)} placeholder="ca-pub-0000000000000000" className="font-mono" />
              <SensitiveHint hint={sensitiveHint("ads.google_adsense_id")} />
              {v("ads.google_adsense_id") && (
                <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5" /> Script AdSense sẽ được inject tự động vào toàn bộ trang.
                </p>
              )}
            </div>
          </Field>
          <Field label="Slot Header" hint="Banner đầu trang (970×90)" icon={MonitorPlay}>
            <Input value={v("ads.slot_header")} onChange={(e) => set("ads.slot_header", e.target.value)} placeholder="1234567890" className="font-mono" />
            <SensitiveHint hint={sensitiveHint("ads.slot_header")} />
          </Field>
          <Field label="Slot Sidebar" hint="Banner cột bên (300×250)" icon={LayoutGrid}>
            <Input value={v("ads.slot_sidebar")} onChange={(e) => set("ads.slot_sidebar", e.target.value)} placeholder="1234567890" className="font-mono" />
            <SensitiveHint hint={sensitiveHint("ads.slot_sidebar")} />
          </Field>
          <Field label="Slot In-Article" hint="Trong bài tin tức /news/[slug]" icon={Newspaper}>
            <Input value={v("ads.slot_article")} onChange={(e) => set("ads.slot_article", e.target.value)} placeholder="1234567890" className="font-mono" />
            <SensitiveHint hint={sensitiveHint("ads.slot_article")} />
          </Field>

          <div className="py-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Vị trí riêng — Tin tức &amp; Wiki</p>
          </div>
          <Field label="Slot Tin tức — Banner đầu" hint="Đầu trang danh sách /news" icon={Newspaper}>
            <Input value={v("ads.slot_news_top")} onChange={(e) => set("ads.slot_news_top", e.target.value)} placeholder="1234567890" className="font-mono" />
            <SensitiveHint hint={sensitiveHint("ads.slot_news_top")} />
          </Field>
          <Field label="Slot Tin tức — Trong danh sách" hint="Cuối danh sách bài /news" icon={Newspaper}>
            <Input value={v("ads.slot_news_inline")} onChange={(e) => set("ads.slot_news_inline", e.target.value)} placeholder="1234567890" className="font-mono" />
            <SensitiveHint hint={sensitiveHint("ads.slot_news_inline")} />
          </Field>
          <Field label="Slot Wiki — Banner đầu" hint="Đầu trang danh sách /wiki" icon={LayoutGrid}>
            <Input value={v("ads.slot_wiki_top")} onChange={(e) => set("ads.slot_wiki_top", e.target.value)} placeholder="1234567890" className="font-mono" />
            <SensitiveHint hint={sensitiveHint("ads.slot_wiki_top")} />
          </Field>
          <Field label="Slot Wiki — Trong bài" hint="Cuối bài wiki /wiki/[slug]" icon={LayoutGrid}>
            <Input value={v("ads.slot_wiki_article")} onChange={(e) => set("ads.slot_wiki_article", e.target.value)} placeholder="1234567890" className="font-mono" />
            <SensitiveHint hint={sensitiveHint("ads.slot_wiki_article")} />
          </Field>

          <div className="py-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Trạng thái vị trí quảng cáo</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Header Banner", icon: MonitorPlay, size: "970×90",    key: "ads.slot_header" },
                { label: "Sidebar Box",   icon: LayoutGrid,  size: "300×250",   key: "ads.slot_sidebar" },
                { label: "Tin — In-Article", icon: Newspaper, size: "Responsive", key: "ads.slot_article" },
                { label: "Tin — Banner đầu", icon: Newspaper, size: "Responsive", key: "ads.slot_news_top" },
                { label: "Tin — Trong list", icon: Newspaper, size: "Responsive", key: "ads.slot_news_inline" },
                { label: "Wiki — Banner đầu", icon: LayoutGrid, size: "Responsive", key: "ads.slot_wiki_top" },
                { label: "Wiki — Trong bài",  icon: LayoutGrid, size: "Responsive", key: "ads.slot_wiki_article" },
              ].map(({ label, icon: Icon, size, key }) => {
                const slot = v(key);
                return (
                  <div key={label} className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all",
                    slot ? "border-primary/30 bg-primary/5" : "border-dashed border-border bg-muted/20 opacity-50",
                  )}>
                    <Icon className="size-5 text-muted-foreground" />
                    <p className="text-xs font-semibold">{label}</p>
                    <p className="text-[10px] text-muted-foreground">{size}</p>
                    {slot
                      ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-mono font-bold text-primary">#{slot}</span>
                      : <span className="text-[10px] text-muted-foreground">Chưa cấu hình</span>
                    }
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <Card>
          <div className="py-4">
            <SectionHeader icon={LayoutGrid} title="Banner trang chủ (2 bên hero)" desc="Ảnh + link, hiển thị ở mép trái/phải khi màn hình ≥ 1280px" />
          </div>
          <Field label="Ảnh banner trái" hint="URL ảnh, tỉ lệ dọc 3:5 đẹp nhất" icon={LayoutGrid}>
            <Input value={v("home.ads.left.image_url")} onChange={(e) => set("home.ads.left.image_url", e.target.value)} placeholder="https://..." />
          </Field>
          <Field label="Link banner trái" hint="URL khi bấm vào ảnh" icon={LayoutGrid}>
            <Input value={v("home.ads.left.link_url")} onChange={(e) => set("home.ads.left.link_url", e.target.value)} placeholder="https://..." />
          </Field>
          <Field label="Ảnh banner phải" hint="URL ảnh, tỉ lệ dọc 3:5 đẹp nhất" icon={LayoutGrid}>
            <Input value={v("home.ads.right.image_url")} onChange={(e) => set("home.ads.right.image_url", e.target.value)} placeholder="https://..." />
          </Field>
          <Field label="Link banner phải" hint="URL khi bấm vào ảnh" icon={LayoutGrid}>
            <Input value={v("home.ads.right.link_url")} onChange={(e) => set("home.ads.right.link_url", e.target.value)} placeholder="https://..." />
          </Field>
        </Card>
      </div>
    ),

    // ── TEAM JOIN ────────────────────────────────────────────────────────────
    team_join: (
      <div className="space-y-5">
        <Card>
          <div className="py-4">
            <SectionHeader icon={Users} title="Form mời gia nhập team" desc="Tuỳ chỉnh nội dung trang /team-join/[token]" />
          </div>

          <label className="flex items-start justify-between gap-4 rounded-xl border border-border bg-muted/30 p-3">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold">Mở nhận đơn tuyển dụng</p>
              <p className="text-xs text-muted-foreground">
                Tắt để tạm dừng tuyển dụng: mọi link mời sẽ hiện thông báo tạm đóng và không nộp được đơn.
              </p>
            </div>
            <input
              type="checkbox"
              checked={v("team_join.enabled") !== "false"}
              onChange={(e) => set("team_join.enabled", e.target.checked ? "true" : "false")}
              className="mt-1 size-4 cursor-pointer accent-primary"
            />
          </label>
          <Field label="Thông báo khi tạm đóng" hint="Hiển thị khi tắt nhận đơn ở trên" icon={Users}>
            <Textarea
              value={v("team_join.closed_message")}
              onChange={(e) => set("team_join.closed_message", e.target.value)}
              placeholder="Hiện tại team Arex đang tạm dừng nhận đơn tuyển dụng..."
              rows={3}
              maxLength={500}
              className="resize-none"
            />
          </Field>

          <Field label="Tiêu đề trang" hint="Hiện ở header form" icon={Users}>
            <Input value={v("team_join.title")} onChange={(e) => set("team_join.title", e.target.value)} placeholder="Tham gia team Arex" maxLength={120} />
          </Field>
          <Field label="Mô tả ngắn" hint="Hiện dưới tiêu đề" icon={Users}>
            <Textarea
              value={v("team_join.subtitle")}
              onChange={(e) => set("team_join.subtitle", e.target.value)}
              placeholder="Điền thông tin bên dưới..."
              rows={2}
              maxLength={300}
              className="resize-none"
            />
          </Field>
          <Field label="Thông báo sau khi gửi" hint="Lời cảm ơn hiển thị sau khi nộp form" icon={Users}>
            <Textarea
              value={v("team_join.success_message")}
              onChange={(e) => set("team_join.success_message", e.target.value)}
              placeholder="Cảm ơn bạn..."
              rows={3}
              maxLength={500}
              className="resize-none"
            />
          </Field>
          <Field label="Điều khoản team (hiển thị trên form)" hint="Cam kết, quy tắc cộng đồng…" icon={Users}>
            <Textarea
              value={v("team_join.terms_text")}
              onChange={(e) => set("team_join.terms_text", e.target.value)}
              placeholder="Tôn trọng cộng đồng, không phát ngôn thù ghét..."
              rows={5}
              maxLength={2000}
              className="resize-none text-sm"
            />
          </Field>
          <Field label="Hậu quả nếu vi phạm" hint="Mức xử lý cảnh cáo / tước quyền / ban / công khai" icon={Users}>
            <Textarea
              value={v("team_join.violation_text")}
              onChange={(e) => set("team_join.violation_text", e.target.value)}
              placeholder="Vi phạm lần 1 cảnh cáo, lần 2 tước quyền..."
              rows={4}
              maxLength={1500}
              className="resize-none text-sm"
            />
          </Field>
          <Field label="Danh sách vị trí ứng tuyển" hint="Mỗi dòng một vị trí. Để trống để dùng mặc định." icon={Users}>
            <Textarea
              value={v("team_join.role_options")}
              onChange={(e) => set("team_join.role_options", e.target.value)}
              placeholder={"Caster\nEditor video\nDesigner\n..."}
              rows={6}
              className="font-mono text-xs"
            />
          </Field>
          <Field label="Giới hạn ký tự phần Giới thiệu" hint="50 – 2000" icon={Users}>
            <Input
              type="number"
              min={50}
              max={2000}
              step={50}
              value={v("team_join.note_max_length") || "500"}
              onChange={(e) => set("team_join.note_max_length", e.target.value)}
              className="max-w-32"
            />
          </Field>

          <div className="border-t border-border mt-3 pt-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tuỳ chọn hiển thị</p>

            <label className="flex items-start justify-between gap-4 rounded-xl border border-border bg-muted/30 p-3">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">Bắt buộc số điện thoại</p>
                <p className="text-xs text-muted-foreground">Nếu bật, người ứng tuyển phải nhập SĐT mới gửi được.</p>
              </div>
              <input
                type="checkbox"
                checked={v("team_join.require_phone") === "true"}
                onChange={(e) => set("team_join.require_phone", e.target.checked ? "true" : "false")}
                className="mt-1 size-4 cursor-pointer accent-primary"
              />
            </label>

            <label className="flex items-start justify-between gap-4 rounded-xl border border-border bg-muted/30 p-3">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">Hiển thị mục Mạng xã hội</p>
                <p className="text-xs text-muted-foreground">FB, IG, TikTok, Discord, Zalo. Tắt nếu không cần thu thập.</p>
              </div>
              <input
                type="checkbox"
                checked={v("team_join.show_socials") !== "false"}
                onChange={(e) => set("team_join.show_socials", e.target.checked ? "true" : "false")}
                className="mt-1 size-4 cursor-pointer accent-primary"
              />
            </label>
          </div>
        </Card>
      </div>
    ),

    // ── TÍCH HỢP ─────────────────────────────────────────────────────────────
    integrations: (
      <div className="space-y-5">
        <Card>
          <div className="py-4">
            <SectionHeader icon={SendHorizonal} title="Bot Zalo" desc="Bot đăng ký tại bot.zapps.me — trả lời lệnh, điểm danh, gửi thông báo vào chat/nhóm Zalo." />
          </div>
          <Field label="Zalo Bot Token" hint="Lấy ở bot.zapps.me sau khi tạo bot. Dạng 1234567890:abcdef...">
            <Input
              value={v("integrations.zalo_bot_token")}
              onChange={(e) => set("integrations.zalo_bot_token", e.target.value)}
              placeholder="1234567890:xxxxxxxx"
              className="font-mono text-xs"
            />
            <SensitiveHint hint={sensitiveHint("integrations.zalo_bot_token")} />
          </Field>
          <Field
            label="Nhóm nhận thông báo"
            icon={Users}
            hint="Mỗi dòng một chat/nhóm. Bấm Lấy Chat ID ở dưới rồi chọn cho nhanh. Bỏ trống thì tin tự đăng bắn cho MỌI chat đã nhắn bot."
          >
            <div className="space-y-2">
              <Textarea
                value={v("integrations.zalo_bot_chat_ids")}
                onChange={(e) => set("integrations.zalo_bot_chat_ids", e.target.value)}
                rows={3}
                placeholder={"6ede9afa66b88fe6d6a9\n8f21c7b3a4e5d6..."}
                className="resize-y font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                {splitChatIds(v("integrations.zalo_bot_chat_ids")).length
                  ? `Đang chọn ${splitChatIds(v("integrations.zalo_bot_chat_ids")).length} nhóm`
                  : "Chưa chọn nhóm nào — sẽ gửi cho mọi chat đã nhắn bot"}
              </p>
            </div>
          </Field>
          <Field label="Link mở bot" hint="Hiện nút “Mở bot Arex trên Zalo” ở trang /zalo-link. Bỏ trống thì ẩn nút.">
            <Input
              value={v("integrations.zalo_bot_link")}
              onChange={(e) => set("integrations.zalo_bot_link", e.target.value)}
              placeholder="https://zalo.me/..."
            />
          </Field>
          <Field label="Webhook bot" hint="Đăng ký để bot nhận lệnh: diemdanh, hoso, bxh, tintuc, sukien… tại /api/zalo/bot" icon={Plug}>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={setupZaloWebhook}
                disabled={zaloHookStatus === "loading"}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-50"
              >
                {zaloHookStatus === "loading" ? <Loader2 className="size-3.5 animate-spin" /> : <SendHorizonal className="size-3.5" />}
                {zaloHookStatus === "loading" ? "Đang set…" : zaloHookStatus === "ok" ? "✅ Đã set!" : zaloHookStatus === "err" ? "❌ Thất bại" : "Set Webhook"}
              </button>
              <button
                type="button"
                onClick={testZaloBot}
                disabled={zaloTestStatus === "loading"}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs font-semibold transition hover:bg-muted disabled:opacity-50"
              >
                {zaloTestStatus === "loading" ? <Loader2 className="size-3.5 animate-spin" /> : <BellRing className="size-3.5" />}
                {zaloTestStatus === "loading" ? "Đang gửi…" : zaloTestStatus === "ok" ? "✅ Đã gửi!" : zaloTestStatus === "err" ? "❌ Lỗi" : "Gửi thử"}
              </button>
              <button
                type="button"
                onClick={loadZaloChats}
                disabled={zaloChatsStatus === "loading"}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs font-semibold transition hover:bg-muted disabled:opacity-50"
              >
                {zaloChatsStatus === "loading" ? <Loader2 className="size-3.5 animate-spin" /> : <Plug className="size-3.5" />}
                {zaloChatsStatus === "loading" ? "Đang tìm…" : "Lấy Chat ID"}
              </button>
              <span className="text-[11px] text-muted-foreground">Nhập token &amp; bấm Lưu trước khi set webhook</span>
            </div>
            {zaloChats?.length ? (
              <div className="mt-3 space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Bấm để thêm / bỏ khỏi danh sách nhận thông báo
                </p>
                {zaloChats.map((c) => {
                  const picked = splitChatIds(v("integrations.zalo_bot_chat_ids"));
                  const isPicked = picked.includes(c.chat_id);
                  return (
                    <button
                      key={c.chat_id}
                      type="button"
                      onClick={() => {
                        const next = isPicked
                          ? picked.filter((id) => id !== c.chat_id)
                          : [...picked, c.chat_id];
                        set("integrations.zalo_bot_chat_ids", next.join("\n"));
                        toast.success(
                          isPicked
                            ? `Đã bỏ ${c.name || c.chat_id} khỏi danh sách — bấm Lưu để giữ lại.`
                            : `Đã thêm ${c.name || c.chat_id} — bấm Lưu để giữ lại.`,
                        );
                      }}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition",
                        isPicked ? "border-primary/50 bg-primary/5" : "border-border/60 hover:bg-muted/60",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                          c.type === "GROUP" ? "bg-blue-500/15 text-blue-600 dark:text-blue-400" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {c.type === "GROUP" ? <Users className="size-3.5" /> : <User className="size-3.5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold">{c.name || "(không tên)"}</span>
                        <span className="block truncate font-mono text-[10px] text-muted-foreground">{c.chat_id}</span>
                        {c.last_text ? (
                          <span className="block truncate text-[10px] italic text-muted-foreground">“{c.last_text}”</span>
                        ) : null}
                      </span>
                      {isPicked ? <CheckCircle2 className="size-4 shrink-0 text-primary" /> : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
            {zaloHookDetail ? (
              <div className="mt-3 overflow-hidden rounded-xl border border-border/60">
                <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-3 py-1.5">
                  <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <FileText className="size-3" /> Phản hồi từ Zalo
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(zaloHookDetail);
                      toast.success("Đã chép — dán vào chỗ cần hỏi là được.");
                    }}
                    className="text-[10px] font-semibold text-primary hover:underline"
                  >
                    Chép
                  </button>
                </div>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all bg-muted/20 p-3 text-[11px] leading-relaxed text-muted-foreground">
                  {zaloHookDetail}
                </pre>
              </div>
            ) : null}
          </Field>
          <Field label="Tự đăng" hint="Có tin/sự kiện mới thì bot tự bắn vào mọi chat đã nhắn bot." icon={Zap}>
            <div className="space-y-2">
              {[
                { key: "integrations.zalo_auto_news", label: "Bài viết mới", icon: Newspaper },
                { key: "integrations.zalo_auto_events", label: "Sự kiện mới", icon: Calendar },
              ].map((row) => {
                const on = v(row.key) !== "false" && v(row.key) !== "0";
                return (
                  <label
                    key={row.key}
                    className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border/60 px-3 py-2 transition hover:bg-muted/40"
                  >
                    <row.icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 text-xs font-semibold">{row.label}</span>
                    <span className={cn("text-[11px]", on ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                      {on ? "Đang bật" : "Đang tắt"}
                    </span>
                    <Toggle checked={on} onChange={(next) => set(row.key, next ? "true" : "false")} label={row.label} />
                  </label>
                );
              })}
            </div>
          </Field>
          <Field label="Thông báo nhanh" hint="Gõ nội dung rồi bấm Gửi — không cần tạo bài, không cần Lưu cài đặt." icon={BellRing}>
            <div className="space-y-2.5">
              <Input
                value={zaloNotify.title}
                onChange={(e) => setZaloNotify((p) => ({ ...p, title: e.target.value }))}
                placeholder="Tiêu đề (bỏ trống cũng được)"
              />
              <div className="relative">
                <Textarea
                  value={zaloNotify.text}
                  onChange={(e) => setZaloNotify((p) => ({ ...p, text: e.target.value }))}
                  rows={4}
                  maxLength={1800}
                  placeholder="Nội dung thông báo…"
                  className="resize-y pb-6"
                />
                <span
                  className={cn(
                    "pointer-events-none absolute bottom-2 right-3 text-[10px] tabular-nums",
                    zaloNotify.text.length > 1700 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
                  )}
                >
                  {zaloNotify.text.length}/1800
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={zaloNotify.image}
                  onChange={(e) => setZaloNotify((p) => ({ ...p, image: e.target.value }))}
                  placeholder="Link ảnh kèm theo (tuỳ chọn)"
                />
                <ImageUploadButton onUploaded={(url) => setZaloNotify((p) => ({ ...p, image: url }))} />
              </div>
              {zaloNotify.image ? (
                <div className="overflow-hidden rounded-xl border border-border/60">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={zaloNotify.image} alt="Ảnh kèm thông báo" className="max-h-40 w-full object-cover" />
                </div>
              ) : null}
              <ChatPreview
                text={zaloNotify.title ? `🔔 ${zaloNotify.title}

${zaloNotify.text}` : zaloNotify.text}
                empty="Gõ nội dung để xem trước tin nhắn"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={zaloNotify.target}
                  onValueChange={(val) => setZaloNotify((p) => ({ ...p, target: val as "configured" | "all" }))}
                >
                  <SelectTrigger className="max-w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="configured">Nhóm đã chọn</SelectItem>
                    <SelectItem value="all">Tất cả chat đã nhắn bot</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" onClick={sendZaloNotify} disabled={zaloNotifyStatus === "loading" || !zaloNotify.text.trim()} size="sm">
                  {zaloNotifyStatus === "loading" ? <Loader2 className="size-3.5 animate-spin" /> : <BellRing className="size-3.5" />}
                  {zaloNotifyStatus === "loading" ? "Đang gửi…" : "Gửi ngay"}
                </Button>
              </div>
            </div>
          </Field>
        </Card>

        <Card>
          <div className="py-4">
            <SectionHeader
              icon={Users}
              title="Chào & tiễn thành viên nhóm"
              desc="Dùng chung cho cả nhóm Zalo lẫn Telegram — sửa một chỗ, hai bên nói giống nhau."
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[
                { token: "{name}", desc: "tên người" },
                { token: "{group}", desc: "tên nhóm" },
                { token: "{site}", desc: "địa chỉ site" },
              ].map((t) => (
                <span
                  key={t.token}
                  className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground"
                >
                  <code className="font-mono font-semibold text-foreground">{t.token}</code>
                  {t.desc}
                </span>
              ))}
            </div>
          </div>
          <Field label="Chào người mới vào nhóm" icon={Users} hint="Bỏ trống thì dùng câu mặc định.">
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-2">
                <Toggle
                  checked={v("integrations.group_welcome_enabled") !== "0"}
                  onChange={(on) => set("integrations.group_welcome_enabled", on ? "1" : "0")}
                  label="Bật lời chào"
                />
                <span className="text-xs text-muted-foreground">
                  {v("integrations.group_welcome_enabled") !== "0" ? "Đang bật" : "Đang tắt"}
                </span>
              </label>
              {v("integrations.group_welcome_enabled") !== "0" ? (
                <>
                  <Textarea
                    value={v("integrations.group_welcome_text")}
                    onChange={(e) => set("integrations.group_welcome_text", e.target.value)}
                    rows={4}
                    placeholder={DEFAULT_WELCOME_PREVIEW}
                    className="resize-y"
                  />
                  <ChatPreview text={previewGreeting(v("integrations.group_welcome_text") || DEFAULT_WELCOME_PREVIEW)} />
                </>
              ) : null}
            </div>
          </Field>
          <Field label="Tiễn người rời nhóm" icon={Users} hint="Bỏ trống thì dùng câu mặc định.">
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-2">
                <Toggle
                  checked={v("integrations.group_farewell_enabled") !== "0"}
                  onChange={(on) => set("integrations.group_farewell_enabled", on ? "1" : "0")}
                  label="Bật lời tiễn"
                />
                <span className="text-xs text-muted-foreground">
                  {v("integrations.group_farewell_enabled") !== "0" ? "Đang bật" : "Đang tắt"}
                </span>
              </label>
              {v("integrations.group_farewell_enabled") !== "0" ? (
                <>
                  <Textarea
                    value={v("integrations.group_farewell_text")}
                    onChange={(e) => set("integrations.group_farewell_text", e.target.value)}
                    rows={3}
                    placeholder={DEFAULT_FAREWELL_PREVIEW}
                    className="resize-y"
                  />
                  <ChatPreview text={previewGreeting(v("integrations.group_farewell_text") || DEFAULT_FAREWELL_PREVIEW)} />
                </>
              ) : null}
            </div>
          </Field>
        </Card>

        <Card>
          <div className="py-4">
            <SectionHeader icon={Plug} title="Zalo" desc="Gửi thông báo tới Zalo cá nhân/nhóm qua webhook relay. OA API chỉ là dự phòng." />
          </div>
          <Field label="Zalo cá nhân — Webhook relay" hint="URL bot cá nhân của bạn (relay vào nhóm Zalo cá nhân). Đây là kênh chính.">
            <Input value={v("zalo.webhook_url")} onChange={(e) => set("zalo.webhook_url", e.target.value)} placeholder="https://... (bot cá nhân)" />
            <SensitiveHint hint={sensitiveHint("zalo.webhook_url")} />
          </Field>
          <Field label="OA Access Token (dự phòng)" hint="Chỉ dùng cho Official Account doanh nghiệp. Bỏ trống nếu dùng Zalo cá nhân.">
            <Input value={v("zalo.oa_access_token")} onChange={(e) => set("zalo.oa_access_token", e.target.value)} placeholder="Access token OA..." />
            <SensitiveHint hint={sensitiveHint("zalo.oa_access_token")} />
          </Field>
          <Field label="OA Recipient / Group ID (dự phòng)" hint="user_id người/nhóm nhận qua OA API (chỉ khi dùng OA)">
            <Input value={v("zalo.recipient_user_id")} onChange={(e) => set("zalo.recipient_user_id", e.target.value)} placeholder="user_id..." />
            <SensitiveHint hint={sensitiveHint("zalo.recipient_user_id")} />
          </Field>
          <Field label="Zalo Group ID" hint="Dùng làm recipient OA nếu chưa đặt ID ở trên">
            <Input value={v("zalo.group_id")} onChange={(e) => set("zalo.group_id", e.target.value)} placeholder="0123456789" />
            <SensitiveHint hint={sensitiveHint("zalo.group_id")} />
          </Field>
        </Card>

        <Card>
          <div className="py-4">
            <SectionHeader icon={BellRing} title="Discord — Nội Bộ" desc="Gửi vào channel riêng: CSKH mới, team join, bảo mật, báo cáo ngày" />
          </div>
          <Field label="Webhook URL Nội Bộ" hint="Tạo trong Server Settings → Integrations → Webhooks">
            <div className="space-y-2">
              <Input
                value={v("integrations.discord_internal_webhook")}
                onChange={(e) => set("integrations.discord_internal_webhook", e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                className="font-mono text-xs"
              />
              <SensitiveHint hint={sensitiveHint("integrations.discord_internal_webhook")} />
              {v("integrations.discord_internal_webhook") && (
                <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5" /> Đã cấu hình — nội bộ.
                </p>
              )}
            </div>
          </Field>
          <Field label="Bật báo cáo ngày qua Discord" hint="Báo cáo thống kê tự động">
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={v("integrations.discord_daily_report") === "true"}
                  onChange={(e) => set("integrations.discord_daily_report", e.target.checked ? "true" : "false")}
                  className="size-4 cursor-pointer accent-primary"
                />
                <span className="text-xs text-muted-foreground">Mặc định tắt. Bật để nhận báo cáo ngày trên Discord.</span>
              </label>
              {v("integrations.discord_daily_report") === "true" && (
                <div className="pl-6">
                  <p className="text-[11px] text-muted-foreground mb-1.5 flex items-center gap-1"><Clock className="size-3" /> Giờ gửi riêng (ICT)</p>
                  <HourSelect
                    value={v("integrations.discord_report_hour")}
                    onChange={(val) => set("integrations.discord_report_hour", val)}
                    hint="Để trống = theo lịch chung"
                  />
                </div>
              )}
            </div>
          </Field>
        </Card>

        <Card>
          <div className="py-4">
            <SectionHeader icon={BellRing} title="Discord — Public" desc="Gửi ra channel public: bài mới, sự kiện, cập nhật Free Fire" />
          </div>
          <Field label="Webhook URL Public" hint="Tạo trong Server Settings → Integrations → Webhooks (channel public)">
            <div className="space-y-2">
              <Input
                value={v("integrations.discord_public_webhook")}
                onChange={(e) => set("integrations.discord_public_webhook", e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                className="font-mono text-xs"
              />
              <SensitiveHint hint={sensitiveHint("integrations.discord_public_webhook")} />
              {v("integrations.discord_public_webhook") && (
                <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5" /> Đã cấu hình — public.
                </p>
              )}
            </div>
          </Field>
        </Card>

        <Card>
          <div className="py-4">
            <SectionHeader
              icon={Plug}
              title="Discord Bot"
              desc="Toàn bộ cấu hình bot: token, App ID, ID kênh và role — sửa ở đây, không cần deploy lại"
            />
          </div>

          <div className="mb-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              <span className="font-bold">Token &amp; App ID:</span> Discord Developer Portal → app của bạn →
              tab Bot (token) và General Information (Application ID, Public Key).{" "}
              <span className="font-bold">ID kênh/role:</span> bật Discord → Cài đặt → Nâng cao → Chế độ nhà
              phát triển, rồi chuột phải vào kênh/role → &ldquo;Sao chép ID&rdquo;. Ô nào để trống sẽ dùng
              biến môi trường <span className="font-mono">DISCORD_*</span> như trước.
            </p>
          </div>

          <Field label="Bot Token" hint="Tab Bot → Reset Token. Nhạy cảm — lưu mã hoá, không hiện lại" icon={Plug}>
            <div className="space-y-2">
              <Input
                value={v("integrations.discord_bot_token")}
                onChange={(e) => set("integrations.discord_bot_token", e.target.value)}
                placeholder="MTIzNDU2Nzg5.GxYzAb...."
                className="font-mono text-xs"
                type="password"
              />
              <SensitiveHint hint={sensitiveHint("integrations.discord_bot_token")} />
            </div>
          </Field>

          <Field label="Application ID" hint="General Information → Application ID" icon={Plug}>
            <Input
              value={v("integrations.discord_app_id")}
              onChange={(e) => set("integrations.discord_app_id", e.target.value.replace(/\D/g, ""))}
              placeholder="1234567890123456789"
              inputMode="numeric"
              maxLength={20}
              className="font-mono text-xs max-w-64"
            />
          </Field>

          <Field
            label="Public Key"
            hint="General Information → Public Key. Dùng để kiểm chữ ký mỗi tương tác Discord gửi tới"
            icon={Plug}
          >
            <Input
              value={v("integrations.discord_public_key")}
              onChange={(e) => set("integrations.discord_public_key", e.target.value.trim().toLowerCase())}
              placeholder="295fac4b46e04171993c..."
              className="font-mono text-xs"
            />
          </Field>

          {[
            { key: "integrations.discord_guild_id",           label: "Guild ID (server)",   hint: "Server Discord của Arex — bắt buộc để gán role" },
            { key: "integrations.discord_shop_channel_id",    label: "Kênh chợ",            hint: "Đăng tin chợ vừa được duyệt" },
            { key: "integrations.discord_staff_channel_id",   label: "Kênh nội bộ",         hint: "Đơn mới, tranh chấp, cảnh báo" },
            { key: "integrations.discord_ticket_channel_id",  label: "Kênh ticket",         hint: "Nơi đặt bảng mở phòng hỗ trợ" },
            { key: "integrations.discord_event_channel_id",   label: "Kênh sự kiện",        hint: "Nhắc sự kiện Free Fire sắp diễn ra" },
            { key: "integrations.discord_agent_role_id",      label: "Role giao dịch viên", hint: "Được ping khi có đơn chờ nhận" },
            { key: "integrations.discord_linked_role_id",     label: "Role đã liên kết",    hint: "Gán cho người đã nối tài khoản site" },
            { key: "integrations.discord_seller_role_id",     label: "Role người bán",      hint: "Gán cho người bán đã được duyệt" },
            { key: "integrations.discord_staff_role_id",      label: "Role quản trị",       hint: "Được ping trong phòng ticket" },
          ].map(({ key, label, hint }) => (
            <Field key={key} label={label} hint={hint} icon={Plug}>
              <Input
                value={v(key)}
                onChange={(e) => set(key, e.target.value.replace(/\D/g, ""))}
                placeholder="1234567890123456789"
                inputMode="numeric"
                maxLength={20}
                className="font-mono text-xs max-w-64"
              />
            </Field>
          ))}
        </Card>

        <Card>
          <div className="py-4">
            <SectionHeader
              icon={BellRing}
              title="Firebase — thông báo đẩy app native"
              desc="Service account để đẩy thông báo xuống app Arex Hub và Arex Network (iOS + Android)"
            />
          </div>

          <div className="mb-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Firebase Console → Project settings → Service accounts → Generate new private key. File JSON tải
              về có đủ 3 giá trị dưới đây. Riêng khoá bí mật phải dán dạng một dòng, giữ nguyên các đoạn
              <span className="font-mono"> \n</span> như trong file JSON. Ô nào để trống sẽ dùng biến môi trường
              <span className="font-mono"> FIREBASE_*</span>.
            </p>
          </div>

          <Field label="Project ID" hint="Trường project_id — ví dụ arexnetwork-3df99" icon={BellRing}>
            <Input
              value={v("integrations.firebase_project_id")}
              onChange={(e) => set("integrations.firebase_project_id", e.target.value.trim())}
              placeholder="arexnetwork-3df99"
              className="font-mono text-xs max-w-80"
            />
          </Field>

          <Field label="Client Email" hint="Trường client_email — đuôi @…iam.gserviceaccount.com" icon={BellRing}>
            <Input
              value={v("integrations.firebase_client_email")}
              onChange={(e) => set("integrations.firebase_client_email", e.target.value.trim())}
              placeholder="firebase-adminsdk-xxxxx@arexnetwork-3df99.iam.gserviceaccount.com"
              className="font-mono text-xs"
            />
          </Field>

          <Field label="Private Key" hint="Trường private_key. Nhạy cảm — lưu mã hoá, không hiện lại" icon={BellRing}>
            <div className="space-y-2">
              <Input
                value={v("integrations.firebase_private_key")}
                onChange={(e) => set("integrations.firebase_private_key", e.target.value)}
                placeholder="-----BEGIN PRIVATE KEY-----\nMIIEv..."
                className="font-mono text-xs"
                type="password"
              />
              <SensitiveHint hint={sensitiveHint("integrations.firebase_private_key")} />
            </div>
          </Field>
        </Card>

        <Card>
          <div className="py-4">
            <SectionHeader icon={Plug} title="Lark / Feishu" desc="Webhook bot Lark — báo gia nhập team, báo cáo ngày, cảnh báo bảo mật" />
          </div>
          <Field label="Tên bot (hiển thị nội bộ)" hint="VD: Arex-Notifier" icon={Plug}>
            <Input value={v("integrations.lark_bot_name")} onChange={(e) => set("integrations.lark_bot_name", e.target.value)} placeholder="Arex-Notifier" maxLength={60} />
          </Field>
          <Field label="Webhook chính" hint="Báo team join, duyệt, báo cáo ngày" icon={Plug}>
            <div className="space-y-2">
              <Input value={v("integrations.lark_webhook_url")} onChange={(e) => set("integrations.lark_webhook_url", e.target.value)} placeholder="https://open.larksuite.com/open-apis/bot/v2/hook/..." className="font-mono text-xs" />
              <SensitiveHint hint={sensitiveHint("integrations.lark_webhook_url")} />
              {v("integrations.lark_webhook_url") && (
                <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5" /> Đã cấu hình.
                </p>
              )}
            </div>
          </Field>
          <Field label="Webhook cảnh báo (tuỳ chọn)" hint="Riêng cho IP bị chặn, đăng nhập sai bất thường — để trống sẽ dùng webhook chính" icon={Plug}>
            <Input value={v("integrations.lark_alerts_webhook_url")} onChange={(e) => set("integrations.lark_alerts_webhook_url", e.target.value)} placeholder="https://open.larksuite.com/open-apis/bot/v2/hook/..." className="font-mono text-xs" />
            <SensitiveHint hint={sensitiveHint("integrations.lark_alerts_webhook_url")} />
          </Field>
          <Field label="Bật báo cáo lượt xem hằng ngày" hint="Báo cáo thống kê tự động" icon={Plug}>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={v("integrations.lark_daily_report") !== "false"}
                  onChange={(e) => set("integrations.lark_daily_report", e.target.checked ? "true" : "false")}
                  className="size-4 cursor-pointer accent-primary"
                />
                <span className="text-xs text-muted-foreground">Mặc định bật. Tắt nếu không muốn nhận.</span>
              </label>
              {v("integrations.lark_daily_report") !== "false" && (
                <div className="pl-6">
                  <p className="text-[11px] text-muted-foreground mb-1.5 flex items-center gap-1"><Clock className="size-3" /> Giờ gửi riêng (ICT)</p>
                  <HourSelect
                    value={v("integrations.lark_report_hour")}
                    onChange={(val) => set("integrations.lark_report_hour", val)}
                    hint="Để trống = theo lịch chung"
                  />
                </div>
              )}
            </div>
          </Field>

        </Card>

        {/* ── LARK SPREADSHEET ──────────────────────────────────────────────────── */}
        <Card>
          <div className="py-4">
            <SectionHeader icon={Plug} title="Lark Spreadsheet — Tự Động Ghi User Mới" desc="Mỗi khi có tài khoản mới đăng ký, tự động thêm 1 dòng vào bảng tính Lark. Không cần xuất thủ công." />
          </div>

          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 mb-1">
            <p className="text-[11px] text-blue-600 dark:text-blue-400 leading-relaxed">
              <span className="font-bold">Cách lấy thông tin:</span> Mở Lark → tạo App tại{" "}
              <span className="font-mono">open.larksuite.com/app</span> → vào Credentials → copy App ID + Secret.
              Mở Spreadsheet → lấy token trong URL:{" "}
              <span className="font-mono">larksuite.com/sheets/<b>&#123;token&#125;</b></span>.
              Cấp quyền App: <span className="font-mono">sheets:spreadsheet</span>.
            </p>
          </div>

          <Field label="Lark App ID" hint="Từ trang Credentials của Lark App" icon={Plug}>
            <div className="space-y-2">
              <Input
                value={v("integrations.lark_app_id")}
                onChange={(e) => set("integrations.lark_app_id", e.target.value)}
                placeholder="cli_xxxxxxxxxxxxxx"
                className="font-mono text-xs"
              />
              <SensitiveHint hint={sensitiveHint("integrations.lark_app_id")} />
            </div>
          </Field>

          <Field label="Lark App Secret" hint="Nhạy cảm — không chia sẻ" icon={Plug}>
            <div className="space-y-2">
              <Input
                value={v("integrations.lark_app_secret")}
                onChange={(e) => set("integrations.lark_app_secret", e.target.value)}
                placeholder="xxxxxxxxxxxxxxxxxxxx"
                className="font-mono text-xs"
                type="password"
              />
              <SensitiveHint hint={sensitiveHint("integrations.lark_app_secret")} />
            </div>
          </Field>

          <Field label="Spreadsheet Token" hint="Token trong URL bảng tính Lark" icon={Plug}>
            <div className="space-y-2">
              <Input
                value={v("integrations.lark_sheet_token")}
                onChange={(e) => set("integrations.lark_sheet_token", e.target.value)}
                placeholder="shtxxxxxxxxxxxxxxxxxx"
                className="font-mono text-xs"
              />
              <SensitiveHint hint={sensitiveHint("integrations.lark_sheet_token")} />
            </div>
          </Field>

          <Field label="Tên Sheet" hint='Tên tab trong bảng tính (mặc định: "Sheet1")' icon={Plug}>
            <Input
              value={v("integrations.lark_sheet_name")}
              onChange={(e) => set("integrations.lark_sheet_name", e.target.value)}
              placeholder="Sheet1"
              className="font-mono text-xs max-w-48"
            />
          </Field>

          <div className="py-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Các tab được ghi tự động
            </p>
            <div className="space-y-2">
              {[
                { tab: "Đăng ký", desc: "Thời gian · Email · Tên · User ID · Vai trò · Hình thức · Thành viên số · FF ID · IP · Thiết bị · Trình duyệt" },
                { tab: "Đăng nhập", desc: "Mỗi lượt đăng nhập (mật khẩu / Google / Facebook) kèm IP, thiết bị, trình duyệt" },
                { tab: "Đơn chợ", desc: "Mỗi lần đơn đổi trạng thái: mã đơn, tin đăng, giá, phí, thực nhận, người mua, GDV" },
                { tab: "Đăng ký giải", desc: "Yêu cầu tổ chức giải: tên giải, thể thức, số đội, giải thưởng, liên hệ" },
                { tab: "Gia nhập team", desc: "Hồ sơ ứng tuyển đầy đủ: SĐT, vị trí, tài khoản game, mạng xã hội, mã mời" },
              ].map(({ tab, desc }) => (
                <div key={tab} className="rounded-lg border border-border bg-background px-3 py-2">
                  <p className="font-mono text-[11px] font-black text-primary">{tab}</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">
              Tab nào chưa có sẽ được tự tạo kèm dòng tiêu đề ở lần ghi đầu tiên — không cần dựng bảng bằng tay.
              Ô <span className="font-mono">Tên Sheet</span> ở trên chỉ đổi tên tab &ldquo;Đăng ký&rdquo;.
            </p>
          </div>
        </Card>

        <Card>
          <div className="py-4">
            <SectionHeader icon={BellRing} title="Telegram Bot Admin" desc="Gửi nội bộ: CSKH mới, team join, bảo mật, báo cáo hằng ngày" />
          </div>
          <Field label="Bot Token" hint="Lấy từ @BotFather — nhạy cảm" icon={Plug}>
            <div className="space-y-2">
              <Input
                value={v("integrations.telegram_bot_token")}
                onChange={(e) => set("integrations.telegram_bot_token", e.target.value)}
                placeholder="123456:ABC-DEF..."
                className="font-mono text-xs"
                type="password"
              />
              <SensitiveHint hint={sensitiveHint("integrations.telegram_bot_token")} />
            </div>
          </Field>
          <Field label="Chat ID / Group" hint="@username hoặc ID số âm của group/channel nội bộ" icon={Plug}>
            <div className="space-y-2">
              <Input
                value={v("integrations.telegram_chat_id")}
                onChange={(e) => set("integrations.telegram_chat_id", e.target.value)}
                placeholder="@arex_admin hoặc -1001234567890"
                className="font-mono text-xs"
              />
              <SensitiveHint hint={sensitiveHint("integrations.telegram_chat_id")} />
              {v("integrations.telegram_chat_id") && v("integrations.telegram_bot_token") && (
                <div className="flex items-center gap-3">
                  <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-3.5" /> Đã cấu hình
                  </p>
                  <button
                    type="button"
                    onClick={() => testTelegramBot("admin")}
                    disabled={tgTest["admin"] === "loading"}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-3 py-1 text-xs font-medium transition hover:bg-muted disabled:opacity-50"
                  >
                    {tgTest["admin"] === "loading" ? <Loader2 className="size-3.5 animate-spin" /> : <SendHorizonal className="size-3.5" />}
                    {tgTest["admin"] === "loading" ? "Đang gửi…" : tgTest["admin"] === "ok" ? "✅ Đã gửi!" : tgTest["admin"] === "err" ? "❌ Thất bại" : "Gửi tin thử"}
                  </button>
                </div>
              )}
            </div>
          </Field>
          <Field label="Bật báo cáo hằng ngày qua Telegram" hint="Báo cáo thống kê tự động" icon={Plug}>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={v("integrations.telegram_daily_report") !== "false"}
                  onChange={(e) => set("integrations.telegram_daily_report", e.target.checked ? "true" : "false")}
                  className="size-4 cursor-pointer accent-primary"
                />
                <span className="text-xs text-muted-foreground">Mặc định bật. Tắt nếu không muốn nhận.</span>
              </label>
              {v("integrations.telegram_daily_report") !== "false" && (
                <div className="pl-6">
                  <p className="text-[11px] text-muted-foreground mb-1.5 flex items-center gap-1"><Clock className="size-3" /> Giờ gửi riêng (ICT)</p>
                  <HourSelect
                    value={v("integrations.telegram_report_hour")}
                    onChange={(val) => set("integrations.telegram_report_hour", val)}
                    hint="Để trống = theo lịch chung"
                  />
                </div>
              )}
            </div>
          </Field>

        </Card>

        <Card>
          <div className="py-4">
            <SectionHeader icon={BellRing} title="Telegram Bot Public" desc="Gửi công khai cho người dùng: sự kiện mới, bài viết mới, cập nhật FF" />
          </div>
          <Field label="Bot Token" hint="Bot riêng để đăng vào kênh/group public — nhạy cảm" icon={Plug}>
            <div className="space-y-2">
              <Input
                value={v("integrations.telegram_user_bot_token")}
                onChange={(e) => set("integrations.telegram_user_bot_token", e.target.value)}
                placeholder="123456:ABC-DEF..."
                className="font-mono text-xs"
                type="password"
              />
              <SensitiveHint hint={sensitiveHint("integrations.telegram_user_bot_token")} />
            </div>
          </Field>
          <Field label="Chat ID / Group Public" hint="@username hoặc ID kênh/nhóm public cho người dùng theo dõi" icon={Plug}>
            <div className="space-y-2">
              <Input
                value={v("integrations.telegram_user_chat_id")}
                onChange={(e) => set("integrations.telegram_user_chat_id", e.target.value)}
                placeholder="@arex_news hoặc -1001234567890"
                className="font-mono text-xs"
              />
              <SensitiveHint hint={sensitiveHint("integrations.telegram_user_chat_id")} />
              {v("integrations.telegram_user_chat_id") && v("integrations.telegram_user_bot_token") && (
                <div className="flex items-center gap-3">
                  <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-3.5" /> Đã cấu hình
                  </p>
                  <button
                    type="button"
                    onClick={() => testTelegramBot("user")}
                    disabled={tgTest["user"] === "loading"}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-3 py-1 text-xs font-medium transition hover:bg-muted disabled:opacity-50"
                  >
                    {tgTest["user"] === "loading" ? <Loader2 className="size-3.5 animate-spin" /> : <SendHorizonal className="size-3.5" />}
                    {tgTest["user"] === "loading" ? "Đang gửi…" : tgTest["user"] === "ok" ? "✅ Đã gửi!" : tgTest["user"] === "err" ? "❌ Thất bại" : "Gửi tin thử"}
                  </button>
                </div>
              )}
            </div>
          </Field>
        </Card>
        {/* ── TELEGRAM MINI APP ────────────────────────────────────────────── */}
        <Card>
          <div className="py-4">
            <SectionHeader icon={BellRing} title="Telegram Mini App" desc="Giao diện web trong Telegram + thông báo DM tới người đăng ký" />
          </div>

          {/* Mini App URL */}
          <Field label="URL Mini App" hint="Trỏ URL này trong BotFather → /newapp" icon={Globe}>
            <div className="flex items-center gap-2">
              <Input
                value={`${SITE_URL}/tg`}
                readOnly
                className="font-mono text-xs bg-muted/40 cursor-default"
              />
              <button
                type="button"
                onClick={() => {
                  const url = `${SITE_URL}/tg`;
                  navigator.clipboard.writeText(url).then(() => toast.success("Đã copy URL!")).catch(() => {});
                }}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-3 py-2 text-xs font-medium transition hover:bg-muted"
              >
                Copy
              </button>
            </div>
          </Field>

          {/* Soi sức khoẻ mọi đường liên lạc ra ngoài — mấy thứ này hỏng đều
              hỏng lặng lẽ, không ai biết cho tới lúc người dùng kêu. */}
          <Field label="Kiểm tra tích hợp" hint="Email, bot Telegram, webhook, Discord — chỉ bắt tay để dò, không gửi thư hay tin nhắn nào" icon={Plug}>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={checkIntegrations}
                  disabled={healthLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-50"
                >
                  {healthLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Plug className="size-3.5" />}
                  {healthLoading ? "Đang kiểm tra…" : "Kiểm tra ngay"}
                </button>
                {health && (
                  <span className={`text-[11px] font-semibold ${health.ok ? "text-emerald-500" : "text-amber-500"}`}>
                    {health.ok ? "Tất cả đều ổn" : `${health.checks.filter((c) => !c.ok).length}/${health.checks.length} mục có vấn đề`}
                  </span>
                )}
              </div>
              {health && (
                <ul className="flex flex-col gap-1.5 rounded-lg border border-border bg-muted/30 p-3">
                  {health.checks.map((c) => (
                    <li key={c.name} className="text-[11px] leading-relaxed">
                      <span className={c.ok ? "text-emerald-500" : "text-red-500"}>{c.ok ? "✅" : "❌"}</span>{" "}
                      <span className="font-semibold">{c.name}:</span>{" "}
                      <span className="text-muted-foreground">{c.detail}</span>
                      {c.fix && <div className="pl-5 text-amber-500">→ {c.fix}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Field>

          {/* Webhook setup */}
          <Field label="Webhook Bot" hint="Đăng ký để bot nhận lệnh /start, /news, /events từ người dùng" icon={Plug}>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={setupWebhook}
                disabled={webhookStatus === "loading"}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-50"
              >
                {webhookStatus === "loading" ? <Loader2 className="size-3.5 animate-spin" /> : <SendHorizonal className="size-3.5" />}
                {webhookStatus === "loading" ? "Đang set…" : webhookStatus === "ok" ? "✅ Đã set!" : webhookStatus === "err" ? "❌ Thất bại" : "Set Webhook"}
              </button>
              <span className="text-[11px] text-muted-foreground">Cần Bot Token Admin đã cấu hình ở trên</span>
            </div>
          </Field>

          {/* Subscriber stats */}
          <Field label="Subscribers" hint="Người dùng đã bật thông báo qua Mini App hoặc /start" icon={BellRing}>
            <div className="flex items-center gap-3 flex-wrap">
              {miniAppStats ? (
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-xl font-extrabold text-primary tabular-nums">{miniAppStats.active.toLocaleString("vi-VN")}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Đang bật</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-extrabold text-muted-foreground tabular-nums">{miniAppStats.total.toLocaleString("vi-VN")}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Tổng</p>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
              <button
                type="button"
                onClick={loadMiniAppStats}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-3 py-2 text-xs font-medium transition hover:bg-muted"
              >
                Tải thống kê
              </button>
            </div>
          </Field>

          {/* Broadcast test */}
          <Field label="Test Broadcast" hint="Gửi tin thử tới tất cả subscribers đang bật" icon={BellRing}>
            <button
              type="button"
              onClick={sendBroadcastTest}
              disabled={miniAppBroadcast === "loading"}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-4 py-2 text-xs font-medium transition hover:bg-muted disabled:opacity-50"
            >
              {miniAppBroadcast === "loading" ? <Loader2 className="size-3.5 animate-spin" /> : <SendHorizonal className="size-3.5" />}
              {miniAppBroadcast === "loading" ? "Đang gửi…" : miniAppBroadcast === "ok" ? "✅ Đã gửi!" : miniAppBroadcast === "err" ? "❌ Thất bại" : "Gửi test DM"}
            </button>
          </Field>

          {/* BotFather steps */}
          <div className="py-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cách kích hoạt Mini App</p>
            <ol className="space-y-1.5 text-[11px] text-muted-foreground list-decimal list-inside">
              <li>Mở <span className="font-mono text-foreground">@BotFather</span> trên Telegram</li>
              <li>Gõ <span className="font-mono text-foreground">/newapp</span> → chọn bot Admin</li>
              <li>Đặt tên App (VD: <span className="font-mono text-foreground">Arex</span>) và short name</li>
              <li>Nhập URL: <span className="font-mono text-foreground">.../tg</span> (copy ở trên)</li>
              <li>Nhấn &quot;Set Webhook&quot; để bot nhận lệnh /start từ người dùng</li>
            </ol>
          </div>
        </Card>

        {/* ── LỊCH GỬI BÁO CÁO ────────────────────────────────────────────── */}
        <Card>
          <div className="py-4">
            <SectionHeader icon={Clock} title="Lịch Gửi Báo Cáo Tự Động" desc="Cấu hình giờ và tần suất gửi báo cáo qua Telegram + Discord + Lark" />
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 mb-1">
            <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
              <span className="font-bold">⚡ Lưu ý:</span> Cron chạy mỗi giờ — cần{" "}
              <span className="font-semibold">Vercel Pro</span> để gửi theo interval (mỗi 2–12 giờ).
              Hobby plan chỉ hỗ trợ <span className="font-semibold">hằng ngày</span> (chọn interval = Hằng ngày).
            </p>
          </div>

          <Field label="Giờ gửi (ICT)" hint="Giờ Việt Nam (UTC+7) để gửi báo cáo — áp dụng cho hằng ngày hoặc làm gốc tính interval" icon={Clock}>
            <Select
              value={v("integrations.report_schedule_hour")}
              onValueChange={(val) => set("integrations.report_schedule_hour", val ?? "8")}
            >
              <SelectTrigger className="max-w-40">
                <SelectValue placeholder="Chọn giờ" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }, (_, h) => (
                  <SelectItem key={h} value={String(h)}>
                    {String(h).padStart(2, "0")}:00 ICT
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Tần suất" hint="Mỗi bao nhiêu giờ gửi 1 lần" icon={Zap}>
            <Select
              value={v("integrations.report_schedule_interval")}
              onValueChange={(val) => set("integrations.report_schedule_interval", val ?? "24")}
            >
              <SelectTrigger className="max-w-52">
                <SelectValue placeholder="Chọn tần suất" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Mỗi 1 giờ</SelectItem>
                <SelectItem value="2">Mỗi 2 giờ</SelectItem>
                <SelectItem value="3">Mỗi 3 giờ</SelectItem>
                <SelectItem value="4">Mỗi 4 giờ</SelectItem>
                <SelectItem value="6">Mỗi 6 giờ</SelectItem>
                <SelectItem value="8">Mỗi 8 giờ</SelectItem>
                <SelectItem value="12">Mỗi 12 giờ</SelectItem>
                <SelectItem value="24">Hằng ngày (vào giờ đã chọn)</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Kênh gửi báo cáo" hint="Chọn kênh nào nhận báo cáo tự động" icon={SendHorizonal}>
            <div className="space-y-2.5">
              {[
                { key: "integrations.telegram_daily_report", label: "Telegram Admin Bot", defaultOn: true },
                { key: "integrations.discord_daily_report",  label: "Discord (Internal)", defaultOn: false },
                { key: "integrations.lark_daily_report",     label: "Lark / Feishu",      defaultOn: true },
              ].map(({ key, label, defaultOn }) => {
                const on = defaultOn ? v(key) !== "false" : v(key) === "true";
                return (
                  <div key={key} className="flex items-center gap-3">
                    <Toggle
                      checked={on}
                      onChange={(val) => set(key, val ? "true" : "false")}
                      label={label}
                    />
                    <span className={cn("text-sm font-semibold", on ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </Field>

          <Field label="Nội dung báo cáo" hint="Bỏ qua ngày không có hoạt động và gửi kèm báo cáo đăng nhập" icon={SendHorizonal}>
            <div className="space-y-2.5">
              {[
                {
                  key: "integrations.report_skip_when_idle",
                  label: "Bỏ qua ngày không có hoạt động",
                  desc: "Không lượt xem, không user/bài/sự kiện mới, không đăng nhập → không gửi.",
                },
                {
                  key: "integrations.auth_daily_report",
                  label: "Gửi kèm báo cáo đăng nhập",
                  desc: "Chi tiết đăng nhập theo mật khẩu / Google / Facebook, đăng ký mới, IP bị chặn.",
                },
              ].map(({ key, label, desc }) => {
                const on = v(key) !== "false";
                return (
                  <div key={key} className="flex items-start gap-3">
                    <Toggle
                      checked={on}
                      onChange={(val) => set(key, val ? "true" : "false")}
                      label={label}
                    />
                    <div>
                      <span className={cn("text-sm font-semibold", on ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                        {label}
                      </span>
                      <p className="text-[11px] text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Field>

          <Field label="Ngày trong tuần" hint="Chỉ gửi vào các ngày được chọn — bỏ chọn hết = gửi mọi ngày" icon={Calendar}>
            {(() => {
              const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
              const selected = new Set((v("integrations.report_schedule_days") || "0,1,2,3,4,5,6").split(",").map(Number));
              return (
                <div className="flex flex-wrap gap-2">
                  {days.map((label, idx) => {
                    const active = selected.has(idx);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          const next = new Set(selected);
                          if (active) next.delete(idx); else next.add(idx);
                          set("integrations.report_schedule_days", [...next].sort().join(","));
                        }}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors",
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-muted/30 text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </Field>

          {(() => {
            const hour = parseInt(v("integrations.report_schedule_hour") || "8");
            const interval = parseInt(v("integrations.report_schedule_interval") || "24");
            const daysRaw = v("integrations.report_schedule_days") || "0,1,2,3,4,5,6";
            const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
            const activeDays = daysRaw.split(",").map(Number).filter((d) => !isNaN(d)).map((d) => dayNames[d]).join(", ");
            const fmtH = (h: number) => `${String(h % 24).padStart(2, "0")}:00`;
            let timePreview = "";
            if (interval >= 24) timePreview = `lúc ${fmtH(hour)} ICT`;
            else if (interval <= 1) timePreview = "mỗi giờ";
            else {
              const times = Array.from({ length: Math.floor(24 / interval) }, (_, i) => fmtH((hour % interval) + i * interval));
              timePreview = `lúc ${times.join(", ")} ICT`;
            }
            const preview = `Gửi ${timePreview}${activeDays ? ` — ${activeDays}` : " — mọi ngày"}`;
            return (
              <div className="py-3 space-y-3">
                <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
                  <Clock className="size-4 text-primary shrink-0" />
                  <p className="text-xs font-medium text-primary">{preview}</p>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={reportSending}
                    onClick={sendReportNow}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-50"
                  >
                    {reportSending ? <Loader2 className="size-3.5 animate-spin" /> : <SendHorizonal className="size-3.5" />}
                    {reportSending ? "Đang gửi…" : "Gửi báo cáo ngay"}
                  </button>
                </div>
              </div>
            );
          })()}
        </Card>

        {/* ── TỰ ĐỘNG GỬI THÔNG BÁO ───────────────────────────────────────── */}
        <Card>
          <div className="py-4">
            <SectionHeader icon={BellRing} title="Tự Động Gửi Thông Báo" desc="Kiểm soát khi nào bot gửi thông báo tự động qua Telegram + Discord + Push" />
          </div>

          <Field label="Bài viết mới (đăng thủ công)" hint="Gửi thông báo khi admin tạo bài viết mới" icon={Newspaper}>
            <div className="flex items-center gap-3">
              <Toggle
                checked={v("integrations.tg_auto_news") !== "false"}
                onChange={(val) => set("integrations.tg_auto_news", val ? "true" : "false")}
                label="Bật/tắt thông báo bài viết mới"
              />
              <span className={cn("text-sm font-semibold", v("integrations.tg_auto_news") !== "false" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                {v("integrations.tg_auto_news") !== "false" ? "Đang bật" : "Đang tắt"}
              </span>
            </div>
          </Field>

          <Field label="Bài viết lên lịch (cron tự động)" hint="Gửi thông báo khi cron đăng bài viết đã lên lịch" icon={Clock}>
            <div className="flex items-center gap-3">
              <Toggle
                checked={v("integrations.tg_auto_scheduled") !== "false"}
                onChange={(val) => set("integrations.tg_auto_scheduled", val ? "true" : "false")}
                label="Bật/tắt thông báo bài viết lên lịch"
              />
              <span className={cn("text-sm font-semibold", v("integrations.tg_auto_scheduled") !== "false" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                {v("integrations.tg_auto_scheduled") !== "false" ? "Đang bật" : "Đang tắt"}
              </span>
            </div>
          </Field>

          <Field label="Sự kiện mới" hint="Gửi thông báo khi admin tạo sự kiện mới" icon={Calendar}>
            <div className="flex items-center gap-3">
              <Toggle
                checked={v("integrations.tg_auto_events") !== "false"}
                onChange={(val) => set("integrations.tg_auto_events", val ? "true" : "false")}
                label="Bật/tắt thông báo sự kiện mới"
              />
              <span className={cn("text-sm font-semibold", v("integrations.tg_auto_events") !== "false" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                {v("integrations.tg_auto_events") !== "false" ? "Đang bật" : "Đang tắt"}
              </span>
            </div>
          </Field>

          <Field label="Broadcast DM (Mini App)" hint="Gửi DM tới tất cả subscribers khi có nội dung mới" icon={SendHorizonal}>
            <div className="flex items-center gap-3">
              <Toggle
                checked={v("integrations.tg_auto_broadcast_dm") !== "false"}
                onChange={(val) => set("integrations.tg_auto_broadcast_dm", val ? "true" : "false")}
                label="Bật/tắt broadcast DM"
              />
              <span className={cn("text-sm font-semibold", v("integrations.tg_auto_broadcast_dm") !== "false" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                {v("integrations.tg_auto_broadcast_dm") !== "false" ? "Đang bật" : "Đang tắt"}
              </span>
            </div>
          </Field>
        </Card>

        {/* ── AI CSKH ──────────────────────────────────────────────────────── */}
        <Card>
          <div className="py-4">
            <SectionHeader icon={Plug} title="AI Trả Lời CSKH" desc="Tự động trả lời tin nhắn hỗ trợ bằng Claude AI" />
          </div>

          <Field label="Bật AI tự động trả lời" hint="AI sẽ phản hồi ngay khi khách gửi tin nhắn mới">
            <div className="flex items-center gap-3">
              <Toggle
                checked={v("integrations.ai_auto_reply") !== "false"}
                onChange={(val) => set("integrations.ai_auto_reply", val ? "true" : "false")}
                label="Bật/tắt AI tự động trả lời"
              />
              <span className={cn("text-sm font-semibold", v("integrations.ai_auto_reply") !== "false" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                {v("integrations.ai_auto_reply") !== "false" ? "Đang bật" : "Đang tắt"}
              </span>
            </div>
          </Field>

          <Field label="Tên bot AI" hint="Tên hiển thị trong khung chat CSKH" icon={Plug}>
            <Input
              value={v("integrations.ai_bot_name")}
              onChange={(e) => set("integrations.ai_bot_name", e.target.value)}
              placeholder="Trợ Lý AI"
              className="text-sm"
            />
          </Field>

          <Field label="System Prompt (tuỳ chỉnh)" hint="Để trống để dùng prompt mặc định. Hỗ trợ {siteName}." icon={Plug}>
            <Textarea
              value={v("integrations.ai_system_prompt")}
              onChange={(e) => set("integrations.ai_system_prompt", e.target.value)}
              placeholder={"Để trống → dùng prompt mặc định:\n\"Bạn là trợ lý CSKH của {siteName}...\""}
              rows={6}
              className="font-mono text-xs"
            />
          </Field>

          <Field label="OpenAI API Key" hint="Dùng key riêng thay vì biến môi trường OPENAI_API_KEY — nhạy cảm" icon={Plug}>
            <div className="space-y-2">
              <Input
                value={v("integrations.ai_api_key")}
                onChange={(e) => set("integrations.ai_api_key", e.target.value)}
                placeholder="sk-..."
                className="font-mono text-xs"
                type="password"
              />
              <SensitiveHint hint={sensitiveHint("integrations.ai_api_key")} />
              <p className="text-[11px] text-muted-foreground">
                Key của provider bên dưới. Để trống → dùng <code className="font-mono">OPENAI_API_KEY</code> từ môi trường.
                Free: <span className="font-mono text-primary">console.groq.com</span> hoặc <span className="font-mono text-primary">aistudio.google.com</span>.
              </p>
            </div>
          </Field>

          <Field label="AI Base URL (provider)" hint="Để trống = OpenAI. Đổi để dùng provider free." icon={Plug}>
            <div className="space-y-2">
              <Input
                value={v("integrations.ai_base_url")}
                onChange={(e) => set("integrations.ai_base_url", e.target.value)}
                placeholder="https://api.groq.com/openai/v1"
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Groq: <code className="font-mono">https://api.groq.com/openai/v1</code> · Gemini: <code className="font-mono">https://generativelanguage.googleapis.com/v1beta/openai/</code>
              </p>
            </div>
          </Field>

          <Field label="AI Model" hint="Để trống = gpt-4o-mini (OpenAI)." icon={Plug}>
            <div className="space-y-2">
              <Input
                value={v("integrations.ai_model")}
                onChange={(e) => set("integrations.ai_model", e.target.value)}
                placeholder="gpt-4o-mini"
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Groq: <code className="font-mono">llama-3.3-70b-versatile</code> · Gemini: <code className="font-mono">gemini-2.0-flash</code>
              </p>
            </div>
          </Field>
        </Card>
      </div>
    ),

    // ── BẢO TRÌ ──────────────────────────────────────────────────────────────
    maintenance: (
      <div className="space-y-5">
        {/* Status banner */}
        <div className={cn(
          "flex items-center gap-3 rounded-2xl border p-4",
          maintenanceOn
            ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
            : "border-green-500/20 bg-green-500/5 text-green-700 dark:text-green-400",
        )}>
          {maintenanceOn
            ? <AlertTriangle className="size-5 shrink-0" />
            : <CheckCircle2 className="size-5 shrink-0" />
          }
          <div className="min-w-0">
            <p className="text-sm font-bold">
              {maintenanceOn ? "Website đang trong chế độ bảo trì" : "Website đang hoạt động bình thường"}
            </p>
            <p className="text-xs opacity-80">
              {maintenanceOn
                ? "Người dùng sẽ thấy trang bảo trì. Chỉ admin mới truy cập được."
                : "Tất cả người dùng có thể truy cập website bình thường."}
            </p>
          </div>
        </div>

        <Card>
          <div className="py-4">
            <SectionHeader icon={Wrench} title="Bảo Trì" desc="Kiểm soát trạng thái website" />
          </div>

          <Field label="Chế độ bảo trì" hint="Bật để ẩn website với người dùng">
            <div className="flex items-center gap-3">
              <Toggle
                checked={maintenanceOn}
                onChange={(val) => set("site.maintenance_mode", val ? "true" : "false")}
                label="Bật/tắt chế độ bảo trì"
              />
              <span className={cn("text-sm font-semibold", maintenanceOn ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
                {maintenanceOn ? "Đang bật" : "Đang tắt"}
              </span>
            </div>
          </Field>

          <Field label="Thông báo" hint="Hiển thị cho người dùng" icon={MessageSquare}>
            <Textarea
              value={v("site.maintenance_message")}
              onChange={(e) => set("site.maintenance_message", e.target.value)}
              placeholder="Website đang được bảo trì. Vui lòng quay lại sau."
              rows={3}
              className="resize-none"
            />
          </Field>

          <Field label="Thời gian kết thúc" hint="Hiển thị countdown (tuỳ chọn)" icon={Clock}>
            <div className="space-y-2">
              <Input
                type="datetime-local"
                value={v("site.maintenance_end_time")}
                onChange={(e) => set("site.maintenance_end_time", e.target.value)}
              />
              {v("site.maintenance_end_time") && (
                <p className="text-xs text-muted-foreground">
                  Kết thúc: {new Date(v("site.maintenance_end_time")).toLocaleString("vi-VN")}
                </p>
              )}
            </div>
          </Field>
        </Card>

        {/* Preview */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Xem trước trang bảo trì</p>
          <div className="rounded-xl border bg-background p-8 text-center space-y-3">
            <div className="flex justify-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-500/10">
                <Wrench className="size-7 text-amber-500" />
              </div>
            </div>
            <p className="font-heading text-xl font-bold uppercase text-foreground">Đang bảo trì</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {v("site.maintenance_message") || "Website đang được bảo trì. Vui lòng quay lại sau."}
            </p>
            {v("site.maintenance_end_time") && (
              <p className="text-xs text-muted-foreground">
                Dự kiến xong lúc: {new Date(v("site.maintenance_end_time")).toLocaleString("vi-VN")}
              </p>
            )}
          </div>
        </div>

        <Card>
          <div className="py-4">
            <SectionHeader icon={ShieldCheck} title="Mã Hoá Dữ Liệu" desc="AES-256-GCM toàn bộ setting nhạy cảm — chạy lại bất cứ lúc nào để xoay khoá" />
          </div>
          <div className="py-4 space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Mã hoá lại toàn bộ SMTP, webhook, số tài khoản ngân hàng... trong DB. Mỗi lần chạy sinh IV mới — dump DB không bao giờ lộ giá trị thật.
            </p>
            <Button type="button" size="sm" disabled={migrating} onClick={migrateEncrypt} className="gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white">
              <ShieldCheck className="size-3.5" />
              {migrating ? "Đang mã hoá..." : "Mã hoá tất cả dữ liệu"}
            </Button>
          </div>
        </Card>
      </div>
    ),

    // ── EMAIL / SMTP ──────────────────────────────────────────────────────────
    mail: (
      <div className="space-y-5">
        <div className="flex items-center gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
            <Mail className="size-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Cấu hình gửi Email</p>
            <p className="text-xs text-muted-foreground">
              Cài đặt SMTP để gửi email xác thực, thông báo từ hệ thống. Thông tin nhạy cảm — không chia sẻ.
            </p>
          </div>
        </div>

        <Card>
          <div className="py-4">
            <SectionHeader icon={Mail} title="SMTP Server" desc="Thông tin kết nối máy chủ email" />
          </div>
          <Field label="SMTP Host" hint="VD: smtp.gmail.com" icon={Globe}>
            <Input value={v("mail.smtp_host")} onChange={(e) => set("mail.smtp_host", e.target.value)} placeholder="smtp.gmail.com" className="font-mono text-sm" />
            <SensitiveHint hint={sensitiveHint("mail.smtp_host")} />
          </Field>
          <Field label="SMTP Port" hint="Thường là 587 (TLS) hoặc 465 (SSL)" icon={Plug}>
            <Input value={v("mail.smtp_port")} onChange={(e) => set("mail.smtp_port", e.target.value)} placeholder="587" className="font-mono text-sm max-w-32" />
          </Field>
          <Field label="SMTP Username" hint="Thường là địa chỉ email" icon={User}>
            <Input value={v("mail.smtp_user")} onChange={(e) => set("mail.smtp_user", e.target.value)} placeholder="no-reply@arex.tech" className="font-mono text-sm" />
            <SensitiveHint hint={sensitiveHint("mail.smtp_user")} />
          </Field>
          <Field label="SMTP Password" hint="Mật khẩu ứng dụng (App Password)" icon={ShieldCheck}>
            <Input type="password" value={v("mail.smtp_pass")} onChange={(e) => set("mail.smtp_pass", e.target.value)} placeholder="••••••••••••••••" className="font-mono text-sm" />
            <SensitiveHint hint={sensitiveHint("mail.smtp_pass")} />
          </Field>
        </Card>

        <Card>
          <div className="py-4">
            <SectionHeader icon={Mail} title="Người gửi" desc="Tên và địa chỉ email hiển thị khi người dùng nhận email" />
          </div>
          <Field label="Tên người gửi" hint="VD: Arex Community" icon={User}>
            <Input value={v("mail.from_name")} onChange={(e) => set("mail.from_name", e.target.value)} placeholder="Arex Community" />
          </Field>
          <Field label="Email người gửi" hint="Phải khớp với SMTP Username" icon={Mail}>
            <Input type="email" value={v("mail.from_email")} onChange={(e) => set("mail.from_email", e.target.value)} placeholder="no-reply@arex.tech" className="font-mono text-sm" />
            <SensitiveHint hint={sensitiveHint("mail.from_email")} />
          </Field>
        </Card>

        <Card>
          <div className="py-4">
            <SectionHeader icon={ImageIcon} title="Banner đầu email" desc="Ảnh hiển thị ở đầu mọi email hệ thống (đăng ký, quên mật khẩu, thông báo…). Để trống = dùng logo + dải màu thương hiệu." />
          </div>
          <Field label="Ảnh banner" hint="Nên dùng ảnh ngang, rộng ~1040px (tỉ lệ 3:1). PNG/JPG." icon={ImageIcon}>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <ImageUploadButton
                  endpoint="/api/admin/upload"
                  bucket="logos"
                  label="Tải ảnh banner"
                  onUploaded={(url) => set("mail.header_image", url)}
                />
                {v("mail.header_image") && (
                  <Button type="button" variant="outline" size="sm" onClick={() => set("mail.header_image", "")} className="gap-1.5">
                    <Trash2 className="size-3.5" /> Gỡ ảnh
                  </Button>
                )}
              </div>
              <Input
                value={v("mail.header_image")}
                onChange={(e) => set("mail.header_image", e.target.value)}
                placeholder="https://… (hoặc tải ảnh lên ở trên)"
                className="font-mono text-xs"
              />
              {v("mail.header_image") && (
                <div className="overflow-hidden rounded-xl border border-border">
                  <div className="border-b border-border bg-muted px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Xem trước đầu email
                  </div>
                  <div className="bg-[#f1f5f9] p-4">
                    <div className="mx-auto max-w-[420px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      <Image
                        src={v("mail.header_image")}
                        alt="Banner email"
                        width={520}
                        height={180}
                        unoptimized
                        className="h-auto w-full object-cover"
                      />
                      <div className="px-5 py-4">
                        <div className="h-3 w-2/3 rounded bg-slate-200" />
                        <div className="mt-2.5 h-2 w-full rounded bg-slate-100" />
                        <div className="mt-1.5 h-2 w-5/6 rounded bg-slate-100" />
                        <div className="mt-4 h-7 w-28 rounded-lg bg-[#0052ff]/90" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Field>
        </Card>

        <Card>
          <div className="py-4">
            <SectionHeader icon={Mail} title="Loại email tự gửi" desc="Bật/tắt từng loại email hệ thống dùng cấu hình ở trên" />
          </div>
          <div className="space-y-2 px-1 pb-2">
            <label className="flex items-start justify-between gap-4 rounded-xl border border-border bg-muted/30 p-3">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">Email đăng ký thành công</p>
                <p className="text-xs text-muted-foreground">Gửi email chào mừng khi có người đăng ký tài khoản mới.</p>
              </div>
              <input
                type="checkbox"
                checked={v("mail.send_welcome") !== "false"}
                onChange={(e) => set("mail.send_welcome", e.target.checked ? "true" : "false")}
                className="mt-1 size-4 cursor-pointer accent-primary"
              />
            </label>
            <label className="flex items-start justify-between gap-4 rounded-xl border border-border bg-muted/30 p-3">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">Email cho thông báo hệ thống</p>
                <p className="text-xs text-muted-foreground">Gửi kèm email mỗi khi tạo thông báo trong web (bình luận, huy hiệu…). Tắt để tránh nhiều email.</p>
              </div>
              <input
                type="checkbox"
                checked={v("mail.send_notifications") === "true"}
                onChange={(e) => set("mail.send_notifications", e.target.checked ? "true" : "false")}
                className="mt-1 size-4 cursor-pointer accent-primary"
              />
            </label>

            {/* Chi tiết theo loại thông báo — chỉ hiệu lực khi công tắc email thông báo ở trên bật */}
            <div className={cn("space-y-1 rounded-xl border border-dashed border-border p-3", v("mail.send_notifications") !== "true" && "opacity-50")}>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Bật/tắt riêng từng loại thông báo
              </p>
              {[
                ["mail.notify.user_follow", "Có người theo dõi bạn"],
                ["mail.notify.comment_reply", "Trả lời bình luận của bạn"],
                ["mail.notify.comment_approved", "Bình luận của bạn được duyệt"],
                ["mail.notify.forum_reply", "Trả lời bài diễn đàn của bạn"],
                ["mail.notify.rating_reply", "Phản hồi đánh giá của bạn"],
                ["mail.notify.achievement", "Nhận huy hiệu / thành tích"],
                ["mail.notify.wiki_approved", "Bài wiki của bạn được duyệt"],
                ["mail.notify.registration_approved", "Đăng ký giải đấu được duyệt"],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center justify-between gap-3 rounded-lg px-1 py-1">
                  <span className="text-xs text-foreground">{label}</span>
                  <input
                    type="checkbox"
                    disabled={v("mail.send_notifications") !== "true"}
                    checked={v(key) !== "false"}
                    onChange={(e) => set(key, e.target.checked ? "true" : "false")}
                    className="size-4 cursor-pointer accent-primary disabled:cursor-not-allowed"
                  />
                </label>
              ))}
            </div>

            <p className="px-1 pt-1 text-[11px] text-muted-foreground">
              Công tắc tổng phải bật thì các loại con mới gửi. Email quên mật khẩu &amp; mời admin luôn bật. Thêm loại mới: viết hàm trong <code className="font-mono">lib/server/email.ts</code>.
            </p>
          </div>
        </Card>

        <Card>
          <div className="py-4">
            <SectionHeader icon={Send} title="Kiểm tra gửi email" desc="Gửi 1 email thử để chắc SMTP/Gmail hoạt động" />
          </div>
          <div className="px-1 pb-2">
            <MailTestButton />
          </div>
        </Card>

        <Card>
          <div className="py-4">
            <SectionHeader icon={SendHorizonal} title="Gửi email thủ công" desc="Soạn & gửi email tuỳ ý tới người nhận bất kỳ, ngoài các loại tự động" />
          </div>
          <div className="px-1 pb-2">
            <ManualMailSender />
          </div>
        </Card>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-500" />
            <p className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Lưu ý</p>
          </div>
          <ul className="space-y-1 text-[11px] text-muted-foreground list-disc list-inside">
            <li>Thông tin SMTP được lưu trong Supabase settings — chỉ admin mới xem được.</li>
            <li>Gmail: Bật &quot;App Password&quot; tại myaccount.google.com → Bảo mật → Mật khẩu ứng dụng.</li>
            <li>Email hệ thống (quên mật khẩu, đăng ký, thông báo…) gửi trực tiếp qua SMTP ở trên — không phụ thuộc Supabase.</li>
            <li>Lưu cấu hình trước, rồi bấm &quot;Gửi thử&quot; để kiểm tra.</li>
          </ul>
        </div>

      </div>
    ),

    tms: (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl border border-border bg-muted p-2">
            <Trophy className="size-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Cài đặt Giải Đấu (TMS)</p>
            <p className="text-xs text-muted-foreground">
              Giới hạn lượt nộp kết quả miễn phí mỗi tuần và thông tin thanh toán khi vượt giới hạn.
            </p>
          </div>
        </div>

        <Card>
          <div className="py-4">
            <SectionHeader icon={Trophy} title="Hạn mức & Giá" desc="Cấu hình lượt miễn phí và phí nộp thêm" />
          </div>
          <Field label="Lượt miễn phí / tuần" hint="Số lần nộp kết quả miễn phí mỗi 7 ngày (mặc định: 4)" icon={Zap}>
            <Input
              type="number"
              min={1}
              max={100}
              value={v("tms.free_per_week")}
              onChange={(e) => set("tms.free_per_week", e.target.value)}
              placeholder="4"
              className="max-w-32 font-mono text-sm"
            />
          </Field>
          <Field label="Giá / lần nộp thêm" hint="VD: 10,000đ — hiển thị cho user khi hết lượt" icon={CreditCard}>
            <Input
              value={v("tms.payment_price")}
              onChange={(e) => set("tms.payment_price", e.target.value)}
              placeholder="10,000đ"
            />
          </Field>
        </Card>

        <Card>
          <div className="py-4">
            <SectionHeader icon={CreditCard} title="Thông tin thanh toán" desc="Hiển thị cho user khi hết lượt miễn phí" />
          </div>
          <Field label="Hướng dẫn / Số tài khoản" hint="Hiển thị dưới QR code" icon={MessageSquare}>
            <Textarea
              value={v("tms.payment_info")}
              onChange={(e) => set("tms.payment_info", e.target.value)}
              placeholder={"MB Bank: 0123456789\nTên: Nguyen Van A\nNội dung: [FF ID] nop ket qua"}
              rows={4}
              className="font-mono text-sm"
            />
            <SensitiveHint hint={sensitiveHint("tms.payment_info")} />
          </Field>
          <Field label="URL ảnh QR thanh toán" hint="Link ảnh QR chuyển khoản" icon={ImageIcon}>
            <Input
              value={v("tms.payment_qr_url")}
              onChange={(e) => set("tms.payment_qr_url", e.target.value)}
              placeholder="https://..."
            />
            {v("tms.payment_qr_url") && (
              <div className="mt-2">
                <img
                  src={v("tms.payment_qr_url")}
                  alt="QR preview"
                  className="max-w-[160px] rounded-xl border border-border"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            )}
          </Field>
        </Card>

      </div>
    ),

    // ── NỘI DUNG ─────────────────────────────────────────────────────────────
    content: (
      <div className="space-y-5">
        <Card>
          <div className="py-4">
            <SectionHeader icon={MessageSquare} title="Bình Luận" desc="Cấu hình hệ thống bình luận bài viết" />
          </div>
          <Field label="Bật bình luận" hint="Tắt để ẩn khung bình luận toàn bộ website">
            <div className="flex items-center gap-3">
              <Toggle
                checked={v("content.comments_enabled") !== "false"}
                onChange={(val) => set("content.comments_enabled", val ? "true" : "false")}
                label="Bật/tắt bình luận"
              />
              <span className={cn("text-sm font-semibold", v("content.comments_enabled") !== "false" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                {v("content.comments_enabled") !== "false" ? "Đang bật" : "Đang tắt"}
              </span>
            </div>
          </Field>
          <Field label="Yêu cầu đăng nhập" hint="Chỉ người dùng đã đăng nhập mới được bình luận">
            <div className="flex items-center gap-3">
              <Toggle
                checked={v("content.comments_require_login") === "true"}
                onChange={(val) => set("content.comments_require_login", val ? "true" : "false")}
                label="Yêu cầu đăng nhập"
              />
              <span className="text-sm text-muted-foreground">
                {v("content.comments_require_login") === "true" ? "Bắt buộc đăng nhập" : "Cho phép ẩn danh"}
              </span>
            </div>
          </Field>
          <Field label="Tự động duyệt" hint="Tắt để admin phải duyệt từng bình luận trước khi hiện">
            <div className="flex items-center gap-3">
              <Toggle
                checked={v("content.comments_auto_approve") !== "false"}
                onChange={(val) => set("content.comments_auto_approve", val ? "true" : "false")}
                label="Tự động duyệt"
              />
              <span className="text-sm text-muted-foreground">
                {v("content.comments_auto_approve") !== "false" ? "Hiện ngay sau khi gửi" : "Chờ admin duyệt"}
              </span>
            </div>
          </Field>
          <Field label="Giới hạn ký tự" hint="Tối đa ký tự cho 1 bình luận (mặc định: 1000)" icon={Hash}>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={50}
                max={5000}
                step={50}
                value={v("content.comments_max_length") || "1000"}
                onChange={(e) => set("content.comments_max_length", e.target.value)}
                className="max-w-32 font-mono"
              />
              <span className="text-xs text-muted-foreground">ký tự</span>
            </div>
          </Field>
        </Card>

        <Card>
          <div className="py-4">
            <SectionHeader icon={Newspaper} title="Bài Viết" desc="Phân trang và hiển thị danh sách tin tức" />
          </div>
          <Field label="Bài viết / trang" hint="Số bài mỗi trang trong trang /tin-tuc (mặc định: 12)" icon={Columns3}>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={4}
                max={60}
                step={4}
                value={v("content.news_per_page") || "12"}
                onChange={(e) => set("content.news_per_page", e.target.value)}
                className="max-w-32 font-mono"
              />
              <span className="text-xs text-muted-foreground">bài / trang</span>
            </div>
          </Field>
          <Field label="Bài nổi bật trang chủ" hint="Số bài viết nổi bật ở khu vực đầu trang chủ (mặc định: 3)" icon={Sparkles}>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={10}
                value={v("content.featured_count") || "3"}
                onChange={(e) => set("content.featured_count", e.target.value)}
                className="max-w-32 font-mono"
              />
              <span className="text-xs text-muted-foreground">bài</span>
            </div>
          </Field>
          <Field label="Hiển thị lượt xem" hint="Hiện số lượt xem dưới mỗi bài viết" icon={Eye}>
            <div className="flex items-center gap-3">
              <Toggle
                checked={v("content.show_view_count") !== "false"}
                onChange={(val) => set("content.show_view_count", val ? "true" : "false")}
                label="Hiện lượt xem"
              />
              <span className="text-sm text-muted-foreground">
                {v("content.show_view_count") !== "false" ? "Hiện" : "Ẩn"}
              </span>
            </div>
          </Field>
        </Card>
      </div>
    ),

    // ── NGƯỜI DÙNG ───────────────────────────────────────────────────────────
    users: (
      <div className="space-y-5">
        <Card>
          <div className="py-4">
            <SectionHeader icon={UserCog} title="Đăng Ký & Xác Thực" desc="Kiểm soát việc tạo tài khoản và xác thực email" />
          </div>
          <Field label="Cho phép đăng ký" hint="Tắt để ngừng tạo tài khoản mới (admin vẫn tạo được)">
            <div className="flex items-center gap-3">
              <Toggle
                checked={v("users.registration_enabled") !== "false"}
                onChange={(val) => set("users.registration_enabled", val ? "true" : "false")}
                label="Cho phép đăng ký"
              />
              <span className={cn("text-sm font-semibold", v("users.registration_enabled") !== "false" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                {v("users.registration_enabled") !== "false" ? "Mở đăng ký" : "Đóng đăng ký"}
              </span>
            </div>
          </Field>
          <Field label="Bắt buộc xác thực email" hint="Người dùng phải xác thực email trước khi đăng nhập">
            <div className="flex items-center gap-3">
              <Toggle
                checked={v("users.require_email_verification") === "true"}
                onChange={(val) => set("users.require_email_verification", val ? "true" : "false")}
                label="Yêu cầu xác thực email"
              />
              <span className="text-sm text-muted-foreground">
                {v("users.require_email_verification") === "true" ? "Bắt buộc" : "Không bắt buộc"}
              </span>
            </div>
          </Field>
          <Field label="Đăng nhập bằng Google" hint="Cho phép đăng nhập qua tài khoản Google (cần cấu hình OAuth trong Supabase)">
            <div className="flex items-center gap-3">
              <Toggle
                checked={v("users.google_login_enabled") !== "false"}
                onChange={(val) => set("users.google_login_enabled", val ? "true" : "false")}
                label="Đăng nhập Google"
              />
              <span className="text-sm text-muted-foreground">
                {v("users.google_login_enabled") !== "false" ? "Bật" : "Tắt"}
              </span>
            </div>
          </Field>
        </Card>

        <Card>
          <div className="py-4">
            <SectionHeader icon={User} title="Hồ Sơ Người Dùng" desc="Cài đặt mặc định cho tài khoản mới" />
          </div>
          <Field label="Avatar mặc định" hint="URL ảnh đại diện khi người dùng chưa cài ảnh" icon={ImageIcon}>
            <div className="space-y-2">
              <Input
                value={v("users.default_avatar_url")}
                onChange={(e) => set("users.default_avatar_url", e.target.value)}
                placeholder="https://..."
              />
              {v("users.default_avatar_url") && (
                <div className="flex items-center gap-3">
                  <img
                    src={v("users.default_avatar_url")}
                    alt="avatar preview"
                    className="size-10 rounded-full border border-border object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <span className="text-xs text-muted-foreground">Preview avatar mặc định</span>
                </div>
              )}
            </div>
          </Field>
          <Field label="Hồ sơ công khai" hint="Cho phép người dùng khác xem trang profile">
            <div className="flex items-center gap-3">
              <Toggle
                checked={v("users.public_profiles") !== "false"}
                onChange={(val) => set("users.public_profiles", val ? "true" : "false")}
                label="Hồ sơ công khai"
              />
              <span className="text-sm text-muted-foreground">
                {v("users.public_profiles") !== "false" ? "Công khai" : "Riêng tư"}
              </span>
            </div>
          </Field>
          <Field label="Cho phép đổi tên" hint="Người dùng có thể tự cập nhật tên hiển thị của mình">
            <div className="flex items-center gap-3">
              <Toggle
                checked={v("users.allow_display_name_change") !== "false"}
                onChange={(val) => set("users.allow_display_name_change", val ? "true" : "false")}
                label="Cho phép đổi tên"
              />
              <span className="text-sm text-muted-foreground">
                {v("users.allow_display_name_change") !== "false" ? "Được phép" : "Không được phép"}
              </span>
            </div>
          </Field>
        </Card>
      </div>
    ),

    // ── PUSH NOTIFICATION ────────────────────────────────────────────────────
    push: (
      <div className="space-y-5">
        <div className="flex items-center gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
            <Bell className="size-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Web Push Notifications</p>
            <p className="text-xs text-muted-foreground">
              Gửi thông báo trực tiếp đến trình duyệt người dùng kể cả khi họ không mở website. Cần VAPID keys từ{" "}
              <span className="font-mono text-primary">web-push-codelab.glitch.me</span>.
            </p>
          </div>
        </div>

        <Card>
          <div className="py-4">
            <SectionHeader icon={Bell} title="Cài Đặt Push" desc="Bật/tắt và cấu hình VAPID keys" />
          </div>
          <Field label="Bật Web Push" hint="Người dùng sẽ thấy hộp thoại xin phép nhận thông báo">
            <div className="flex items-center gap-3">
              <Toggle
                checked={v("push.enabled") === "true"}
                onChange={(val) => set("push.enabled", val ? "true" : "false")}
                label="Bật push notification"
              />
              <span className={cn("text-sm font-semibold", v("push.enabled") === "true" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                {v("push.enabled") === "true" ? "Đang bật" : "Đang tắt"}
              </span>
            </div>
          </Field>
          <Field label="VAPID Public Key" hint="Khóa công khai — an toàn để lộ" icon={ShieldCheck}>
            <Input
              value={v("push.vapid_public_key")}
              onChange={(e) => set("push.vapid_public_key", e.target.value)}
              placeholder="BNtx8..."
              className="font-mono text-xs"
            />
          </Field>
          <Field label="VAPID Private Key" hint="Khóa bí mật — không chia sẻ" icon={ShieldCheck}>
            <div className="space-y-2">
              <Input
                type="password"
                value={v("push.vapid_private_key")}
                onChange={(e) => set("push.vapid_private_key", e.target.value)}
                placeholder="••••••••••••••••"
                className="font-mono text-xs"
              />
              <SensitiveHint hint={sensitiveHint("push.vapid_private_key")} />
            </div>
          </Field>
          <Field label="VAPID Email" hint="Email liên lạc cho push service (phải bắt đầu bằng mailto:)" icon={Mail}>
            <Input
              value={v("push.vapid_email")}
              onChange={(e) => set("push.vapid_email", e.target.value)}
              placeholder="mailto:admin@arex.tech"
              className="font-mono text-xs"
            />
          </Field>
        </Card>

        <Card>
          <div className="py-4">
            <SectionHeader icon={BellRing} title="Nội Dung Mặc Định" desc="Icon và tiêu đề mặc định khi gửi push" />
          </div>
          <Field label="Tiêu đề mặc định" hint="Hiển thị làm tiêu đề thông báo nếu không truyền title" icon={Sparkles}>
            <Input
              value={v("push.default_title")}
              onChange={(e) => set("push.default_title", e.target.value)}
              placeholder="Arex Network"
              maxLength={80}
            />
          </Field>
          <Field label="URL icon thông báo" hint="Ảnh nhỏ hiện ở góc thông báo — nên 192×192 PNG" icon={ImageIcon}>
            <div className="space-y-2">
              <Input
                value={v("push.icon_url")}
                onChange={(e) => set("push.icon_url", e.target.value)}
                placeholder="https://.../icon-192.png"
              />
              {v("push.icon_url") && (
                <div className="flex items-center gap-3">
                  <img
                    src={v("push.icon_url")}
                    alt="push icon"
                    className="size-12 rounded-xl border border-border object-contain bg-muted"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <span className="text-xs text-muted-foreground">Icon preview (192×192)</span>
                </div>
              )}
            </div>
          </Field>
          <Field label="URL badge" hint="Icon nhỏ trên thanh thông báo Android — nên 72×72 PNG trắng" icon={ImageIcon}>
            <Input
              value={v("push.badge_url")}
              onChange={(e) => set("push.badge_url", e.target.value)}
              placeholder="https://.../badge-72.png"
            />
          </Field>
        </Card>

      </div>
    ),

    // ── LIVESTREAM ───────────────────────────────────────────────────────────
    streams: (
      <div className="space-y-5">
        <Card>
          <div className="py-4">
            <SectionHeader icon={Tv} title="YouTube Livestream" desc="Hiển thị stream đang phát và sắp diễn ra trên website" />
          </div>
          <Field label="YouTube Channel ID" hint="Lấy trong youtube.com/channel/UC... hoặc dùng @handle" icon={Youtube}>
            <div className="space-y-1">
              <Input
                value={v("streams.youtube_channel_id")}
                onChange={(e) => set("streams.youtube_channel_id", e.target.value)}
                placeholder="UCxxxxxxxxxxxxxxxxxxxxxxx hoặc @ArexNetwork"
                className="font-mono text-xs"
              />
              {v("streams.youtube_channel_id") && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="size-3.5" /> Đã cấu hình kênh YouTube
                </p>
              )}
            </div>
          </Field>
          <Field label="YouTube API Key" hint="Cần để fetch livestream tự động — nhạy cảm" icon={ShieldCheck}>
            <div className="space-y-2">
              <Input
                type="password"
                value={v("streams.youtube_api_key")}
                onChange={(e) => set("streams.youtube_api_key", e.target.value)}
                placeholder="AIza..."
                className="font-mono text-xs"
              />
              <SensitiveHint hint={sensitiveHint("streams.youtube_api_key")} />
              <p className="text-[11px] text-muted-foreground">Lấy tại <span className="font-mono text-primary">console.cloud.google.com</span> → YouTube Data API v3</p>
            </div>
          </Field>
          <Field label="Tự động ghim stream" hint="Ghim stream đang phát lên đầu trang chủ tự động">
            <div className="flex items-center gap-3">
              <Toggle
                checked={v("streams.auto_featured") !== "false"}
                onChange={(val) => set("streams.auto_featured", val ? "true" : "false")}
                label="Tự động ghim"
              />
              <span className="text-sm text-muted-foreground">
                {v("streams.auto_featured") !== "false" ? "Tự động" : "Thủ công"}
              </span>
            </div>
          </Field>
          <Field label="Hiện stream sắp tới" hint="Hiển thị scheduled livestream chưa phát">
            <div className="flex items-center gap-3">
              <Toggle
                checked={v("streams.show_upcoming") !== "false"}
                onChange={(val) => set("streams.show_upcoming", val ? "true" : "false")}
                label="Hiện stream sắp tới"
              />
              <span className="text-sm text-muted-foreground">
                {v("streams.show_upcoming") !== "false" ? "Hiện" : "Ẩn"}
              </span>
            </div>
          </Field>
          <Field label="Số stream hiển thị tối đa" hint="Giới hạn số card stream trên trang (mặc định: 4)" icon={MonitorPlay}>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={20}
                value={v("streams.max_displayed") || "4"}
                onChange={(e) => set("streams.max_displayed", e.target.value)}
                className="max-w-28 font-mono"
              />
              <span className="text-xs text-muted-foreground">stream</span>
            </div>
          </Field>
        </Card>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="size-3.5" /> Lấy Channel ID
          </p>
          <ol className="space-y-1 text-[11px] text-muted-foreground list-decimal list-inside">
            <li>Vào trang YouTube channel của bạn</li>
            <li>Click vào &quot;...&quot; → Chia sẻ kênh → Copy link</li>
            <li>Hoặc dùng <span className="font-mono">commentpicker.com/youtube-channel-id</span> để tìm nhanh</li>
            <li>Dán ID dạng <span className="font-mono">UCxxxxxxxx...</span> hoặc handle <span className="font-mono">@ArexNetwork</span></li>
          </ol>
        </div>

      </div>
    ),

    // ── GIAO DIỆN ────────────────────────────────────────────────────────────
    appearance: (
      <div className="space-y-5">
        <Card>
          <div className="py-4">
            <SectionHeader icon={Paintbrush} title="Màu Sắc" desc="Màu chủ đạo và chế độ sáng/tối mặc định" />
          </div>
          <Field label="Màu primary" hint="Màu accent chính — hex code (VD: #f97316 = cam)" icon={Paintbrush}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="color"
                  value={v("appearance.primary_color") || "#f97316"}
                  onChange={(e) => set("appearance.primary_color", e.target.value)}
                  className="size-10 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
                />
              </div>
              <Input
                value={v("appearance.primary_color") || "#f97316"}
                onChange={(e) => set("appearance.primary_color", e.target.value)}
                placeholder="#f97316"
                className="max-w-36 font-mono text-sm"
                maxLength={7}
              />
              {v("appearance.primary_color") && (
                <div className="size-8 rounded-lg border border-border shadow-sm" style={{ backgroundColor: v("appearance.primary_color") }} />
              )}
            </div>
          </Field>
          <Field label="Chế độ màu mặc định" hint="Theme mặc định khi người dùng chưa chọn" icon={Paintbrush}>
            <Select
              value={v("appearance.default_theme") || "system"}
              onValueChange={(val) => set("appearance.default_theme", val ?? "system")}
            >
              <SelectTrigger className="max-w-44">
                <SelectValue placeholder="Chọn chế độ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">Theo hệ thống</SelectItem>
                <SelectItem value="light">Sáng (Light)</SelectItem>
                <SelectItem value="dark">Tối (Dark)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </Card>

        <Card>
          <div className="py-4">
            <SectionHeader icon={LayoutGrid} title="Kiểu Hiển Thị" desc="Card style và mật độ thông tin" />
          </div>
          <Field label="Kiểu card bài viết" hint="Ảnh hưởng trang /tin-tuc và các danh sách bài viết" icon={LayoutGrid}>
            <Select
              value={v("appearance.card_style") || "default"}
              onValueChange={(val) => set("appearance.card_style", val ?? "default")}
            >
              <SelectTrigger className="max-w-48">
                <SelectValue placeholder="Chọn kiểu card" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">
                  <span className="font-medium">Mặc định</span>
                  <span className="ml-2 text-xs text-muted-foreground">Ảnh lớn + tóm tắt</span>
                </SelectItem>
                <SelectItem value="compact">
                  <span className="font-medium">Compact</span>
                  <span className="ml-2 text-xs text-muted-foreground">Ảnh nhỏ + tiêu đề</span>
                </SelectItem>
                <SelectItem value="minimal">
                  <span className="font-medium">Minimal</span>
                  <span className="ml-2 text-xs text-muted-foreground">Chỉ tiêu đề + ngày</span>
                </SelectItem>
                <SelectItem value="magazine">
                  <span className="font-medium">Magazine</span>
                  <span className="ml-2 text-xs text-muted-foreground">Grid không đều</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Hiển thị số lượt xem trên card" hint="Hiện icon 👁 + số view ở góc card">
            <div className="flex items-center gap-3">
              <Toggle
                checked={v("appearance.card_show_views") !== "false"}
                onChange={(val) => set("appearance.card_show_views", val ? "true" : "false")}
                label="Hiện lượt xem trên card"
              />
              <span className="text-sm text-muted-foreground">
                {v("appearance.card_show_views") !== "false" ? "Hiện" : "Ẩn"}
              </span>
            </div>
          </Field>
          <Field label="Hiển thị badge danh mục" hint="Hiện label danh mục (VD: Sự Kiện, Cập Nhật...) trên card">
            <div className="flex items-center gap-3">
              <Toggle
                checked={v("appearance.card_show_category") !== "false"}
                onChange={(val) => set("appearance.card_show_category", val ? "true" : "false")}
                label="Hiện badge danh mục"
              />
              <span className="text-sm text-muted-foreground">
                {v("appearance.card_show_category") !== "false" ? "Hiện" : "Ẩn"}
              </span>
            </div>
          </Field>
          <Field label="Hiển thị tác giả" hint="Hiện tên tác giả ở dưới tiêu đề bài viết">
            <div className="flex items-center gap-3">
              <Toggle
                checked={v("appearance.show_author") !== "false"}
                onChange={(val) => set("appearance.show_author", val ? "true" : "false")}
                label="Hiện tác giả"
              />
              <span className="text-sm text-muted-foreground">
                {v("appearance.show_author") !== "false" ? "Hiện" : "Ẩn"}
              </span>
            </div>
          </Field>
        </Card>
      </div>
    ),
  };

  // ── Layout ────────────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[224px_1fr] lg:items-start gap-5 lg:gap-6">

      {/* ── Sidebar nav (desktop) / Scroll nav (mobile) ── */}
      <nav className="lg:sticky lg:top-6 lg:w-56 lg:shrink-0">
        {/* Mobile: horizontal scroll */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none lg:hidden">
          {Object.values(NAV_GROUPS).flat().map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActive(id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-all whitespace-nowrap",
                  active === id
                    ? "bg-primary text-primary-foreground shadow"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
        </div>

        {/* Desktop: vertical list */}
        <div className="hidden lg:flex lg:flex-col lg:gap-4">
          {Object.entries(NAV_GROUPS).map(([groupName, items]) => (
            <div key={groupName} className="space-y-0.5">
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/60">
                {groupName}
              </p>
              {items.map(({ id, icon: Icon, label, desc }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActive(id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all",
                    active === id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    id === "maintenance" && maintenanceOn && active !== id && "text-amber-500",
                  )}
                >
                  <div className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                    active === id ? "bg-primary/15" : "bg-muted",
                    id === "maintenance" && maintenanceOn && active !== id && "bg-amber-500/10",
                  )}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide leading-tight">{label}</p>
                    <p className="text-[10px] leading-tight opacity-60 truncate">{desc}</p>
                  </div>
                  {id === "maintenance" && maintenanceOn && (
                    <span className="ml-auto shrink-0 size-1.5 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </nav>

      {/* ── Content ── */}
      <div className="min-w-0 flex-1 space-y-4">
        {autoSaveStatus !== "idle" && (
          <div className={cn(
            "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all",
            autoSaveStatus === "saving"
              ? "border-amber-400/30 bg-amber-400/10 text-amber-600 dark:text-amber-400"
              : "border-green-400/30 bg-green-400/10 text-green-600 dark:text-green-400",
          )}>
            {autoSaveStatus === "saving" ? (
              <><Loader2 className="size-3.5 animate-spin" /> Đang tự động lưu...</>
            ) : (
              <><CheckCircle2 className="size-3.5" /> Đã tự động lưu</>
            )}
          </div>
        )}
        {sections[active]}
      </div>
    </div>
  );
}
