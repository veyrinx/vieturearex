"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Eye, EyeOff, ShieldCheck, Palette, Search, Home, Share2,
  Plug, User, Facebook, Youtube, Mail, Save, ImageIcon, Clock,
  Sparkles, Globe, BarChart3, MonitorPlay, LayoutGrid, Newspaper,
} from "lucide-react";
import type { SiteSetting } from "@/lib/types/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import {
  defaultSiteSettingValues,
  getSettingsFormInitialState,
} from "@/lib/utils/site-settings";

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  super_admin: { label: "Super Admin", color: "bg-red-500/10 text-red-500 border-red-500/20" },
  admin: { label: "Admin", color: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  manager: { label: "Manager", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  support: { label: "Support", color: "bg-green-500/10 text-green-500 border-green-500/20" },
  user: { label: "User", color: "bg-muted text-muted-foreground border-border" },
};

const sliderEffects = [
  { value: "fade", label: "Fade", desc: "Mờ dần mượt mà" },
  { value: "zoom", label: "Zoom Cinematic", desc: "Phóng to nhẹ" },
  { value: "slide", label: "Slide Smooth", desc: "Trượt ngang" },
  { value: "drift", label: "Drift Parallax", desc: "Parallax 3D" },
  { value: "cinematic", label: "Cinematic Blur", desc: "Mờ điện ảnh" },
] as const;

type SettingsFormProps = {
  settings: SiteSetting[];
  onSaved: () => Promise<void>;
};

function getSlots(value: string) {
  const s = value.split(/\r?\n/);
  return Array.from({ length: 3 }, (_, i) => s[i] ?? "");
}

function SectionHeader({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc?: string }) {
  return (
    <div className="flex items-center gap-3 pb-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <div>
        <p className="font-heading text-sm font-bold uppercase tracking-[0.1em] text-foreground">{title}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
    </div>
  );
}

function Field({ label, hint, children, icon: Icon }: {
  label: string; hint?: string; children: React.ReactNode; icon?: React.ElementType;
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-start gap-4 py-3 sm:grid-cols-[180px_1fr]">
      <div className="pt-2.5 flex items-center gap-1.5">
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

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass-card divide-y divide-border rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm px-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder, show, onToggle }: {
  value: string; onChange: (v: string) => void; placeholder: string;
  show: boolean; onToggle: () => void;
}) {
  const strength = value.length === 0 ? 0 : value.length < 8 ? 1 : value.length < 12 ? 2 : 3;
  const colors = ["", "bg-red-500", "bg-yellow-500", "bg-green-500"];
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-10"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {value.length > 0 && (
        <div className="flex gap-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? colors[strength] : "bg-border"}`} />
          ))}
        </div>
      )}
    </div>
  );
}

