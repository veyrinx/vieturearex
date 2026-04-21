"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  User, Mail, Shield, CalendarDays, Eye, Save, LogOut,
  Lock, KeyRound, CheckCircle2, BadgeCheck, QrCode, ShieldCheck,
  Smartphone, Camera, Trash2, Globe, Link2, Phone,
  Facebook, Youtube, Clock, Monitor, MapPin, RefreshCw,
  Instagram,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatDistanceToNowStrict } from "date-fns";
import { vi } from "date-fns/locale";

// TikTok icon (Lucide doesn't have it)
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.84 4.84 0 0 1-1.01-.07z"/>
    </svg>
  );
}

const ROLE_META: Record<string, { label: string; color: string }> = {
  super_admin: { label: "Super Admin", color: "text-red-500 bg-red-500/10 border-red-500/30" },
  admin:       { label: "Admin",       color: "text-amber-500 bg-amber-500/10 border-amber-500/30" },
  it:          { label: "IT",          color: "text-violet-500 bg-violet-500/10 border-violet-500/30" },
  manager:     { label: "Quản Lý",     color: "text-blue-500 bg-blue-500/10 border-blue-500/30" },
  support:     { label: "CSKH",        color: "text-green-500 bg-green-500/10 border-green-500/30" },
  user:        { label: "Người Dùng",  color: "text-muted-foreground bg-muted border-border" },
};

const AVATAR_COLORS = [
  "from-blue-500 to-indigo-600", "from-purple-500 to-pink-600",
  "from-amber-500 to-orange-600", "from-green-500 to-emerald-600",
  "from-red-500 to-rose-600", "from-cyan-500 to-teal-600",
];

