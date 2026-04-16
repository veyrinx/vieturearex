"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import type { SiteSetting } from "@/lib/types/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import {
  defaultSiteSettingValues,
  getSettingsFormInitialState,
} from "@/lib/utils/site-settings";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
  support: "Support",
  user: "User",
};

type SettingsFormProps = {
  settings: SiteSetting[];
  onSaved: () => Promise<void>;
};

const sliderEffectOptions = [
  { value: "fade", label: "Fade" },
  { value: "zoom", label: "Zoom Cinematic" },
  { value: "slide", label: "Slide Smooth" },
  { value: "drift", label: "Drift Parallax" },
  { value: "cinematic", label: "Cinematic Blur" },
] as const;

function getImageSlots(value: string) {
  const slots = value.split(/\r?\n/);
  return Array.from({ length: 3 }, (_, i) => slots[i] ?? "");
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[1fr_2fr] items-start gap-4 py-3">
      <div className="pt-2">
        <Label className="text-sm font-semibold text-foreground">{label}</Label>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass-card divide-y divide-border rounded-2xl px-5">
      {children}
    </div>
  );
}

export function SettingsForm({ settings, onSaved }: SettingsFormProps) {
  const [state, setState] = useState<Record<string, string>>(() => getSettingsFormInitialState(settings));
  const [saving, setSaving] = useState<string | null>(null);

  // Profile state
  const [profile, setProfile] = useState<{ email: string; display_name: string; role: string } | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setState(getSettingsFormInitialState(settings));
  }, [settings]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: row } = await supabase
        .from("users")
        .select("display_name, role")
        .eq("id", data.user.id)
        .maybeSingle() as { data: { display_name: string | null; role: string } | null };
      const prof = {
        email: data.user.email ?? "",
        display_name: row?.display_name ?? "",
        role: row?.role ?? "user",
      };
      setProfile(prof);
      setDisplayName(prof.display_name);
    });
  }, []);

  const saveDisplayName = async () => {
    setSavingProfile(true);
    const res = await fetch("/api/admin/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: displayName }),
    });
    setSavingProfile(false);
    if (!res.ok) { toast.error("Lưu thất bại."); return; }
    setProfile((p) => p ? { ...p, display_name: displayName } : p);
    toast.success("Đã cập nhật tên hiển thị.");
  };

  const savePassword = async () => {
    if (newPassword.length < 8) { toast.error("Mật khẩu tối thiểu 8 ký tự."); return; }
    if (newPassword !== confirmPassword) { toast.error("Mật khẩu không khớp."); return; }
    const supabase = createClient();
    if (!supabase) return;
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) { toast.error("Đổi mật khẩu thất bại: " + error.message); return; }
    toast.success("Đổi mật khẩu thành công.");
    setNewPassword("");
    setConfirmPassword("");
  };

  const set = (key: string, value: string) =>
    setState((prev) => ({ ...prev, [key]: value }));

  const setSlot = (key: string, index: number, value: string) => {
    setState((prev) => {
      const slots = getImageSlots(prev[key] ?? "");
      slots[index] = value;
      return { ...prev, [key]: slots.join("\n") };
    });
  };

  const val = (key: string) => state[key] ?? defaultSiteSettingValues[key] ?? "";

  const saveKeys = async (keys: string[], section: string) => {
    setSaving(section);
    const results = await Promise.all(
      keys.map(async (key) => {
        const res = await fetch("/api/admin/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value: val(key) }),
        });
        return res.ok;
      })
    );
    setSaving(null);
    if (results.every(Boolean)) {
      toast.success("Đã lưu cài đặt.");
      await onSaved();
    } else {
      toast.error("Lưu thất bại, thử lại.");
    }
  };

  const SaveButton = ({ keys, section }: { keys: string[]; section: string }) => (
    <div className="flex justify-end pt-4">
      <Button
        type="button"
        size="sm"
        disabled={saving === section}
        onClick={() => saveKeys(keys, section)}
        className="rounded-xl px-6"
      >
        {saving === section ? "Đang lưu..." : "Lưu"}
      </Button>
    </div>
  );

  return (
    <Tabs defaultValue="branding" className="space-y-5">
      <TabsList className="flex h-auto flex-wrap gap-1 rounded-xl bg-muted p-1">
        <TabsTrigger value="branding" className="rounded-lg text-xs font-semibold uppercase tracking-wide">Thương Hiệu</TabsTrigger>
        <TabsTrigger value="seo" className="rounded-lg text-xs font-semibold uppercase tracking-wide">SEO</TabsTrigger>
        <TabsTrigger value="home" className="rounded-lg text-xs font-semibold uppercase tracking-wide">Trang Chủ</TabsTrigger>
        <TabsTrigger value="social" className="rounded-lg text-xs font-semibold uppercase tracking-wide">Mạng Xã Hội</TabsTrigger>
        <TabsTrigger value="integrations" className="rounded-lg text-xs font-semibold uppercase tracking-wide">Tích Hợp</TabsTrigger>
        <TabsTrigger value="account" className="rounded-lg text-xs font-semibold uppercase tracking-wide">Tài Khoản</TabsTrigger>
      </TabsList>

      {/* ─── THƯƠNG HIỆU ─── */}
      <TabsContent value="branding" className="space-y-4">
        <SectionCard>
          <FieldRow label="Tên Website" hint="Hiển thị trên navbar và tab trình duyệt">
            <Input value={val("branding.site_name")} onChange={(e) => set("branding.site_name", e.target.value)} placeholder="Arex" />
          </FieldRow>

          <FieldRow label="Logo — Sáng" hint="PNG nền trong, dùng cho Light Mode">
            <div className="space-y-2">
              <Input value={val("branding.logo_light_url")} onChange={(e) => set("branding.logo_light_url", e.target.value)} placeholder="https://..." />
              {val("branding.logo_light_url") && (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-white p-2">
                  <Image src={val("branding.logo_light_url")} alt="logo light preview" width={40} height={40} className="rounded object-contain" unoptimized />
                  <span className="text-xs text-muted-foreground">Preview Light</span>
                </div>
              )}
            </div>
          </FieldRow>

          <FieldRow label="Logo — Tối" hint="PNG nền trong, màu sáng, dùng cho Dark Mode">
            <div className="space-y-2">
              <Input value={val("branding.logo_dark_url")} onChange={(e) => set("branding.logo_dark_url", e.target.value)} placeholder="https://..." />
              {val("branding.logo_dark_url") && (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-zinc-900 p-2">
                  <Image src={val("branding.logo_dark_url")} alt="logo dark preview" width={40} height={40} className="rounded object-contain" unoptimized />
                  <span className="text-xs text-zinc-400">Preview Dark</span>
                </div>
              )}
            </div>
          </FieldRow>
        </SectionCard>
        <SaveButton keys={["branding.site_name", "branding.logo_light_url", "branding.logo_dark_url"]} section="branding" />
      </TabsContent>

      {/* ─── SEO ─── */}
      <TabsContent value="seo" className="space-y-4">
        <SectionCard>
          <FieldRow label="Tiêu đề" hint="Dưới 60 ký tự · Hiển thị trên Google">
            <div className="space-y-1">
              <Input value={val("seo.default_title")} onChange={(e) => set("seo.default_title", e.target.value)} placeholder="Arex - Trang Tin Tức..." />
              <p className="text-right text-xs text-muted-foreground">{val("seo.default_title").length}/60</p>
            </div>
          </FieldRow>

          <FieldRow label="Mô tả" hint="Dưới 160 ký tự · Snippet trên Google">
            <div className="space-y-1">
              <Textarea
                value={val("seo.default_description")}
                onChange={(e) => set("seo.default_description", e.target.value)}
                placeholder="Mô tả ngắn về website..."
                rows={3}
                className="resize-none"
              />
              <p className="text-right text-xs text-muted-foreground">{val("seo.default_description").length}/160</p>
            </div>
          </FieldRow>
        </SectionCard>

        {/* Google Search Preview */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Xem trước Google</p>
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">{val("seo.default_title") || "Tiêu đề website"}</p>
          <p className="text-xs text-green-700 dark:text-green-500">arex.tech</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{val("seo.default_description") || "Mô tả website sẽ hiển thị ở đây..."}</p>
        </div>

        <SaveButton keys={["seo.default_title", "seo.default_description"]} section="seo" />
      </TabsContent>

      {/* ─── TRANG CHỦ ─── */}
      <TabsContent value="home" className="space-y-4">
        <SectionCard>
          <FieldRow label="Tiêu đề Hero">
            <Input value={val("home.hero.title")} onChange={(e) => set("home.hero.title", e.target.value)} placeholder="Arex" />
          </FieldRow>

          <FieldRow label="Hiệu ứng Slider">
            <Select value={val("home.background.transition_effect")} onValueChange={(v) => set("home.background.transition_effect", v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn hiệu ứng" />
              </SelectTrigger>
              <SelectContent>
                {sliderEffectOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow label="Thời gian chờ (giây)" hint="Mặc định 5s">
            <Input type="number" min="2" max="30" step="0.5" value={val("home.background.interval_seconds")} onChange={(e) => set("home.background.interval_seconds", e.target.value)} />
          </FieldRow>

          <FieldRow label="Thời gian chuyển (giây)" hint="Mặc định 1s">
            <Input type="number" min="0.4" max="5" step="0.1" value={val("home.background.transition_seconds")} onChange={(e) => set("home.background.transition_seconds", e.target.value)} />
          </FieldRow>
        </SectionCard>

        <div className="glass-card rounded-2xl p-5 space-y-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Ảnh Slider Desktop</p>
          {getImageSlots(val("home.background.desktop_urls")).map((slot, i) => (
            <div key={`desktop-${i}`} className="flex items-center gap-3">
              <span className="w-5 shrink-0 text-center text-xs font-bold text-primary">{i + 1}</span>
              <Input value={slot} onChange={(e) => setSlot("home.background.desktop_urls", i, e.target.value)} placeholder={`URL ảnh desktop ${i + 1}`} />
            </div>
          ))}
          <Separator />
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Ảnh Slider Mobile</p>
          {getImageSlots(val("home.background.mobile_urls")).map((slot, i) => (
            <div key={`mobile-${i}`} className="flex items-center gap-3">
              <span className="w-5 shrink-0 text-center text-xs font-bold text-primary">{i + 1}</span>
              <Input value={slot} onChange={(e) => setSlot("home.background.mobile_urls", i, e.target.value)} placeholder={`URL ảnh mobile ${i + 1}`} />
            </div>
          ))}
        </div>

        <SaveButton
          keys={["home.hero.title", "home.background.transition_effect", "home.background.interval_seconds", "home.background.transition_seconds", "home.background.desktop_urls", "home.background.mobile_urls"]}
          section="home"
        />
      </TabsContent>

      {/* ─── MẠNG XÃ HỘI ─── */}
      <TabsContent value="social" className="space-y-4">
        <SectionCard>
          <FieldRow label="Facebook">
            <Input value={val("social.facebook_url")} onChange={(e) => set("social.facebook_url", e.target.value)} placeholder="https://facebook.com/..." />
          </FieldRow>
          <FieldRow label="TikTok">
            <Input value={val("social.tiktok_url")} onChange={(e) => set("social.tiktok_url", e.target.value)} placeholder="https://tiktok.com/@..." />
          </FieldRow>
          <FieldRow label="YouTube">
            <Input value={val("social.youtube_url")} onChange={(e) => set("social.youtube_url", e.target.value)} placeholder="https://youtube.com/@..." />
          </FieldRow>
          <FieldRow label="Email liên hệ">
            <Input type="email" value={val("social.email")} onChange={(e) => set("social.email", e.target.value)} placeholder="admin@arex.tech" />
          </FieldRow>
        </SectionCard>
        <SaveButton keys={["social.facebook_url", "social.tiktok_url", "social.youtube_url", "social.email"]} section="social" />
      </TabsContent>

      {/* ─── TÍCH HỢP ─── */}
      <TabsContent value="integrations" className="space-y-4">
        <SectionCard>
          <FieldRow label="Zalo Webhook URL" hint="Thông báo bài viết mới qua Zalo OA">
            <Input value={val("zalo.webhook_url")} onChange={(e) => set("zalo.webhook_url", e.target.value)} placeholder="https://..." />
          </FieldRow>
          <FieldRow label="Zalo Group ID" hint="ID nhóm nhận thông báo tự động">
            <Input value={val("zalo.group_id")} onChange={(e) => set("zalo.group_id", e.target.value)} placeholder="0123456789" />
          </FieldRow>
          <FieldRow label="Google AdSense ID" hint="Hiển thị quảng cáo Google trên website">
            <Input value={val("ads.google_adsense_id")} onChange={(e) => set("ads.google_adsense_id", e.target.value)} placeholder="ca-pub-XXXXXXXXXX" />
          </FieldRow>
        </SectionCard>
        <SaveButton keys={["zalo.webhook_url", "zalo.group_id", "ads.google_adsense_id"]} section="integrations" />
      </TabsContent>

      {/* ─── TÀI KHOẢN ─── */}
      <TabsContent value="account" className="space-y-4">
        {/* Thông tin */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{profile?.display_name || profile?.email || "..."}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-muted-foreground">{profile?.email}</p>
                {profile?.role && (
                  <Badge variant="secondary" className="text-[10px] uppercase tracking-wider px-1.5 py-0">
                    {ROLE_LABELS[profile.role] ?? profile.role}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Separator />

          <FieldRow label="Tên hiển thị" hint="Tên xuất hiện trong giao diện quản trị">
            <div className="flex gap-2">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nhập tên hiển thị..."
              />
              <Button
                type="button"
                size="sm"
                disabled={savingProfile}
                onClick={saveDisplayName}
                className="shrink-0 rounded-xl"
              >
                {savingProfile ? "..." : "Lưu"}
              </Button>
            </div>
          </FieldRow>

          <FieldRow label="Email" hint="Email đăng nhập, không thể thay đổi">
            <Input value={profile?.email ?? ""} disabled className="opacity-60 cursor-not-allowed" />
          </FieldRow>
        </div>

        {/* Đổi mật khẩu */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Đổi Mật Khẩu</p>
          <FieldRow label="Mật khẩu mới" hint="Tối thiểu 8 ký tự">
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới..."
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </FieldRow>
          <FieldRow label="Xác nhận mật khẩu">
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới..."
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </FieldRow>
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              disabled={savingPassword || !newPassword || !confirmPassword}
              onClick={savePassword}
              className="rounded-xl px-6"
            >
              {savingPassword ? "Đang đổi..." : "Đổi mật khẩu"}
            </Button>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
