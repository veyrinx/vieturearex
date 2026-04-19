"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Eye, EyeOff, ShieldCheck, Palette, Search, Home, Share2, Plug,
  User, Facebook, Youtube, Mail, Save, ImageIcon, Clock, Sparkles,
  Globe, BarChart3, MonitorPlay, LayoutGrid, Newspaper, Wrench,
  AlertTriangle, CheckCircle2, MessageSquare, BellRing, Users, Calendar,
} from "lucide-react";
import type { SiteSetting } from "@/lib/types/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { defaultSiteSettingValues, getSettingsFormInitialState } from "@/lib/utils/site-settings";

// ─── Types ──────────────────────────────────────────────────────────────────

type SettingsFormProps = { settings: SiteSetting[]; onSaved: () => Promise<void> };

// ─── Nav config ─────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "account",      icon: User,         label: "Tài Khoản",   desc: "Hồ sơ & mật khẩu" },
  { id: "branding",     icon: Palette,      label: "Thương Hiệu", desc: "Tên, logo, favicon" },
  { id: "seo",          icon: Search,       label: "SEO",         desc: "Tiêu đề & mô tả" },
  { id: "home",         icon: Home,         label: "Trang Chủ",   desc: "Hero & slider" },
  { id: "social",       icon: Share2,       label: "Mạng Xã Hội", desc: "Facebook, YouTube…" },
  { id: "community",    icon: Users,        label: "Cộng Đồng",   desc: "Thống kê & ngày ra mắt" },
  { id: "ads",          icon: BarChart3,    label: "Quảng Cáo",   desc: "Google AdSense" },
  { id: "integrations", icon: Plug,         label: "Tích Hợp",    desc: "Zalo, Discord" },
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

export function SettingsForm({ settings, onSaved }: SettingsFormProps) {
  const [active, setActive] = useState<SectionId>("account");
  const [state, setState] = useState<Record<string, string>>(() => getSettingsFormInitialState(settings));
  const [saving, setSaving] = useState<string | null>(null);

  // Account state
  const [profile, setProfile] = useState<{ email: string; display_name: string; role: string } | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

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

  const v = (key: string) => state[key] ?? defaultSiteSettingValues[key] ?? "";
  const set = (key: string, value: string) => setState((p) => ({ ...p, [key]: value }));
  const setSlot = (key: string, i: number, value: string) => setState((p) => {
    const slots = getSlots(p[key] ?? "");
    slots[i] = value;
    return { ...p, [key]: slots.join("\n") };
  });

  const save = async (keys: string[], section: string) => {
    setSaving(section);
    try {
      const results = await Promise.all(keys.map(async (k) => {
        try {
          const r = await fetch("/api/admin/settings", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: k, value: v(k) }),
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
        </div>
        <SaveRow
          onSave={() => save(["home.hero.title", "home.background.transition_effect", "home.background.interval_seconds", "home.background.transition_seconds", "home.background.desktop_urls", "home.background.mobile_urls"], "home")}
          saving={saving === "home"}
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
              {v("ads.google_adsense_id") && (
                <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5" /> Script AdSense sẽ được inject tự động vào toàn bộ trang.
                </p>
              )}
            </div>
          </Field>
          <Field label="Slot Header" hint="Banner đầu trang (970×90)" icon={MonitorPlay}>
            <Input value={v("ads.slot_header")} onChange={(e) => set("ads.slot_header", e.target.value)} placeholder="1234567890" className="font-mono" />
          </Field>
          <Field label="Slot Sidebar" hint="Banner cột bên (300×250)" icon={LayoutGrid}>
            <Input value={v("ads.slot_sidebar")} onChange={(e) => set("ads.slot_sidebar", e.target.value)} placeholder="1234567890" className="font-mono" />
          </Field>
          <Field label="Slot In-Article" hint="Quảng cáo trong bài viết" icon={Newspaper}>
            <Input value={v("ads.slot_article")} onChange={(e) => set("ads.slot_article", e.target.value)} placeholder="1234567890" className="font-mono" />
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
          </Field>
          <Field label="Zalo Group ID" hint="ID nhóm nhận thông báo">
            <Input value={v("zalo.group_id")} onChange={(e) => set("zalo.group_id", e.target.value)} placeholder="0123456789" />
          </Field>
        </Card>

        <Card>
          <div className="py-4">
            <SectionHeader icon={BellRing} title="Discord" desc="Gửi thông báo vào kênh Discord" />
          </div>
          <Field label="Webhook URL" hint="Tạo trong Server Settings → Integrations">
            <div className="space-y-2">
              <Input value={v("site.discord_webhook")} onChange={(e) => set("site.discord_webhook", e.target.value)} placeholder="https://discord.com/api/webhooks/..." />
              {v("site.discord_webhook") && (
                <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5" /> Thông báo sẽ được gửi khi có bài viết mới.
                </p>
              )}
            </div>
          </Field>
        </Card>
        <SaveRow onSave={() => save(["zalo.webhook_url", "zalo.group_id", "site.discord_webhook"], "integrations")} saving={saving === "integrations"} />
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
          </Field>
          <Field label="SMTP Port" hint="Thường là 587 (TLS) hoặc 465 (SSL)" icon={Plug}>
            <Input value={v("mail.smtp_port")} onChange={(e) => set("mail.smtp_port", e.target.value)} placeholder="587" className="font-mono text-sm max-w-32" />
          </Field>
          <Field label="SMTP Username" hint="Thường là địa chỉ email" icon={User}>
            <Input value={v("mail.smtp_user")} onChange={(e) => set("mail.smtp_user", e.target.value)} placeholder="no-reply@arex.tech" className="font-mono text-sm" />
          </Field>
          <Field label="SMTP Password" hint="Mật khẩu ứng dụng (App Password)" icon={ShieldCheck}>
            <Input type="password" value={v("mail.smtp_pass")} onChange={(e) => set("mail.smtp_pass", e.target.value)} placeholder="••••••••••••••••" className="font-mono text-sm" />
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