function getAvatarColor(email: string) {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

type ProfileData = {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  views: number;
  created_at: string;
  is_verified?: boolean;
  avatar_url?: string | null;
  bio?: string | null;
  phone?: string | null;
  facebook_url?: string | null;
  tiktok_url?: string | null;
  instagram_url?: string | null;
  youtube_url?: string | null;
  website_url?: string | null;
};

type LoginLog = {
  id: string;
  ip: string | null;
  user_agent: string | null;
  method: string;
  created_at: string;
};

type TotpFactor = { id: string; friendly_name?: string; factor_type: string; status: string };
type Tab = "info" | "social" | "security" | "login_history";

function parseUa(ua: string | null) {
  if (!ua) return "Không rõ";
  const bot = /bot|crawl|spider/i.test(ua);
  if (bot) return "Bot";
  const edge = ua.match(/Edg\/(\d+)/);
  const chrome = ua.match(/Chrome\/(\d+)/);
  const firefox = ua.match(/Firefox\/(\d+)/);
  const safari = ua.match(/Version\/[\d.]+ Safari/);
  const ios = ua.match(/iPhone|iPad/i);
  const android = ua.match(/Android/i);
  const windows = ua.match(/Windows/i);
  const mac = ua.match(/Macintosh/i);

  let browser = "Trình duyệt khác";
  if (edge) browser = `Edge ${edge[1]}`;
  else if (chrome) browser = `Chrome ${chrome[1]}`;
  else if (firefox) browser = `Firefox ${firefox[1]}`;
  else if (safari) browser = "Safari";

  let os = "";
  if (ios) os = "iOS";
  else if (android) os = "Android";
  else if (windows) os = "Windows";
  else if (mac) os = "macOS";

  return os ? `${browser} · ${os}` : browser;
}

function timeAgo(dateStr: string) {
  try { return formatDistanceToNowStrict(new Date(dateStr), { locale: vi, addSuffix: true }); }
  catch { return dateStr; }
}

export default function AdminProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("info");

  // Info fields
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);

  // Social fields
  const [phone, setPhone] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [savingSocial, setSavingSocial] = useState(false);

  // Avatar upload
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  // 2FA
  const [mfaFactors, setMfaFactors] = useState<TotpFactor[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [totpQr, setTotpQr] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [totpFactorId, setTotpFactorId] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [verifyingTotp, setVerifyingTotp] = useState(false);
  const [removingMfa, setRemovingMfa] = useState(false);

  // Login logs
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const loadProfile = useCallback(async () => {
    const res = await fetch("/api/user/profile");
    const data = await res.json() as ProfileData;
    if (!data.email) { router.replace("/auth/login"); return; }
    setProfile(data);
    setDisplayName(data.display_name ?? "");
    setBio(data.bio ?? "");
    setAvatarUrl(data.avatar_url ?? "");
    setAvatarPreview(data.avatar_url ?? null);
    setPhone(data.phone ?? "");
    setFacebookUrl(data.facebook_url ?? "");
    setTiktokUrl(data.tiktok_url ?? "");
    setInstagramUrl(data.instagram_url ?? "");
    setYoutubeUrl(data.youtube_url ?? "");
    setWebsiteUrl(data.website_url ?? "");
    setLoading(false);
  }, [router]);

  const loadLoginLogs = useCallback(async () => {
    setLoadingLogs(true);
    const res = await fetch("/api/user/login-logs");
    if (res.ok) {
      const data = await res.json() as { logs: LoginLog[] };
      setLoginLogs(data.logs ?? []);
    }
    setLoadingLogs(false);
  }, []);

  useEffect(() => { loadProfile().catch(() => router.replace("/auth/login")); }, [loadProfile, router]);

  useEffect(() => {
    if (!loading) {
      const supabase = createClient();
      if (supabase) supabase.auth.mfa.listFactors().then(({ data }) => setMfaFactors((data?.totp ?? []) as TotpFactor[]));
    }
  }, [loading]);

  useEffect(() => {
    if (tab === "login_history" && loginLogs.length === 0) loadLoginLogs();
  }, [tab, loginLogs.length, loadLoginLogs]);

  const onSaveInfo = async () => {
    if (!displayName.trim()) { toast.error("Tên hiển thị không được để trống."); return; }
    setSavingInfo(true);
    try {
      const payload: Record<string, string> = { display_name: displayName.trim(), bio: bio.trim() };
      const trimmed = avatarUrl.trim();
      if (trimmed) payload.avatar_url = trimmed;
      const res = await fetch("/api/user/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const e = await res.json().catch(() => ({})) as { error?: string }; toast.error(e.error ?? "Lỗi lưu thông tin."); return; }
      toast.success("Đã lưu thông tin cá nhân.");
      if (trimmed) { setAvatarPreview(trimmed); setProfile((p) => p ? { ...p, avatar_url: trimmed, display_name: displayName.trim(), bio: bio.trim() } : p); }
      else setProfile((p) => p ? { ...p, display_name: displayName.trim(), bio: bio.trim() } : p);
    } finally { setSavingInfo(false); }
  };

  const onSaveSocial = async () => {
    setSavingSocial(true);
    try {
      const res = await fetch("/api/user/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: phone.trim(), facebook_url: facebookUrl.trim(), tiktok_url: tiktokUrl.trim(), instagram_url: instagramUrl.trim(), youtube_url: youtubeUrl.trim(), website_url: websiteUrl.trim() }) });
      if (!res.ok) { const e = await res.json().catch(() => ({})) as { error?: string }; toast.error(e.error ?? "Lỗi lưu liên hệ."); return; }
      toast.success("Đã lưu thông tin mạng xã hội.");
    } finally { setSavingSocial(false); }
  };

  const onAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Ảnh tối đa 5MB."); return; }
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
    setUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/user/avatar", { method: "POST", body: form });
      if (!res.ok) { const err = await res.json().catch(() => ({})) as { error?: string }; toast.error(err.error ?? "Không thể tải ảnh."); setAvatarPreview(profile?.avatar_url ?? null); return; }
      const { avatar_url: url } = await res.json() as { avatar_url: string };
      setAvatarPreview(url); setAvatarUrl(url);
      setProfile((p) => p ? { ...p, avatar_url: url } : p);
      toast.success("Đã cập nhật ảnh đại diện.");
    } catch { toast.error("Lỗi mạng."); setAvatarPreview(profile?.avatar_url ?? null); }
    finally { setUploadingAvatar(false); URL.revokeObjectURL(objectUrl); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const onRemoveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      const res = await fetch("/api/user/avatar", { method: "DELETE" });
      if (!res.ok) { const e = await res.json().catch(() => ({})) as { error?: string }; toast.error(e.error ?? "Lỗi xóa ảnh."); return; }
      setAvatarPreview(null); setAvatarUrl("");
      setProfile((p) => p ? { ...p, avatar_url: null } : p);
      toast.success("Đã xóa ảnh đại diện.");
    } finally { setUploadingAvatar(false); }
  };

  const onChangePassword = async () => {
    if (newPassword.length < 6) { toast.error("Mật khẩu tối thiểu 6 ký tự."); return; }
    if (newPassword !== confirmPassword) { toast.error("Mật khẩu xác nhận không khớp."); return; }
    setChangingPw(true);
    try {
      const supabase = createClient();
      if (!supabase) { toast.error("Lỗi kết nối."); return; }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) { toast.error(error.message); return; }
      toast.success("Đã đổi mật khẩu thành công.");
      setNewPassword(""); setConfirmPassword("");
    } finally { setChangingPw(false); }
  };

  const onEnroll2FA = async () => {
    setEnrolling(true);
    try {
      const supabase = createClient();
      if (!supabase) { toast.error("Lỗi kết nối."); return; }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error || !data) { toast.error(error?.message ?? "Không thể khởi động 2FA."); return; }
      setTotpFactorId(data.id); setTotpQr(data.totp.qr_code); setTotpSecret(data.totp.secret);
    } finally { setEnrolling(false); }
  };

  const onVerify2FA = async () => {
    if (!totpFactorId || totpCode.length < 6) { toast.error("Nhập mã 6 chữ số."); return; }
    setVerifyingTotp(true);
    try {
      const supabase = createClient();
      if (!supabase) { toast.error("Lỗi kết nối."); return; }
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: totpFactorId, code: totpCode });
      if (error) { toast.error("Mã không đúng. Vui lòng thử lại."); return; }
      toast.success("2FA đã được kích hoạt!");
      setTotpQr(null); setTotpSecret(null); setTotpFactorId(null); setTotpCode("");
      const sb = createClient();
      if (sb) { const { data } = await sb.auth.mfa.listFactors(); setMfaFactors((data?.totp ?? []) as TotpFactor[]); }
    } finally { setVerifyingTotp(false); }
  };

  const onRemove2FA = async (factorId: string) => {
    setRemovingMfa(true);
    try {
      const supabase = createClient();
      if (!supabase) { toast.error("Lỗi kết nối."); return; }
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) { toast.error(error.message); return; }
      toast.success("Đã tắt 2FA.");
      const sb = createClient();
      if (sb) { const { data } = await sb.auth.mfa.listFactors(); setMfaFactors((data?.totp ?? []) as TotpFactor[]); }
    } finally { setRemovingMfa(false); }
  };

  const onLogout = async () => {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    router.push("/auth/login"); router.refresh();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}
      </div>
    );
  }

  if (!profile) return null;

  const label = displayName.trim() || profile.display_name || profile.email.split("@")[0];
  const initial = label.charAt(0).toUpperCase();
  const avatarGradient = getAvatarColor(profile.email);
  const roleMeta = ROLE_META[profile.role] ?? ROLE_META.user;
  const joinDate = new Date(profile.created_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  const has2FA = mfaFactors.some((f) => f.status === "verified");

  const TABS: { id: Tab; label: string }[] = [
    { id: "info", label: "Thông tin" },
    { id: "social", label: "Mạng xã hội" },
    { id: "security", label: "Bảo mật" },
    { id: "login_history", label: "Lịch sử đăng nhập" },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className={cn("flex size-20 items-center justify-center rounded-2xl overflow-hidden text-3xl font-extrabold text-white shadow-lg", !avatarPreview && `bg-gradient-to-br ${avatarGradient}`)}>
              {avatarPreview
                ? <Image src={avatarPreview} alt="Avatar" width={80} height={80} className="size-full object-cover" unoptimized />
                : initial}
            </div>
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar} className={cn("absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 opacity-0 transition-opacity hover:opacity-100", uploadingAvatar && "opacity-100 cursor-wait")}>
              {uploadingAvatar ? <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Camera className="size-4 text-white" />}
            </button>
            {avatarPreview && !uploadingAvatar && (
              <button type="button" onClick={onRemoveAvatar} className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-white shadow hover:brightness-110">
                <Trash2 className="size-3" />
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={onAvatarFileChange} />
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className="font-heading text-xl font-black uppercase tracking-[0.06em] text-foreground">
                {label}
              </h1>
              {profile.is_verified && <BadgeCheck className="size-5 text-[#0052ff] dark:text-amber-400" />}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{profile.email}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-3 sm:justify-start">
              <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide", roleMeta.color)}>
                {roleMeta.label}
              </span>
              {has2FA && (
                <span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-0.5 text-[11px] font-bold text-green-500">
                  <ShieldCheck className="size-3" /> 2FA
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground sm:justify-start">
              <span className="flex items-center gap-1"><CalendarDays className="size-3.5" /> {joinDate}</span>
              <span className="flex items-center gap-1"><Eye className="size-3.5" /> {Number(profile.views ?? 0).toLocaleString("vi-VN")} lượt xem</span>
            </div>
            {profile.bio && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{profile.bio}</p>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-muted/30 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-[0.06em] transition-all",
              tab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Thông tin ── */}
      {tab === "info" && (
        <div className="glass-card rounded-2xl p-6 space-y-5">
          <h2 className="font-heading text-sm font-bold uppercase tracking-[0.08em] text-foreground flex items-center gap-2">
            <User className="size-4 text-muted-foreground" /> Thông tin cá nhân
          </h2>

          {/* Avatar URL (ImageKit) */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <Link2 className="size-3.5" /> Link ảnh đại diện
            </label>
            <div className="flex gap-2">
              <Input
                value={avatarUrl}
                onChange={(e) => { setAvatarUrl(e.target.value); if (e.target.value.trim()) setAvatarPreview(e.target.value.trim()); }}
                placeholder="https://ik.imagekit.io/VieTureImg/..."
                className="h-10 font-mono text-xs"
              />
              {avatarUrl.trim() && (
                <Button type="button" size="sm" variant="outline" onClick={onRemoveAvatar} className="shrink-0 rounded-xl text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10">
                  <Trash2 className="size-3.5" /> Xóa
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">Nhập link ảnh từ ImageKit hoặc nguồn khác. Hoặc click vào avatar để tải ảnh lên.</p>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <User className="size-3.5" /> Tên hiển thị
            </label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Nhập tên hiển thị..." maxLength={60} className="h-10" />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <Mail className="size-3.5" /> Email
            </label>
            <Input value={profile.email} disabled className="h-10 cursor-not-allowed opacity-60" />
            <p className="text-[11px] text-muted-foreground">Email không thể thay đổi. Liên hệ IT nếu cần.</p>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Bio
            </label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Giới thiệu ngắn về bản thân..."
              maxLength={300}
              rows={3}
              className="resize-none text-sm"
            />
            <p className="text-[11px] text-muted-foreground text-right">{bio.length}/300</p>
          </div>

          {/* Account info chips */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 pt-1">
            {[
              { icon: Shield, label: "Vai trò", value: roleMeta.label },
              { icon: CalendarDays, label: "Tham gia", value: joinDate },
              { icon: Eye, label: "Lượt xem", value: Number(profile.views ?? 0).toLocaleString("vi-VN") },
            ].map(({ icon: Icon, label: l, value }) => (
              <div key={l} className="rounded-xl border border-border bg-muted/30 px-4 py-3 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <Icon className="size-3" /> {l}
                </div>
                <p className="text-sm font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </div>

          <Button onClick={onSaveInfo} disabled={savingInfo} className="w-full gap-2 rounded-xl sm:w-auto">
            <Save className="size-4" />
            {savingInfo ? "Đang lưu..." : "Lưu thông tin"}
          </Button>
        </div>
      )}

      {/* ── TAB: Mạng xã hội ── */}
      {tab === "social" && (
        <div className="glass-card rounded-2xl p-6 space-y-5">
          <h2 className="font-heading text-sm font-bold uppercase tracking-[0.08em] text-foreground flex items-center gap-2">
            <Globe className="size-4 text-muted-foreground" /> Mạng xã hội & Liên hệ
          </h2>

          {[
            { icon: Phone, label: "Số điện thoại", value: phone, setter: setPhone, placeholder: "+84 9xx xxx xxx", type: "tel" },
            { icon: Facebook, label: "Facebook", value: facebookUrl, setter: setFacebookUrl, placeholder: "https://facebook.com/yourname" },
            { icon: TikTokIcon, label: "TikTok", value: tiktokUrl, setter: setTiktokUrl, placeholder: "https://tiktok.com/@yourname" },
            { icon: Instagram, label: "Instagram", value: instagramUrl, setter: setInstagramUrl, placeholder: "https://instagram.com/yourname" },
            { icon: Youtube, label: "YouTube", value: youtubeUrl, setter: setYoutubeUrl, placeholder: "https://youtube.com/@yourname" },
            { icon: Globe, label: "Website", value: websiteUrl, setter: setWebsiteUrl, placeholder: "https://yourwebsite.com" },
          ].map(({ icon: Icon, label: l, value, setter, placeholder, type }) => (
            <div key={l} className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <Icon className="size-3.5" /> {l}
              </label>
              <Input
                value={value}
                onChange={(e) => setter(e.target.value)}
                placeholder={placeholder}
                type={type ?? "url"}
                className="h-10"
              />
            </div>
          ))}

          <Button onClick={onSaveSocial} disabled={savingSocial} className="w-full gap-2 rounded-xl sm:w-auto">
            <Save className="size-4" />
            {savingSocial ? "Đang lưu..." : "Lưu liên hệ & MXH"}
          </Button>
        </div>
      )}

      {/* ── TAB: Bảo mật ── */}
      {tab === "security" && (
        <div className="space-y-5">
          {/* Password */}
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h2 className="font-heading text-sm font-bold uppercase tracking-[0.08em] text-foreground flex items-center gap-2">
              <KeyRound className="size-4 text-muted-foreground" /> Đổi mật khẩu
            </h2>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mật khẩu mới</label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Tối thiểu 6 ký tự..." className="h-10" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Xác nhận mật khẩu</label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Nhập lại..." className="h-10" />
              </div>
              <Button onClick={onChangePassword} disabled={changingPw || !newPassword || !confirmPassword} variant="outline" className="gap-2 rounded-xl">
                <Lock className="size-4" /> {changingPw ? "Đang đổi..." : "Cập nhật mật khẩu"}
              </Button>
            </div>
          </div>

          {/* 2FA */}
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h2 className="font-heading text-sm font-bold uppercase tracking-[0.08em] text-foreground flex items-center gap-2">
              <Smartphone className="size-4 text-muted-foreground" /> Xác thực 2 yếu tố (2FA)
            </h2>
            <p className="text-xs text-muted-foreground">Bảo vệ tài khoản bằng Google Authenticator hoặc Authy.</p>
            {has2FA ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3">
                  <CheckCircle2 className="size-4 text-green-500" />
                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">2FA đang được kích hoạt</span>
                </div>
                {mfaFactors.filter(f => f.status === "verified").map((f) => (
                  <Button key={f.id} variant="outline" onClick={() => onRemove2FA(f.id)} disabled={removingMfa} className="gap-2 rounded-xl border-rose-500/30 text-rose-500 hover:bg-rose-500/10">
                    <Lock className="size-4" /> {removingMfa ? "Đang tắt..." : "Tắt 2FA"}
                  </Button>
                ))}
              </div>
            ) : totpQr ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Quét mã QR bằng ứng dụng xác thực, sau đó nhập mã 6 chữ số.</p>
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={totpQr} alt="2FA QR" className="size-48 rounded-xl border border-border bg-white p-2" />
                </div>
                {totpSecret && (
                  <div className="rounded-xl border border-border bg-muted/30 px-4 py-2.5">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1"><QrCode className="size-3" /> Mã thủ công</p>
                    <code className="font-mono text-sm font-bold tracking-widest text-foreground break-all">{totpSecret}</code>
                  </div>
                )}
                <div className="flex gap-2">
                  <Input value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Nhập mã 6 chữ số..." className="h-10 font-mono tracking-widest" maxLength={6} />
                  <Button onClick={onVerify2FA} disabled={verifyingTotp || totpCode.length < 6} className="gap-2 rounded-xl">
                    <CheckCircle2 className="size-4" /> {verifyingTotp ? "Đang xác nhận..." : "Xác nhận"}
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={onEnroll2FA} disabled={enrolling} variant="outline" className="gap-2 rounded-xl">
                <ShieldCheck className="size-4" /> {enrolling ? "Đang khởi động..." : "Kích hoạt 2FA"}
              </Button>
            )}
          </div>

          {/* Logout */}
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 space-y-3">
            <h2 className="font-heading text-sm font-bold uppercase tracking-[0.06em] text-rose-500">Đăng xuất</h2>
            <p className="text-xs text-muted-foreground">Bạn sẽ cần xác thực lại để truy cập trang quản trị.</p>
            <Button variant="outline" onClick={onLogout} className="gap-2 rounded-xl border-rose-500/30 text-rose-500 hover:bg-rose-500/10">
              <LogOut className="size-4" /> Đăng xuất
            </Button>
          </div>
        </div>
      )}

      {/* ── TAB: Lịch sử đăng nhập ── */}
      {tab === "login_history" && (
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-sm font-bold uppercase tracking-[0.08em] text-foreground flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" /> Lịch sử đăng nhập
            </h2>
            <Button size="sm" variant="outline" onClick={loadLoginLogs} disabled={loadingLogs} className="gap-1.5 rounded-xl text-xs">
              <RefreshCw className={cn("size-3.5", loadingLogs && "animate-spin")} />
              Làm mới
            </Button>
          </div>

          {loadingLogs ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}
            </div>
          ) : loginLogs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <Clock className="size-8 opacity-30" />
              <p className="text-sm">Chưa có lịch sử đăng nhập.</p>
              <p className="text-xs opacity-70">Lịch sử sẽ được ghi lại từ lần đăng nhập tiếp theo.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {loginLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3">
                  <div className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full", log.method === "google" ? "bg-blue-500/10 text-blue-500" : "bg-amber-500/10 text-amber-500")}>
                    {log.method === "google"
                      ? <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                      : <Lock className="size-3.5" />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-xs font-semibold text-foreground capitalize">{log.method === "google" ? "Google OAuth" : "Mật khẩu"}</span>
                      <span className="text-[11px] text-muted-foreground">{timeAgo(log.created_at)}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                      {log.ip && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3 shrink-0" /> {log.ip}
                        </span>
                      )}
                      {log.user_agent && (
                        <span className="flex items-center gap-1 truncate max-w-[280px]">
                          <Monitor className="size-3 shrink-0" /> {parseUa(log.user_agent)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">Hiển thị 30 lần đăng nhập gần nhất.</p>
        </div>
      )}
    </div>
  );
}
