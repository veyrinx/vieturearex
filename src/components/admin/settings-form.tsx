"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Eye, EyeOff, ShieldCheck, Palette, Search, Home, Share2, Plug,
  User, Facebook, Youtube, Mail, Save, ImageIcon, Clock, Sparkles,
  Globe, BarChart3, MonitorPlay, LayoutGrid, Newspaper, Wrench,
  AlertTriangle, CheckCircle2, MessageSquare, BellRing, Users, Calendar, Trophy, Zap, CreditCard, SendHorizonal, Loader2,
} from "lucide-react";
import type { SiteSetting } from "@/lib/types/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { defaultSiteSettingValues, defaultIscSettingValues, getConfiguredSensitiveKeys, getSettingsFormInitialState, SENSITIVE_FORM_KEYS, SITE_SPECIFIC_SETTING_KEYS } from "@/lib/utils/site-settings";

// ─── Types ──────────────────────────────────────────────────────────────────

type SettingsFormProps = { settings: SiteSetting[]; onSaved: () => Promise<void>; siteId?: "arex" | "isc" };

// ─── Nav config ─────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "account",      icon: User,         label: "Tài Khoản",   desc: "Hồ sơ & mật khẩu" },
  { id: "branding",     icon: Palette,      label: "Thương Hiệu", desc: "Tên, logo, favicon" },
  { id: "seo",          icon: Search,       label: "SEO",         desc: "Tiêu đề & mô tả" },
  { id: "home",         icon: Home,         label: "Trang Chủ",   desc: "Hero & slider" },
  { id: "social",       icon: Share2,       label: "Mạng Xã Hội", desc: "Facebook, YouTube…" },
  { id: "community",    icon: Users,        label: "Cộng Đồng",   desc: "Thống kê & ngày ra mắt" },
  { id: "ads",          icon: BarChart3,    label: "Quảng Cáo",   desc: "Google AdSense" },
  { id: "event_servers", icon: Globe,       label: "Server",      desc: "Server sự kiện tuỳ chỉnh" },
  { id: "team_join",    icon: Users,        label: "Team Join",   desc: "Form mời gia nhập" },
  { id: "integrations", icon: Plug,         label: "Tích Hợp",    desc: "Zalo, Discord, Lark, Telegram, AI" },
  { id: "tms",          icon: Trophy,       label: "Giải Đấu",    desc: "Quota & thanh toán TMS" },
  { id: "mail",         icon: Mail,         label: "Email",        desc: "Cấu hình SMTP" },
  { id: "maintenance",  icon: Wrench,       label: "Bảo Trì",     desc: "Chế độ bảo trì" },
] as const;

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
    <div className={cn("glass-card divide-y divide-border rounded-2xl border border-border/50 bg-card/50 px-5 shadow-sm", className)}>
      {children}
    </div>
  );
}