function SaveRow({ onSave, saving }: { onSave: () => void; saving: boolean }) {
  return (
    <div className="flex items-center justify-end gap-3 pt-2">
      <Button type="button" size="sm" disabled={saving} onClick={onSave} className="gap-1.5 rounded-xl px-5">
        <Save className="size-3.5" />
        {saving ? "Đang lưu..." : "Lưu thay đổi"}
      </Button>
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

export function SettingsForm({ settings, onSaved }: SettingsFormProps) {
  const [state, setState] = useState<Record<string, string>>(() => getSettingsFormInitialState(settings));
  const [saving, setSaving] = useState<string | null>(null);

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
      const { data: row } = (await supabase.from("users").select("display_name, role").eq("id", data.user.id).maybeSingle()) as { data: ProfileRow | null; error: unknown };
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
    const ok = await Promise.all(keys.map(async (k) => {
      const r = await fetch("/api/admin/settings", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: k, value: v(k) }),
      });
      return r.ok;
    }));
    setSaving(null);
    if (ok.every(Boolean)) { toast.success("Đã lưu."); await onSaved(); }
    else toast.error("Lưu thất bại.");
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    const r = await fetch("/api/admin/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: displayName }),
    });
    setSavingProfile(false);
    if (!r.ok) { toast.error("Lưu thất bại."); return; }
    setProfile((p) => p ? { ...p, display_name: displayName } : p);
    toast.success("Đã cập nhật.");
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

  return (
    <Tabs defaultValue="branding" className="space-y-5">
      {/* ── Tab Bar ── */}
      <TabsList className="flex h-auto w-full flex-wrap gap-1 rounded-2xl bg-muted/60 p-1.5">
        {[
          { value: "branding", icon: Palette, label: "Thương Hiệu" },
          { value: "seo", icon: Search, label: "SEO" },
          { value: "home", icon: Home, label: "Trang Chủ" },
          { value: "social", icon: Share2, label: "Mạng Xã Hội" },
          { value: "integrations", icon: Plug, label: "Tích Hợp" },
          { value: "account", icon: User, label: "Tài Khoản" },
        ].map(({ value, icon: Icon, label }) => (
          <TabsTrigger
            key={value}
            value={value}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-all data-[state=active]:shadow-sm sm:flex-none"
          >
            <Icon className="size-3.5" />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{label.split(" ")[0]}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      {/* ── THƯƠNG HIỆU ── */}
      <TabsContent value="branding" className="space-y-4">
        <Card>
          <div className="py-4">
            <SectionHeader icon={Palette} title="Thương Hiệu" desc="Tên và logo hiển thị trên toàn bộ website" />
          </div>
          <Field label="Tên website" hint="Navbar & tab trình duyệt" icon={Globe}>
            <Input value={v("branding.site_name")} onChange={(e) => set("branding.site_name", e.target.value)} placeholder="Arex" />
          </Field>
          <Field label="Favicon" hint="Icon tab trình duyệt · 32×32px ICO/PNG">
            <div className="space-y-2">
              <Input value={v("branding.favicon_url")} onChange={(e) => set("branding.favicon_url", e.target.value)} placeholder="https://..." />
              {v("branding.favicon_url") && (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2">
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
                <div className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 border border-gray-100">
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
                <div className="flex items-center gap-3 rounded-xl bg-zinc-900 px-3 py-2 border border-zinc-700">
                  <Image src={v("branding.logo_dark_url")} alt="" width={36} height={36} className="rounded object-contain" unoptimized />
                  <span className="text-xs text-zinc-400">Dark preview</span>
                </div>
              )}
            </div>
          </Field>
        </Card>
        <SaveRow onSave={() => save(["branding.site_name", "branding.favicon_url", "branding.logo_light_url", "branding.logo_dark_url"], "branding")} saving={saving === "branding"} />
      </TabsContent>

      {/* ── SEO ── */}
      <TabsContent value="seo" className="space-y-4">
        <Card>
          <div className="py-4">
            <SectionHeader icon={Search} title="SEO" desc="Tối ưu xuất hiện trên Google và mạng xã hội" />
          </div>
          <Field label="Tiêu đề" hint={`${seoTitleLen}/60 ký tự`} icon={Sparkles}>
            <div className="space-y-1">
              <Input value={v("seo.default_title")} onChange={(e) => set("seo.default_title", e.target.value)} placeholder="Arex - Trang Tin Tức..." />
              <div className="h-1 rounded-full bg-border overflow-hidden">
                <div className={`h-full rounded-full transition-all ${seoTitleLen > 60 ? "bg-red-500" : seoTitleLen > 45 ? "bg-yellow-500" : "bg-primary"}`}
                  style={{ width: `${Math.min(100, (seoTitleLen / 60) * 100)}%` }} />
              </div>
            </div>
          </Field>
          <Field label="Mô tả" hint={`${seoDescLen}/160 ký tự`}>
            <div className="space-y-1">
              <Textarea value={v("seo.default_description")} onChange={(e) => set("seo.default_description", e.target.value)}
                placeholder="Mô tả ngắn về website..." rows={3} className="resize-none" />
              <div className="h-1 rounded-full bg-border overflow-hidden">
                <div className={`h-full rounded-full transition-all ${seoDescLen > 160 ? "bg-red-500" : seoDescLen > 130 ? "bg-yellow-500" : "bg-primary"}`}
                  style={{ width: `${Math.min(100, (seoDescLen / 160) * 100)}%` }} />
              </div>
            </div>
          </Field>
        </Card>

        {/* Google preview */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <Globe className="size-3.5" /> Xem trước kết quả Google
          </p>
          <div className="rounded-xl border border-border bg-background p-4 space-y-1 font-sans">
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">
              {v("seo.default_title") || "Tiêu đề website"}
            </p>
            <p className="text-xs text-green-700 dark:text-green-500">
              {v("branding.site_name") ? `https://${v("branding.site_name").toLowerCase().replace(/\s/g, "")}.tech` : "https://arex.tech"}
            </p>
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {v("seo.default_description") || "Mô tả website sẽ xuất hiện ở đây khi tìm kiếm trên Google..."}
            </p>
          </div>
        </div>

        <SaveRow onSave={() => save(["seo.default_title", "seo.default_description"], "seo")} saving={saving === "seo"} />
      </TabsContent>

      {/* ── TRANG CHỦ ── */}
      <TabsContent value="home" className="space-y-4">
        <Card>
          <div className="py-4">
            <SectionHeader icon={Home} title="Trang Chủ" desc="Hero section và slider ảnh nền" />
          </div>
          <Field label="Tiêu đề Hero" icon={Sparkles}>
            <Input value={v("home.hero.title")} onChange={(e) => set("home.hero.title", e.target.value)} placeholder="Arex" />
          </Field>
          <Field label="Hiệu ứng">
            <Select value={v("home.background.transition_effect")} onValueChange={(val) => set("home.background.transition_effect", val ?? "fade")}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn hiệu ứng" />
              </SelectTrigger>
              <SelectContent>
                {sliderEffects.map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    <span className="font-medium">{e.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{e.desc}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Thời gian chờ" hint="giây" icon={Clock}>
            <div className="flex items-center gap-2">
              <Input type="number" min="2" max="30" step="0.5" value={v("home.background.interval_seconds")} onChange={(e) => set("home.background.interval_seconds", e.target.value)} className="max-w-28" />
              <span className="text-xs text-muted-foreground">giây · mặc định 5s</span>
            </div>
          </Field>
          <Field label="Thời gian chuyển" hint="giây" icon={Clock}>
            <div className="flex items-center gap-2">
              <Input type="number" min="0.4" max="5" step="0.1" value={v("home.background.transition_seconds")} onChange={(e) => set("home.background.transition_seconds", e.target.value)} className="max-w-28" />
              <span className="text-xs text-muted-foreground">giây · mặc định 1s</span>
            </div>
          </Field>
        </Card>

        {/* Slider images */}
        <div className="glass-card rounded-2xl p-5 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Desktop */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="size-4 text-primary" />
                <p className="text-xs font-bold uppercase tracking-widest text-foreground">Desktop</p>
                <span className="text-[10px] text-muted-foreground">(16:9 · 1920×1080)</span>
              </div>
              {getSlots(v("home.background.desktop_urls")).map((slot, i) => (
                <div key={`d${i}`} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{i + 1}</span>
                    <Input value={slot} onChange={(e) => setSlot("home.background.desktop_urls", i, e.target.value)} placeholder={`Ảnh ${i + 1}…`} className="text-xs" />
                  </div>
                  {slot && (
                    <div className="relative ml-7 aspect-video w-full overflow-hidden rounded-lg border border-border">
                      <Image src={slot} alt="" fill className="object-cover" unoptimized />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Mobile */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="size-4 text-primary" />
                <p className="text-xs font-bold uppercase tracking-widest text-foreground">Mobile</p>
                <span className="text-[10px] text-muted-foreground">(9:16 · 720×1280)</span>
              </div>
              {getSlots(v("home.background.mobile_urls")).map((slot, i) => (
                <div key={`m${i}`} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{i + 1}</span>
                    <Input value={slot} onChange={(e) => setSlot("home.background.mobile_urls", i, e.target.value)} placeholder={`Ảnh ${i + 1}…`} className="text-xs" />
                  </div>
                  {slot && (
                    <div className="relative ml-7 aspect-[9/16] w-16 overflow-hidden rounded-lg border border-border">
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
      </TabsContent>

      {/* ── MẠNG XÃ HỘI ── */}
      <TabsContent value="social" className="space-y-4">
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
          <Field label="Email" icon={Mail}>
            <Input type="email" value={v("social.email")} onChange={(e) => set("social.email", e.target.value)} placeholder="admin@arex.tech" />
          </Field>
        </Card>
        <SaveRow onSave={() => save(["social.facebook_url", "social.tiktok_url", "social.youtube_url", "social.email"], "social")} saving={saving === "social"} />
      </TabsContent>

      {/* ── TÍCH HỢP ── */}
      <TabsContent value="integrations" className="space-y-4">
        {/* Zalo */}
        <Card>
          <div className="py-4">
            <SectionHeader icon={Plug} title="Zalo" desc="Tích hợp thông báo qua Zalo OA" />
          </div>
          <Field label="Zalo Webhook" hint="Thông báo bài mới qua OA">
            <Input value={v("zalo.webhook_url")} onChange={(e) => set("zalo.webhook_url", e.target.value)} placeholder="https://..." />
          </Field>
          <Field label="Zalo Group ID" hint="ID nhóm nhận thông báo">
            <Input value={v("zalo.group_id")} onChange={(e) => set("zalo.group_id", e.target.value)} placeholder="0123456789" />
          </Field>
        </Card>

        {/* Google Ads */}
        <Card>
          <div className="py-4">
            <SectionHeader icon={BarChart3} title="Google AdSense" desc="Cấu hình quảng cáo Google trên website" />
          </div>

          <Field label="Publisher ID" hint="ca-pub-XXXXXXXXXX" icon={BarChart3}>
            <div className="space-y-2">
              <Input
                value={v("ads.google_adsense_id")}
                onChange={(e) => set("ads.google_adsense_id", e.target.value)}
                placeholder="ca-pub-0000000000000000"
                className="font-mono"
              />
              {v("ads.google_adsense_id") && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  ✓ Script AdSense sẽ được inject tự động vào toàn bộ trang.
                </p>
              )}
            </div>
          </Field>

          <Field label="Slot Header" hint="Banner đầu trang (970×90)" icon={MonitorPlay}>
            <Input
              value={v("ads.slot_header")}
              onChange={(e) => set("ads.slot_header", e.target.value)}
              placeholder="1234567890"
              className="font-mono"
            />
          </Field>

          <Field label="Slot Sidebar" hint="Banner cột bên (300×250)" icon={LayoutGrid}>
            <Input
              value={v("ads.slot_sidebar")}
              onChange={(e) => set("ads.slot_sidebar", e.target.value)}
              placeholder="1234567890"
              className="font-mono"
            />
          </Field>

          <Field label="Slot In-Article" hint="Quảng cáo trong bài viết" icon={Newspaper}>
            <Input
              value={v("ads.slot_article")}
              onChange={(e) => set("ads.slot_article", e.target.value)}
              placeholder="1234567890"
              className="font-mono"
            />
          </Field>

          {/* Preview */}
          {v("ads.google_adsense_id") && (
            <div className="py-3">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Xem trước vị trí quảng cáo
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Header Banner", icon: MonitorPlay, size: "970×90", slot: v("ads.slot_header") },
                  { label: "Sidebar Box",   icon: LayoutGrid,  size: "300×250", slot: v("ads.slot_sidebar") },
                  { label: "In-Article",    icon: Newspaper,   size: "Responsive", slot: v("ads.slot_article") },
                ].map(({ label, icon: Icon, size, slot }) => (
                  <div key={label} className={[
                    "flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all",
                    slot ? "border-primary/30 bg-primary/5" : "border-dashed border-border bg-muted/20 opacity-50",
                  ].join(" ")}>
                    <Icon className="size-5 text-muted-foreground" />
                    <p className="text-xs font-semibold text-foreground">{label}</p>
                    <p className="text-[10px] text-muted-foreground">{size}</p>
                    {slot
                      ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-mono font-bold text-primary">Slot {slot}</span>
                      : <span className="text-[10px] text-muted-foreground">Chưa cấu hình</span>
                    }
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <SaveRow
          onSave={() => save(["zalo.webhook_url", "zalo.group_id", "ads.google_adsense_id", "ads.slot_header", "ads.slot_sidebar", "ads.slot_article"], "integrations")}
          saving={saving === "integrations"}
        />
      </TabsContent>

      {/* ── TÀI KHOẢN ── */}
      <TabsContent value="account" className="space-y-5">
        {/* Profile card */}
        <Card>
          <div className="py-4">
            <SectionHeader icon={User} title="Thông Tin Cá Nhân" desc="Quản lý hồ sơ và tài khoản của bạn" />
          </div>

          {/* Avatar & Info Section */}
          <div className="py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <div className="relative">
                <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 shadow-lg ring-2 ring-primary/20 transition-all hover:scale-105 hover:shadow-xl">
                  <ShieldCheck className="size-9 text-primary" />
                </div>
                {roleInfo && (
                  <div className="absolute -bottom-1 -right-1">
                    <span className={`inline-flex items-center rounded-full border-2 border-background px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-sm ${roleInfo.color}`}>
                      {roleInfo.label}
                    </span>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate font-heading text-lg font-bold text-foreground">
                  {profile?.display_name || "Chưa đặt tên"}
                </p>
                <p className="truncate text-sm text-muted-foreground">{profile?.email || "Đang tải..."}</p>
                <div className="flex items-center gap-2 pt-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-medium text-green-600 dark:text-green-400">Đang hoạt động</span>
                </div>
              </div>
            </div>
          </div>

          <Field label="Tên hiển thị" hint="Hiển thị trong admin" icon={User}>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input 
                value={displayName} 
                onChange={(e) => setDisplayName(e.target.value)} 
                placeholder="Nhập tên hiển thị..." 
                className="flex-1"
              />
              <Button 
                type="button" 
                size="sm" 
                disabled={savingProfile || displayName === profile?.display_name} 
                onClick={saveProfile} 
                className="shrink-0 rounded-xl gap-1.5 px-4 transition-all hover:scale-105"
              >
                <Save className="size-3.5" />
                {savingProfile ? "Đang lưu..." : "Cập nhật"}
              </Button>
            </div>
            {displayName !== profile?.display_name && displayName.length > 0 && (
              <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <span className="inline-block size-1 rounded-full bg-amber-500" />
                Có thay đổi chưa lưu
              </p>
            )}
          </Field>

          <Field label="Email đăng nhập" hint="Không thể thay đổi" icon={Mail}>
            <div className="relative">
              <Input 
                value={profile?.email ?? ""} 
                disabled 
                className="cursor-not-allowed bg-muted/50 opacity-60 pr-20" 
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Cố định
              </span>
            </div>
          </Field>
        </Card>

        {/* Password card */}
        <Card>
          <div className="py-4">
            <SectionHeader icon={ShieldCheck} title="Bảo Mật" desc="Đổi mật khẩu để bảo vệ tài khoản" />
          </div>

          <Field label="Mật khẩu mới" hint="Tối thiểu 8 ký tự">
            <PasswordInput 
              value={newPw} 
              onChange={setNewPw} 
              placeholder="Nhập mật khẩu mới..." 
              show={showNew} 
              onToggle={() => setShowNew((v) => !v)} 
            />
          </Field>

          <Field label="Xác nhận mật khẩu" hint="Nhập lại để xác nhận">
            <div className="space-y-2">
              <PasswordInput 
                value={confirmPw} 
                onChange={setConfirmPw} 
                placeholder="Nhập lại mật khẩu..." 
                show={showConfirm} 
                onToggle={() => setShowConfirm((v) => !v)} 
              />
              {confirmPw.length > 0 && (
                <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                  newPw === confirmPw 
                    ? "bg-green-500/10 text-green-600 dark:text-green-400" 
                    : "bg-red-500/10 text-red-600 dark:text-red-400"
                }`}>
                  <span className="text-sm">{newPw === confirmPw ? "✓" : "✗"}</span>
                  {newPw === confirmPw ? "Mật khẩu khớp" : "Mật khẩu không khớp"}
                </div>
              )}
            </div>
          </Field>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Mật khẩu mạnh nên có chữ hoa, chữ thường, số và ký tự đặc biệt
            </p>
            <Button 
              type="button" 
              size="sm" 
              disabled={savingPw || !newPw || !confirmPw || newPw !== confirmPw || newPw.length < 8}
              onClick={savePw} 
              className="shrink-0 gap-1.5 rounded-xl px-5 transition-all hover:scale-105"
            >
              <ShieldCheck className="size-3.5" />
              {savingPw ? "Đang đổi..." : "Đổi mật khẩu"}
            </Button>
          </div>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
