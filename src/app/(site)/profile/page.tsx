"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  User, Mail, Shield, CalendarDays, Eye, Save, LogOut,
  Lock, KeyRound, CheckCircle2, BadgeCheck, QrCode, ShieldCheck,
  Smartphone, Camera, Trash2, Phone, Gamepad2, Plus, ImageIcon,
} from "lucide-react";
import { SOCIAL_DEFS, type SocialKey } from "@/lib/constants/social-links";
import { GAME_LIST } from "@/lib/constants/game-list";
import type { GameProfile } from "@/lib/types/content";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ROLE_META: Record<string, { label: string; color: string }> = {
  super_admin: { label: "Super Admin", color: "text-red-500 bg-red-500/10 border-red-500/30" },
  admin:       { label: "Admin",       color: "text-amber-500 bg-amber-500/10 border-amber-500/30" },
  it:          { label: "IT",          color: "text-violet-500 bg-violet-500/10 border-violet-500/30" },
  manager:     { label: "Quản Lý",     color: "text-blue-500 bg-blue-500/10 border-blue-500/30" },
  support:     { label: "CSKH",        color: "text-green-500 bg-green-500/10 border-green-500/30" },
  user:        { label: "Người Dùng",  color: "text-muted-foreground bg-muted border-border" },
};

const AVATAR_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-purple-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-green-500 to-emerald-600",
  "from-red-500 to-rose-600",
  "from-cyan-500 to-teal-600",
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
  banner_url?: string | null;
  bio?: string | null;
  phone?: string | null;
  ff_id?: string | null;
  game_profiles?: GameProfile[];
  contact_email?: string | null;
} & Partial<Record<`${SocialKey}_url` & string, string | null>>;