function SaveRow({ onSave, saving }: { onSave: () => void; saving: boolean }) {
  return (
    <div className="flex justify-end pt-4">
      <Button type="button" size="sm" disabled={saving} onClick={onSave} className="gap-1.5 rounded-xl px-5">
        <Save className="size-3.5" />
        {saving ? "Đang lưu..." : "Lưu thay đổi"}
      </Button>
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

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.74a4.85 4.85 0 0 1-1.01-.05z" />
    </svg>
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

function getSlots(value: string) {
  const s = value.split(/\r?\n/);
  return Array.from({ length: 3 }, (_, i) => s[i] ?? "");
}

// ─── Main component ──────────────────────────────────────────────────────────

export function SettingsForm({ settings, onSaved, siteId = "arex" }: SettingsFormProps) {
  const [active, setActive] = useState<SectionId>("account");
  const [state, setState] = useState<Record<string, string>>(() => getSettingsFormInitialState(settings));
  const [saving, setSaving] = useState<string | null>(null);
  const [configuredKeys] = useState<Set<string>>(() => getConfiguredSensitiveKeys(settings));

  // Returns the storage key for a setting — ISC site-specific keys get "isc:" prefix
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
  const set = (key: string, value: string) => setState((p) => ({ ...p, [pk(key)]: value }));
  const setSlot = (key: string, i: number, value: string) => setState((p) => {
    const slots = getSlots(p[pk(key)] ?? "");
    slots[i] = value;
    return { ...p, [pk(key)]: slots.join("\n") };
  });

  const sensitiveHint = (key: string) =>
    SENSITIVE_FORM_KEYS.has(key) && configuredKeys.has(key) && !v(key)
      ? "đã lưu — để trống để giữ nguyên"
      : null;

  const save = async (keys: string[], section: string) => {
    setSaving(section);
    try {
      const results = await Promise.all(keys.map(async (k) => {
        if (SENSITIVE_FORM_KEYS.has(k) && !v(k)) return true;
        try {
          const r = await fetch("/api/admin/settings", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: pk(k), value: v(k) }),
          });
          if (!r.ok) {
            const body = (await r.json().catch(() => null)) as { error?: string } | null;
            return body?.error ?? "Lỗi không xác định.";
          }
          return true;
        } catch {
          return "Lỗi mạng.";
        }
      }));
      const errors = results.filter((r): r is string => typeof r === "string");
      if (errors.length === 0) { toast.success("Đã lưu thay đổi."); await onSaved(); }
      else toast.error(errors[0]);
    } finally {
      setSaving(null);
    }
  };

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
                <div className="flex items-center gap-3 rounded-xl bg-white border border-gray-100 px-3 py-2">
                  <Image src={v("branding.logo_light_url")} alt="" width={36} height={36} className="rounded object-contain" unoptimized />
                  <span className="text-xs text-gray-400">Light preview</span>
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
        <SaveRow onSave={() => save(["branding.site_name", "branding.favicon_url", "branding.logo_light_url", "branding.logo_dark_url"], "branding")} saving={saving === "branding"} />
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
        <SaveRow onSave={() => save(["seo.default_title", "seo.default_description"], "seo")} saving={saving === "seo"} />
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

        <div className="glass-card rounded-2xl p-5 space-y-5">
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
        <SaveRow
          onSave={() => save([
            "home.hero.title", "home.background.transition_effect", "home.background.interval_seconds",
            "home.background.transition_seconds", "home.background.desktop_urls", "home.background.mobile_urls",
            "home.events_bg.image_url", "home.events_bg.video_url", "home.events_bg.caption",
          ], "home")}
          saving={saving === "home"}
        />
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
        <SaveRow
          onSave={() => save(["events.custom_servers", "events.hidden_servers", "events.server_logos"], "event_servers")}
          saving={saving === "event_servers"}
        />
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
              <TikTokIcon className="size-3.5 shrink-0 text-muted-foreground" />
              <Input value={v("social.tiktok_url")} onChange={(e) => set("social.tiktok_url", e.target.value)} placeholder="https://tiktok.com/@..." />
            </div>
          </Field>
          <Field label="YouTube" icon={Youtube}>
            <Input value={v("social.youtube_url")} onChange={(e) => set("social.youtube_url", e.target.value)} placeholder="https://youtube.com/@..." />
          </Field>
          <Field label="Email liên hệ" icon={Mail}>
            <Input type="email" value={v("social.email")} onChange={(e) => set("social.email", e.target.value)} placeholder="admin@arex.tech" />
          </Field>
        </Card>
        <SaveRow onSave={() => save(["social.facebook_url", "social.tiktok_url", "social.youtube_url", "social.email"], "social")} saving={saving === "social"} />
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

          <SaveRow
            onSave={() => save(["community.launch_date", "community.facebook_members", "community.youtube_subscribers", "community.tiktok_followers", "community.zalo_members"], "community")}
            saving={saving === "community"}
          />
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
          <Field label="Slot In-Article" hint="Quảng cáo trong bài viết" icon={Newspaper}>
            <Input value={v("ads.slot_article")} onChange={(e) => set("ads.slot_article", e.target.value)} placeholder="1234567890" className="font-mono" />
            <SensitiveHint hint={sensitiveHint("ads.slot_article")} />
          </Field>

          <div className="py-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Trạng thái vị trí quảng cáo</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Header Banner", icon: MonitorPlay, size: "970×90",    key: "ads.slot_header" },
                { label: "Sidebar Box",   icon: LayoutGrid,  size: "300×250",   key: "ads.slot_sidebar" },
                { label: "In-Article",    icon: Newspaper,   size: "Responsive", key: "ads.slot_article" },
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
        <SaveRow onSave={() => save(["ads.google_adsense_id", "ads.slot_header", "ads.slot_sidebar", "ads.slot_article"], "ads")} saving={saving === "ads"} />

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
        <SaveRow
          onSave={() => save(
            ["home.ads.left.image_url", "home.ads.left.link_url", "home.ads.right.image_url", "home.ads.right.link_url"],
            "home-ads",
          )}
          saving={saving === "home-ads"}
        />
      </div>
    ),

    // ── TEAM JOIN ────────────────────────────────────────────────────────────
    team_join: (
      <div className="space-y-5">
        <Card>
          <div className="py-4">
            <SectionHeader icon={Users} title="Form mời gia nhập team" desc="Tuỳ chỉnh nội dung trang /team-join/[token]" />
          </div>
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
        <SaveRow
          onSave={() => save([
            "team_join.title",
            "team_join.subtitle",
            "team_join.success_message",
            "team_join.terms_text",
            "team_join.violation_text",
            "team_join.role_options",
            "team_join.note_max_length",
            "team_join.require_phone",
            "team_join.show_socials",
          ], "team_join")}
          saving={saving === "team_join"}
        />
      </div>
    ),

    // ── TÍCH HỢP ─────────────────────────────────────────────────────────────
    integrations: (
      <div className="space-y-5">
        <Card>
          <div className="py-4">
            <SectionHeader icon={Plug} title="Zalo" desc="Tích hợp thông báo qua Zalo OA" />
          </div>
          <Field label="Zalo Webhook" hint="Gửi thông báo bài mới">
            <Input value={v("zalo.webhook_url")} onChange={(e) => set("zalo.webhook_url", e.target.value)} placeholder="https://..." />
            <SensitiveHint hint={sensitiveHint("zalo.webhook_url")} />
          </Field>
          <Field label="Zalo Group ID" hint="ID nhóm nhận thông báo">
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
          <Field label="Bật báo cáo ngày qua Discord" hint="Gửi cùng lúc Telegram + Lark lúc 07:00 ICT">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={v("integrations.discord_daily_report") === "true"}
                onChange={(e) => set("integrations.discord_daily_report", e.target.checked ? "true" : "false")}
                className="size-4 cursor-pointer accent-primary"
              />
              <span className="text-xs text-muted-foreground">Mặc định tắt. Bật để nhận báo cáo ngày trên Discord.</span>
            </label>
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
          <Field label="Bật báo cáo lượt xem hằng ngày" hint="Cron 08:00 sáng giờ VN" icon={Plug}>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={v("integrations.lark_daily_report") !== "false"}
                onChange={(e) => set("integrations.lark_daily_report", e.target.checked ? "true" : "false")}
                className="size-4 cursor-pointer accent-primary"
              />
              <span className="text-xs text-muted-foreground">Mặc định bật. Tắt nếu không muốn nhận.</span>
            </label>
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
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cột dữ liệu sẽ được ghi</p>
            <div className="flex flex-wrap gap-2">
              {[
                { col: "A", label: "Thời gian đăng ký" },
                { col: "B", label: "Email" },
                { col: "C", label: "Tên hiển thị" },
                { col: "D", label: "Vai trò (role)" },
                { col: "E", label: "FF ID" },
              ].map(({ col, label }) => (
                <div key={col} className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5">
                  <span className="font-mono text-[11px] font-black text-primary">{col}</span>
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
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
          <Field label="Bật báo cáo hằng ngày qua Telegram" hint="Cùng schedule với Lark — 08:00 sáng giờ VN" icon={Plug}>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={v("integrations.telegram_daily_report") !== "false"}
                onChange={(e) => set("integrations.telegram_daily_report", e.target.checked ? "true" : "false")}
                className="size-4 cursor-pointer accent-primary"
              />
              <span className="text-xs text-muted-foreground">Mặc định bật. Tắt nếu không muốn nhận.</span>
            </label>
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
                <SelectItem value="4">Mỗi 4 giờ</SelectItem>
                <SelectItem value="6">Mỗi 6 giờ</SelectItem>
                <SelectItem value="8">Mỗi 8 giờ</SelectItem>
                <SelectItem value="12">Mỗi 12 giờ</SelectItem>
                <SelectItem value="24">Hằng ngày (vào giờ đã chọn)</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {(() => {
            const hour = parseInt(v("integrations.report_schedule_hour") || "8");
            const interval = parseInt(v("integrations.report_schedule_interval") || "24");
            const fmtH = (h: number) => `${String(h % 24).padStart(2, "0")}:00`;
            let preview = "";
            if (interval >= 24) {
              preview = `Gửi lúc ${fmtH(hour)} ICT mỗi ngày`;
            } else if (interval <= 1) {
              preview = "Gửi mỗi giờ";
            } else {
              const times = Array.from({ length: Math.floor(24 / interval) }, (_, i) => fmtH((hour % interval) + i * interval));
              preview = `Gửi lúc ${times.join(", ")} ICT`;
            }
            return (
              <div className="py-3">
                <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
                  <Clock className="size-4 text-primary shrink-0" />
                  <p className="text-xs font-medium text-primary">{preview}</p>
                </div>
              </div>
            );
          })()}
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

          <Field label="Anthropic API Key" hint="Dùng key riêng thay vì biến môi trường ANTHROPIC_API_KEY — nhạy cảm" icon={Plug}>
            <div className="space-y-2">
              <Input
                value={v("integrations.ai_api_key")}
                onChange={(e) => set("integrations.ai_api_key", e.target.value)}
                placeholder="sk-ant-api03-..."
                className="font-mono text-xs"
                type="password"
              />
              <SensitiveHint hint={sensitiveHint("integrations.ai_api_key")} />
              <p className="text-[11px] text-muted-foreground">
                Để trống → dùng <code className="font-mono">ANTHROPIC_API_KEY</code> từ môi trường Vercel/server. Lấy key tại{" "}
                <span className="font-mono text-primary">console.anthropic.com</span>.
              </p>
            </div>
          </Field>
        </Card>

        <SaveRow
          onSave={() => save(
            [
              "zalo.webhook_url", "zalo.group_id",
              "integrations.lark_webhook_url",
              "integrations.lark_alerts_webhook_url",
              "integrations.lark_bot_name",
              "integrations.lark_daily_report",
              "integrations.lark_app_id",
              "integrations.lark_app_secret",
              "integrations.lark_sheet_token",
              "integrations.lark_sheet_name",
              "integrations.discord_internal_webhook",
              "integrations.discord_public_webhook",
              "integrations.discord_daily_report",
              "integrations.report_schedule_hour",
              "integrations.report_schedule_interval",
              "integrations.telegram_bot_token",
              "integrations.telegram_chat_id",
              "integrations.telegram_daily_report",
              "integrations.telegram_user_bot_token",
              "integrations.telegram_user_chat_id",
              "integrations.ai_auto_reply",
              "integrations.ai_bot_name",
              "integrations.ai_system_prompt",
              "integrations.ai_api_key",
            ],
            "integrations",
          )}
          saving={saving === "integrations"}
        />
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

        <SaveRow
          onSave={() => save(["site.maintenance_mode", "site.maintenance_message", "site.maintenance_end_time"], "maintenance")}
          saving={saving === "maintenance"}
        />

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

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-500" />
            <p className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Lưu ý</p>
          </div>
          <ul className="space-y-1 text-[11px] text-muted-foreground list-disc list-inside">
            <li>Thông tin SMTP được lưu trong Supabase settings — chỉ admin mới xem được.</li>
            <li>Gmail: Bật &quot;App Password&quot; tại myaccount.google.com → Bảo mật → Mật khẩu ứng dụng.</li>
            <li>Để xác thực email hoạt động, cấu hình SMTP trong Supabase Dashboard → Authentication → Email.</li>
            <li>Supabase tự xử lý email gửi đi — cài đặt này chỉ để tham chiếu hoặc dùng cho API tự gửi.</li>
          </ul>
        </div>

        <SaveRow onSave={() => save(["mail.smtp_host", "mail.smtp_port", "mail.smtp_user", "mail.smtp_pass", "mail.from_name", "mail.from_email"], "mail")} saving={saving === "mail"} />
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

        <SaveRow onSave={() => save(["tms.free_per_week", "tms.payment_price", "tms.payment_info", "tms.payment_qr_url"], "tms")} saving={saving === "tms"} />
      </div>
    ),
  };

  // ── Layout ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-6">

      {/* ── Sidebar nav (desktop) / Scroll nav (mobile) ── */}
      <nav className="lg:sticky lg:top-6 lg:w-56 lg:shrink-0">
        {/* Mobile: horizontal scroll */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none lg:hidden">
          {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
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
        <div className="hidden lg:flex lg:flex-col lg:gap-0.5">
          {NAV_ITEMS.map(({ id, icon: Icon, label, desc }) => (
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
      </nav>

      {/* ── Content ── */}
      <div className="min-w-0 flex-1">
        {sections[active]}
      </div>
    </div>
  );
}