type TotpFactor = {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [ffId, setFfId] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [socials, setSocials] = useState<Record<string, string>>(
    Object.fromEntries(SOCIAL_DEFS.map((s) => [s.field, ""])),
  );
  const [games, setGames] = useState<GameProfile[]>([]);
  const [saving, setSaving] = useState(false);

  // Avatar upload
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Banner upload
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  // Password change
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

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data: ProfileData) => {
        if (!data.email) { router.replace("/login"); return; }
        setProfile(data);
        setDisplayName(data.display_name ?? "");
        setBio(data.bio ?? "");
        setPhone(data.phone ?? "");
        setFfId(data.ff_id ?? "");
        setContactEmail(data.contact_email ?? "");
        const next: Record<string, string> = {};
        for (const s of SOCIAL_DEFS) {
          next[s.field] = (data as unknown as Record<string, string | null | undefined>)[s.field] ?? "";
        }
        setSocials(next);
        setGames(Array.isArray(data.game_profiles) ? data.game_profiles : []);
        setAvatarPreview(data.avatar_url ?? null);
        setBannerPreview(data.banner_url ?? null);
        setLoading(false);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  useEffect(() => {
    if (!loading) loadMfaFactors();
  }, [loading]);

  async function loadMfaFactors() {
    const supabase = createClient();
    if (!supabase) return;
    const { data } = await supabase.auth.mfa.listFactors();
    setMfaFactors((data?.totp ?? []) as TotpFactor[]);
  }

  const onAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh tối đa 5MB.");
      return;
    }

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);

    setUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/user/avatar", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? "Không thể tải ảnh lên.");
        setAvatarPreview(profile?.avatar_url ?? null);
        return;
      }
      const { avatar_url } = await res.json() as { avatar_url: string };
      setAvatarPreview(avatar_url);
      setProfile((prev) => prev ? { ...prev, avatar_url } : prev);
      toast.success("Đã cập nhật ảnh đại diện.");
    } catch {
      toast.error("Lỗi mạng.");
      setAvatarPreview(profile?.avatar_url ?? null);
    } finally {
      setUploadingAvatar(false);
      URL.revokeObjectURL(objectUrl);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onRemoveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      const res = await fetch("/api/user/avatar", { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? "Không thể xóa ảnh.");
        return;
      }
      setAvatarPreview(null);
      setProfile((prev) => prev ? { ...prev, avatar_url: null } : prev);
      toast.success("Đã xóa ảnh đại diện.");
    } catch {
      toast.error("Lỗi mạng.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast.error("Ảnh bìa tối đa 8MB."); return; }
    const objectUrl = URL.createObjectURL(file);
    setBannerPreview(objectUrl);
    setUploadingBanner(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/user/banner", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? "Không thể tải ảnh bìa.");
        setBannerPreview(profile?.banner_url ?? null);
        return;
      }
      const { banner_url } = await res.json() as { banner_url: string };
      setBannerPreview(banner_url);
      setProfile((prev) => prev ? { ...prev, banner_url } : prev);
      toast.success("Đã cập nhật ảnh bìa.");
    } catch {
      toast.error("Lỗi mạng.");
      setBannerPreview(profile?.banner_url ?? null);
    } finally {
      setUploadingBanner(false);
      URL.revokeObjectURL(objectUrl);
      if (bannerInputRef.current) bannerInputRef.current.value = "";
    }
  };

  const onRemoveBanner = async () => {
    setUploadingBanner(true);
    try {
      const res = await fetch("/api/user/banner", { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? "Không thể xóa ảnh bìa."); return;
      }
      setBannerPreview(null);
      setProfile((prev) => prev ? { ...prev, banner_url: null } : prev);
      toast.success("Đã xóa ảnh bìa.");
    } catch { toast.error("Lỗi mạng."); }
    finally { setUploadingBanner(false); }
  };

  const onSave = async () => {
    if (!displayName.trim()) { toast.error("Tên hiển thị không được để trống."); return; }
    setSaving(true);
    try {
      const trimmedSocials: Record<string, string> = {};
      for (const s of SOCIAL_DEFS) trimmedSocials[s.field] = (socials[s.field] ?? "").trim();
      const cleanGames = games
        .map((g) => ({
          game: g.game.trim(),
          custom_label: g.custom_label?.trim() || undefined,
          uid: g.uid.trim(),
          nickname: g.nickname?.trim() || undefined,
        }))
        .filter((g) => g.game && g.uid);
      const payload = {
        display_name: displayName.trim(),
        bio: bio.trim(),
        phone: phone.trim(),
        ff_id: ffId.trim(),
        contact_email: contactEmail.trim(),
        game_profiles: cleanGames,
        ...trimmedSocials,
      };
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error ?? "Không thể cập nhật hồ sơ."); return;
      }
      toast.success("Đã cập nhật hồ sơ.");
      setProfile((prev) => prev ? { ...prev, ...payload } : prev);
    } catch { toast.error("Lỗi mạng, không thể lưu thay đổi."); }
    finally { setSaving(false); }
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
      setNewPassword("");
      setConfirmPassword("");
    } catch { toast.error("Lỗi mạng."); }
    finally { setChangingPw(false); }
  };

  const onEnroll2FA = async () => {
    setEnrolling(true);
    try {
      const supabase = createClient();
      if (!supabase) { toast.error("Lỗi kết nối."); return; }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error || !data) { toast.error(error?.message ?? "Không thể khởi động 2FA."); return; }
      setTotpFactorId(data.id);
      setTotpQr(data.totp.qr_code);
      setTotpSecret(data.totp.secret);
    } catch { toast.error("Lỗi mạng."); }
    finally { setEnrolling(false); }
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
      await loadMfaFactors();
    } catch { toast.error("Lỗi mạng."); }
    finally { setVerifyingTotp(false); }
  };

  const onRemove2FA = async (factorId: string) => {
    setRemovingMfa(true);
    try {
      const supabase = createClient();
      if (!supabase) { toast.error("Lỗi kết nối."); return; }
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) { toast.error(error.message); return; }
      toast.success("Đã tắt xác thực 2 yếu tố.");
      await loadMfaFactors();
    } catch { toast.error("Lỗi mạng."); }
    finally { setRemovingMfa(false); }
  };

  const onLogout = async () => {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (loading) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto max-w-2xl px-6 py-16">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (!profile) return null;

  const label = displayName.trim() || profile.display_name || profile.email.split("@")[0];
  const initial = label.charAt(0).toUpperCase();
  const avatarGradient = getAvatarColor(profile.email);
  const roleMeta = ROLE_META[profile.role] ?? ROLE_META.user;
  const _joinDateObj = new Date(profile.created_at ?? "");
  const joinDate = Number.isNaN(_joinDateObj.getTime()) ? "-" : _joinDateObj.toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
  const isDirty =
    displayName.trim() !== (profile.display_name ?? "") ||
    bio.trim() !== (profile.bio ?? "") ||
    phone.trim() !== (profile.phone ?? "") ||
    ffId.trim() !== (profile.ff_id ?? "") ||
    contactEmail.trim() !== (profile.contact_email ?? "") ||
    SOCIAL_DEFS.some((s) =>
      (socials[s.field] ?? "").trim() !==
      (((profile as unknown as Record<string, string | null | undefined>)[s.field]) ?? ""),
    ) ||
    JSON.stringify(games) !== JSON.stringify(profile.game_profiles ?? []);
  const has2FA = mfaFactors.some((f) => f.status === "verified");

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="border-b border-border bg-muted/30 py-10">
        <div className="mx-auto max-w-2xl px-6">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">

            {/* Avatar with upload overlay */}
            <div className="relative shrink-0">
              <div
                className={cn(
                  "flex size-20 items-center justify-center rounded-2xl text-3xl font-extrabold text-white shadow-lg overflow-hidden",
                  !avatarPreview && `bg-gradient-to-br ${avatarGradient}`,
                )}
              >
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    className="size-full object-cover"
                  />
                ) : initial}
              </div>

              {/* Upload button overlay */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                title="Đổi ảnh đại diện"
                className={cn(
                  "absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 opacity-0 transition-opacity hover:opacity-100",
                  uploadingAvatar && "opacity-100 cursor-wait",
                )}
              >
                {uploadingAvatar
                  ? <div className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  : <Camera className="size-5 text-white" />
                }
              </button>

              {/* Remove avatar button */}
              {avatarPreview && !uploadingAvatar && (
                <button
                  type="button"
                  onClick={onRemoveAvatar}
                  title="Xóa ảnh đại diện"
                  className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-white shadow hover:brightness-110"
                >
                  <Trash2 className="size-3" />
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={onAvatarFileChange}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h1 className="inline-flex items-center gap-1.5 font-heading text-2xl font-black uppercase tracking-[0.06em] text-foreground">
                  {label}
                  {profile.is_verified && (
                    <BadgeCheck aria-label="Đã được xác minh bởi IT" className="size-6 shrink-0 text-blue-500" />
                  )}
                </h1>
                <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide", roleMeta.color)}>
                  {roleMeta.label}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{profile.email}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground sm:justify-start">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" />
                  Tham gia {joinDate}
                </span>
                <span className="flex items-center gap-1.5">
                  <Eye className="size-3.5" />
                  {Number(profile.views ?? 0).toLocaleString("vi-VN")} lượt xem
                </span>
                {has2FA && (
                  <span className="flex items-center gap-1.5 text-green-500">
                    <ShieldCheck className="size-3.5" /> 2FA đang bật
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="space-y-5">

          {/* Display name + avatar upload hint */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 font-heading text-base font-bold uppercase tracking-[0.06em] text-foreground">
              Thông tin cá nhân
            </h2>
            <div className="space-y-4">

              {/* Avatar upload section */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  <Camera className="size-3.5" /> Ảnh đại diện
                </label>
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "flex size-14 shrink-0 items-center justify-center rounded-xl text-lg font-extrabold text-white shadow overflow-hidden",
                      !avatarPreview && `bg-gradient-to-br ${avatarGradient}`,
                    )}
                  >
                    {avatarPreview
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={avatarPreview} alt="Avatar" className="size-full object-cover" />
                      : initial}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={uploadingAvatar}
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-1.5 rounded-xl text-xs"
                    >
                      <Camera className="size-3.5" />
                      {uploadingAvatar ? "Đang tải..." : "Chọn ảnh"}
                    </Button>
                    {avatarPreview && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={uploadingAvatar}
                        onClick={onRemoveAvatar}
                        className="gap-1.5 rounded-xl text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                        Xóa
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  JPEG, PNG, WebP hoặc GIF. Tối đa 5MB.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  <User className="size-3.5" /> Tên hiển thị
                </label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Nhập tên hiển thị..."
                  maxLength={60}
                  className="h-10"
                />
                <p className="text-[11px] text-muted-foreground">
                  Tên này sẽ hiển thị trên bình luận và hồ sơ công khai. Tối đa 60 ký tự.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  <Mail className="size-3.5" /> Email
                </label>
                <Input value={profile.email} disabled className="h-10 cursor-not-allowed opacity-60" />
                <p className="text-[11px] text-muted-foreground">
                  Email không thể thay đổi từ hồ sơ. Liên hệ quản trị viên nếu cần.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Giới thiệu
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 300))}
                  placeholder="Vài dòng về bạn..."
                  rows={3}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <p className="text-[11px] text-muted-foreground">{bio.length}/300 ký tự</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    <Phone className="size-3.5" /> Số điện thoại
                  </label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0xxxxxxxxx" maxLength={20} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    <Gamepad2 className="size-3.5 text-amber-500" />
                    ID Free Fire
                    <span className="ml-auto text-[10px] font-normal text-muted-foreground/60 normal-case tracking-normal">Dùng cho giải đấu</span>
                  </label>
                  <div className="relative">
                    <Input
                      value={ffId}
                      onChange={(e) => setFfId(e.target.value.replace(/\D/g, "").slice(0, 12))}
                      placeholder="vd: 123456789"
                      maxLength={12}
                      className="h-10 font-mono pr-16"
                    />
                    {ffId && !/^\d{6,12}$/.test(ffId) && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-red-400">6–12 số</span>
                    )}
                    {ffId && /^\d{6,12}$/.test(ffId) && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-emerald-400">✓</span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Mỗi tài khoản chỉ được liên kết 1 FF ID. Unique — tránh clone.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    <Mail className="size-3.5" /> Email cá nhân (liên hệ)
                  </label>
                  <Input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="contact@example.com"
                    maxLength={120}
                    className="h-10"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {SOCIAL_DEFS.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.field} className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        <Icon className="size-3.5" /> {s.label}
                      </label>
                      <Input
                        value={socials[s.field] ?? ""}
                        onChange={(e) => setSocials((prev) => ({ ...prev, [s.field]: e.target.value }))}
                        placeholder={s.placeholder}
                        className="h-10"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  <Gamepad2 className="size-3.5" /> ID game đang chơi
                </label>
                <div className="space-y-2">
                  {games.map((g, idx) => {
                    const isOther = g.game === "other";
                    return (
                      <div key={idx} className="grid gap-2 rounded-xl border border-border bg-muted/30 p-2.5 sm:grid-cols-[140px,1fr,1fr,auto]">
                        <select
                          value={g.game}
                          onChange={(e) => {
                            const next = [...games];
                            next[idx] = { ...next[idx], game: e.target.value };
                            setGames(next);
                          }}
                          className="h-9 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        >
                          {GAME_LIST.map((opt) => (
                            <option key={opt.key} value={opt.key}>{opt.label}</option>
                          ))}
                        </select>
                        {isOther ? (
                          <Input
                            value={g.custom_label ?? ""}
                            onChange={(e) => {
                              const next = [...games];
                              next[idx] = { ...next[idx], custom_label: e.target.value };
                              setGames(next);
                            }}
                            placeholder="Tên game"
                            maxLength={40}
                            className="h-9"
                          />
                        ) : (
                          <Input
                            value={g.nickname ?? ""}
                            onChange={(e) => {
                              const next = [...games];
                              next[idx] = { ...next[idx], nickname: e.target.value };
                              setGames(next);
                            }}
                            placeholder="Nickname trong game (tuỳ chọn)"
                            maxLength={60}
                            className="h-9"
                          />
                        )}
                        <Input
                          value={g.uid}
                          onChange={(e) => {
                            const next = [...games];
                            next[idx] = { ...next[idx], uid: e.target.value };
                            setGames(next);
                          }}
                          placeholder={GAME_LIST.find((x) => x.key === g.game)?.hint ?? "ID game"}
                          maxLength={60}
                          className="h-9"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setGames(games.filter((_, i) => i !== idx))}
                          className="h-9 gap-1 rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                  {games.length < 20 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setGames([...games, { game: "free_fire", uid: "" }])}
                      className="gap-1.5 rounded-xl text-xs"
                    >
                      <Plus className="size-3.5" /> Thêm game
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  ID hiển thị công khai trên hồ sơ /u/{profile.id.slice(0, 8)}…. Tối đa 20 game.
                </p>
              </div>

              <Button onClick={onSave} disabled={saving || !isDirty} className="w-full gap-2 rounded-xl sm:w-auto">
                <Save className="size-4" />
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          </div>

          {/* Password change */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 font-heading text-base font-bold uppercase tracking-[0.06em] text-foreground flex items-center gap-2">
              <KeyRound className="size-4 text-muted-foreground" /> Đổi mật khẩu
            </h2>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Mật khẩu mới
                </label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự..."
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Xác nhận mật khẩu mới
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu..."
                  className="h-10"
                />
              </div>
              <Button
                onClick={onChangePassword}
                disabled={changingPw || !newPassword || !confirmPassword}
                variant="outline"
                className="w-full gap-2 rounded-xl sm:w-auto"
              >
                <Lock className="size-4" />
                {changingPw ? "Đang đổi..." : "Cập nhật mật khẩu"}
              </Button>
            </div>
          </div>

          {/* 2FA */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-1 font-heading text-base font-bold uppercase tracking-[0.06em] text-foreground flex items-center gap-2">
              <Smartphone className="size-4 text-muted-foreground" /> Xác thực 2 yếu tố (2FA)
            </h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Bảo vệ tài khoản bằng ứng dụng xác thực như Google Authenticator hoặc Authy.
            </p>

            {has2FA ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3">
                  <CheckCircle2 className="size-4 text-green-500" />
                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">2FA đang được kích hoạt</span>
                </div>
                {mfaFactors.filter(f => f.status === "verified").map((f) => (
                  <Button
                    key={f.id}
                    variant="outline"
                    onClick={() => onRemove2FA(f.id)}
                    disabled={removingMfa}
                    className="gap-2 rounded-xl border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
                  >
                    <Lock className="size-4" />
                    {removingMfa ? "Đang tắt..." : "Tắt 2FA"}
                  </Button>
                ))}
              </div>
            ) : totpQr ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Quét mã QR bằng ứng dụng xác thực, sau đó nhập mã 6 chữ số để xác nhận.
                </p>
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={totpQr} alt="2FA QR Code" className="size-48 rounded-xl border border-border bg-white p-2" />
                </div>
                {totpSecret && (
                  <div className="rounded-xl border border-border bg-muted/30 px-4 py-2.5">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                      <QrCode className="size-3" /> Mã thủ công
                    </p>
                    <code className="font-mono text-sm font-bold tracking-widest text-foreground break-all">
                      {totpSecret}
                    </code>
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Nhập mã 6 chữ số..."
                    className="h-10 font-mono tracking-widest"
                    maxLength={6}
                  />
                  <Button onClick={onVerify2FA} disabled={verifyingTotp || totpCode.length < 6} className="gap-2 rounded-xl">
                    <CheckCircle2 className="size-4" />
                    {verifyingTotp ? "Đang xác nhận..." : "Xác nhận"}
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={onEnroll2FA} disabled={enrolling} variant="outline" className="gap-2 rounded-xl">
                <ShieldCheck className="size-4" />
                {enrolling ? "Đang khởi động..." : "Kích hoạt 2FA"}
              </Button>
            )}
          </div>

          {/* Account info */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 font-heading text-base font-bold uppercase tracking-[0.06em] text-foreground">
              Thông tin tài khoản
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: Shield,       label: "Vai trò",        value: roleMeta.label },
                { icon: CalendarDays, label: "Ngày tham gia",  value: joinDate },
                { icon: Eye,          label: "Lượt xem",       value: Number(profile.views ?? 0).toLocaleString("vi-VN") },
              ].map(({ icon: Icon, label: l, value }) => (
                <div key={l} className="flex flex-col gap-1.5 rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <Icon className="size-3" /> {l}
                  </div>
                  <p className="text-sm font-semibold text-foreground">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Danger zone */}
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6">
            <h2 className="mb-1 font-heading text-base font-bold uppercase tracking-[0.06em] text-rose-500">
              Đăng xuất
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Bạn sẽ được chuyển về trang đăng nhập và cần xác thực lại để truy cập.
            </p>
            <Button
              variant="outline"
              onClick={onLogout}
              className="gap-2 rounded-xl border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
            >
              <LogOut className="size-4" />
              Đăng xuất khỏi tài khoản
            </Button>
          </div>

        </div>
      </div>
    </main>
  );
}
