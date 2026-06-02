"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  User, Mail, Shield, CalendarDays, Eye, Save, LogOut,
  Lock, KeyRound, CheckCircle2, BadgeCheck, QrCode, ShieldCheck,
  Smartphone, Camera, Trash2, Phone, Gamepad2, Plus, ImageIcon,
  Bookmark, Bell, X, Trophy, MessageSquare, BookOpen, ExternalLink,
} from "lucide-react";
import { AchievementsDisplay } from "@/components/profile/achievements-display";
import { CosmeticsSelector } from "@/components/profile/cosmetics-selector";
import Image from "next/image";
import { getRank, getSubRank, getRankProgress, getPointsToNextRank } from "@/lib/constants/ranks";
import Link from "next/link";
import { SOCIAL_DEFS, type SocialKey } from "@/lib/constants/social-links";
import { GAME_LIST } from "@/lib/constants/game-list";
import type { GameProfile } from "@/lib/types/content";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ROLE_META: Record<string, { label: string; color: string; banner: string }> = {
  super_admin: { label: "Super Admin", color: "text-red-500 bg-red-500/10 border-red-500/30",       banner: "from-red-950 via-rose-900 to-pink-950" },
  admin:       { label: "Admin",       color: "text-amber-500 bg-amber-500/10 border-amber-500/30", banner: "from-amber-950 via-orange-900 to-yellow-950" },
  it:          { label: "IT",          color: "text-violet-500 bg-violet-500/10 border-violet-500/30", banner: "from-violet-950 via-purple-900 to-fuchsia-950" },
  manager:     { label: "Quản Lý",     color: "text-blue-500 bg-blue-500/10 border-blue-500/30",    banner: "from-blue-950 via-indigo-900 to-blue-950" },
  support:     { label: "CSKH",        color: "text-green-500 bg-green-500/10 border-green-500/30", banner: "from-green-950 via-emerald-900 to-teal-950" },
  user:        { label: "Người Dùng",  color: "text-muted-foreground bg-muted border-border",        banner: "from-slate-800 via-slate-700 to-slate-800" },
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

type FavoriteItem = {
  id: string;
  item_type: string;
  item_id: string;
  item_title: string | null;
  item_image: string | null;
  created_at: string;
};

type TotpFactor = {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
};

type ActiveTab = "profile" | "activity" | "achievements" | "security";

const TABS: { key: ActiveTab; label: string; icon: React.ElementType }[] = [
  { key: "profile",      label: "Hồ sơ",      icon: User },
  { key: "activity",     label: "Hoạt động",   icon: MessageSquare },
  { key: "achievements", label: "Thành tích",  icon: Trophy },
  { key: "security",     label: "Bảo mật",     icon: ShieldCheck },
];

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

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const [bookmarks, setBookmarks] = useState<FavoriteItem[]>([]);
  const [follows, setFollows] = useState<string[]>([]);
  const [achievements, setAchievements] = useState<{ achievement: string; earned_at: string }[]>([]);
  const [myPosts, setMyPosts] = useState<Array<{ id: string; title: string; category: string; view_count: number; reply_count: number; status: string; created_at: string }>>([]);
  const [myWiki, setMyWiki] = useState<Array<{ id: string; slug: string; title: string; category: string; status: string; view_count: number; created_at: string }>>([]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  const [mfaFactors, setMfaFactors] = useState<TotpFactor[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [totpQr, setTotpQr] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [totpFactorId, setTotpFactorId] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [verifyingTotp, setVerifyingTotp] = useState(false);
  const [removingMfa, setRemovingMfa] = useState(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>("profile");
  const [statsLoaded, setStatsLoaded] = useState(false);

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
        void Promise.all([
          fetch("/api/user/favorites").then((r) => r.json()).then((d: FavoriteItem[]) => setBookmarks(d ?? [])).catch(() => null),
          fetch("/api/user/follows").then((r) => r.json()).then((d: { follows?: string[] }) => setFollows(d.follows ?? [])).catch(() => null),
          fetch("/api/user/achievements").then((r) => r.json()).then((d: { achievement: string; earned_at: string }[]) => setAchievements(d ?? [])).catch(() => null),
          fetch("/api/user/posts").then((r) => r.json()).then((d: { posts: Array<{ id: string; title: string; category: string; view_count: number; reply_count: number; status: string; created_at: string }> }) => setMyPosts(d.posts ?? [])).catch(() => null),
          fetch("/api/user/wiki").then((r) => r.json()).then((d: { articles: Array<{ id: string; slug: string; title: string; category: string; status: string; view_count: number; created_at: string }> }) => setMyWiki(d.articles ?? [])).catch(() => null),
        ]).then(() => setStatsLoaded(true));
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
    if (file.size > 5 * 1024 * 1024) { toast.error("Ảnh tối đa 5MB."); return; }
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
    } catch { toast.error("Lỗi mạng."); }
    finally { setUploadingAvatar(false); }
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

  const removeBookmark = async (item: FavoriteItem) => {
    await fetch(`/api/user/favorites?item_type=${item.item_type}&item_id=${item.item_id}`, { method: "DELETE" });
    setBookmarks((prev) => prev.filter((b) => b.id !== item.id));
  };

  const unfollowCategory = async (cat: string) => {
    await fetch("/api/user/follows", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: cat }),
    });
    setFollows((prev) => prev.filter((f) => f !== cat));
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
        <div className="mx-auto max-w-2xl px-4 py-8 space-y-4">
          <div className="h-32 animate-pulse rounded-3xl bg-muted" />
          <div className="flex items-end gap-4 -mt-10 px-4">
            <div className="size-20 rounded-2xl animate-pulse bg-muted border-4 border-background shrink-0" />
            <div className="pb-2 space-y-2 flex-1">
              <div className="h-5 w-36 animate-pulse rounded bg-muted" />
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            </div>
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-border bg-card p-5 space-y-3">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-10 rounded-xl bg-muted" />
              <div className="h-10 rounded-xl bg-muted" />
            </div>
          ))}
        </div>
      </main>
    );
  }

  if (!profile) return null;

  const label = displayName.trim() || profile.display_name || profile.email.split("@")[0];
  const initial = label.charAt(0).toUpperCase();
  const avatarGradient = getAvatarColor(profile.email);
  const roleMeta = ROLE_META[profile.role] ?? ROLE_META.user;
  const userPoints = Number((profile as unknown as { points?: number }).points ?? 0);
  const rankMeta = getRank(userPoints);
  const subRank = getSubRank(userPoints);
  const rankProgress = getRankProgress(userPoints);
  const pointsToNext = getPointsToNextRank(userPoints);
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
      <section className="border-b border-border">
        {/* Banner */}
        <div className="relative h-48 overflow-hidden sm:h-60">
          {bannerPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bannerPreview} alt="Banner" className="size-full object-cover" />
          ) : (
            <>
              <div className={cn("absolute inset-0 bg-gradient-to-br", roleMeta.banner)} />
              <div className="pointer-events-none absolute inset-0 opacity-[0.15]"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}
              />
            </>
          )}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.35)_100%)]" />
          <div className="absolute right-3 top-3 flex items-center gap-1.5">
            {bannerPreview && !uploadingBanner && (
              <button type="button" onClick={onRemoveBanner} title="Xóa ảnh bìa"
                className="flex size-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md transition-colors hover:bg-black/75">
                <Trash2 className="size-3.5" />
              </button>
            )}
            <button type="button" onClick={() => bannerInputRef.current?.click()} disabled={uploadingBanner} title="Đổi ảnh bìa"
              className="flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md transition-colors hover:bg-black/75 disabled:cursor-wait">
              {uploadingBanner
                ? <div className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                : <ImageIcon className="size-3.5" />}
              {uploadingBanner ? "Đang tải..." : "Đổi ảnh bìa"}
            </button>
          </div>
          <input ref={bannerInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onBannerFileChange} />
        </div>

        {/* Profile info */}
        <div className="mx-auto max-w-2xl px-6 pb-5">
          <div className="-mt-14 flex flex-col items-center gap-4 text-center sm:-mt-16 sm:flex-row sm:items-end sm:gap-6 sm:text-left">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className={cn("size-28 overflow-hidden rounded-full ring-4 ring-background shadow-xl sm:size-32",
                !avatarPreview && `bg-gradient-to-br ${avatarGradient}`)}>
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt="Avatar" className="size-full object-cover" />
                ) : (
                  <div className={cn("flex size-full items-center justify-center text-4xl font-black text-white bg-gradient-to-br", avatarGradient)}>
                    {initial}
                  </div>
                )}
              </div>
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar} title="Đổi ảnh đại diện"
                className="absolute bottom-1 right-1 flex size-8 items-center justify-center rounded-full border-2 border-background bg-card shadow-lg transition-colors hover:bg-muted disabled:cursor-wait sm:size-9">
                {uploadingAvatar
                  ? <div className="size-3.5 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
                  : <Camera className="size-3.5 text-foreground" />}
              </button>
              {avatarPreview && !uploadingAvatar && (
                <button type="button" onClick={onRemoveAvatar} title="Xóa ảnh đại diện"
                  className="absolute right-0 top-0.5 flex size-5 items-center justify-center rounded-full bg-destructive text-white shadow-md hover:brightness-110">
                  <X className="size-3" />
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={onAvatarFileChange} />
            </div>

            {/* Name + meta */}
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h1 className="font-heading text-2xl font-black uppercase tracking-[0.06em] text-foreground">{label}</h1>
                {profile.is_verified && (
                  <BadgeCheck aria-label="Đã được xác minh" className="size-6 shrink-0 text-blue-500 dark:text-amber-400" />
                )}
                <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide", roleMeta.color)}>
                  {roleMeta.label}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{profile.email}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground sm:justify-start">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" /> Tham gia {joinDate}
                </span>
                <span className="flex items-center gap-1.5">
                  <Eye className="size-3.5" /> {Number(profile.views ?? 0).toLocaleString("vi-VN")} lượt xem
                </span>
                {ffId && /^\d{6,12}$/.test(ffId) && (
                  <span className="flex items-center gap-1.5 text-amber-500 font-mono font-semibold">
                    <Gamepad2 className="size-3.5" /> {ffId}
                  </span>
                )}
                {has2FA && (
                  <span className="flex items-center gap-1.5 text-green-500">
                    <ShieldCheck className="size-3.5" /> 2FA đang bật
                  </span>
                )}
              </div>

              {/* Bio */}
              {bio.trim() && (
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground line-clamp-2 text-center sm:text-left">
                  {bio.trim()}
                </p>
              )}

              {/* Social links */}
              {SOCIAL_DEFS.some((s) => (socials[s.field] ?? "").trim()) && (
                <div className="mt-2.5 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                  {SOCIAL_DEFS.filter((s) => (socials[s.field] ?? "").trim()).map((s) => {
                    const Icon = s.icon;
                    return (
                      <a key={s.field} href={socials[s.field]} target="_blank" rel="noopener noreferrer"
                        title={s.label}
                        className={cn("flex size-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors", s.brand)}>
                        <Icon className="size-3.5" />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/50 pt-4">
            <Link href={`/u/${profile.id}`}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline dark:text-amber-400">
              <ExternalLink className="size-3" /> Xem hồ sơ công khai
            </Link>
            <div className="ml-auto flex flex-wrap items-center gap-3 text-[11px] font-semibold text-muted-foreground">
              <span className="flex items-center gap-1">
                <MessageSquare className="size-3" />
                <span className={!statsLoaded ? "opacity-40" : ""}>{statsLoaded ? myPosts.length : "—"}</span>
                <span className="hidden sm:inline">bài</span>
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="size-3" />
                <span className={!statsLoaded ? "opacity-40" : ""}>{statsLoaded ? myWiki.length : "—"}</span>
                <span className="hidden sm:inline">wiki</span>
              </span>
              <span className="flex items-center gap-1">
                <Bookmark className="size-3" />
                <span className={!statsLoaded ? "opacity-40" : ""}>{statsLoaded ? bookmarks.length : "—"}</span>
                <span className="hidden sm:inline">đã lưu</span>
              </span>
              <span className="flex items-center gap-1">
                <Bell className="size-3" />
                <span className={!statsLoaded ? "opacity-40" : ""}>{statsLoaded ? follows.length : "—"}</span>
                <span className="hidden sm:inline">theo dõi</span>
              </span>
              <span className="flex items-center gap-1">
                <Trophy className="size-3" />
                <span className={!statsLoaded ? "opacity-40" : ""}>{statsLoaded ? achievements.length : "—"}</span>
                <span className="hidden sm:inline">thành tích</span>
              </span>
              <span className="flex items-center gap-1 text-primary dark:text-amber-400 border-l border-border/50 pl-3">
                <span className="text-base leading-none">{rankMeta.icon}</span>
                <span>{rankMeta.rank} {subRank}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Tabs nav */}
        <div className="mx-auto max-w-2xl px-6">
          <div className="flex gap-0 overflow-x-auto">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] transition-colors",
                    activeTab === t.key
                      ? "border-primary text-primary dark:border-amber-400 dark:text-amber-400"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Tab content */}
      <div className="mx-auto max-w-2xl px-6 py-6">

        {/* ── Tab: Hồ sơ ── */}
        {activeTab === "profile" && (
          <div className="space-y-5">

            {/* Activity overview */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="h-4 w-0.5 rounded-full bg-primary dark:bg-amber-400" />
                <h2 className="font-heading text-sm font-black uppercase tracking-[0.18em] text-primary dark:text-amber-400">
                  Tổng quan hoạt động
                </h2>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {[
                  { icon: MessageSquare, label: "Bài viết",   value: statsLoaded ? myPosts.length    : null, color: "text-blue-500",   bg: "bg-blue-500/10" },
                  { icon: BookOpen,      label: "Wiki",        value: statsLoaded ? myWiki.length     : null, color: "text-emerald-500",bg: "bg-emerald-500/10" },
                  { icon: Trophy,        label: "Thành tích",  value: statsLoaded ? achievements.length : null, color: "text-amber-500", bg: "bg-amber-500/10" },
                  { icon: Bookmark,      label: "Đã lưu",      value: statsLoaded ? bookmarks.length  : null, color: "text-purple-500", bg: "bg-purple-500/10" },
                  { icon: Bell,          label: "Theo dõi",    value: statsLoaded ? follows.length    : null, color: "text-pink-500",   bg: "bg-pink-500/10" },
                  { icon: Eye,           label: "Lượt xem",    value: Number(profile.views ?? 0),              color: "text-cyan-500",   bg: "bg-cyan-500/10" },
                ].map(({ icon: Icon, label, value, color, bg }) => (
                  <div key={label} className={cn("flex flex-col items-center gap-1.5 rounded-xl p-3 text-center", bg)}>
                    <Icon className={cn("size-4", color)} />
                    <span className="text-lg font-black tabular-nums text-foreground leading-none">
                      {value === null ? "—" : value.toLocaleString("vi-VN")}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Thông tin cá nhân */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-5 flex items-center gap-2.5">
                <span className="h-4 w-0.5 rounded-full bg-primary dark:bg-amber-400" />
                <h2 className="font-heading text-sm font-black uppercase tracking-[0.18em] text-primary dark:text-amber-400">
                  Thông tin cá nhân
                </h2>
              </div>
              <div className="space-y-4">
                {/* Avatar upload */}
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    <Camera className="size-3.5" /> Ảnh đại diện
                  </label>
                  <div className="flex items-center gap-4">
                    <div className={cn("flex size-14 shrink-0 items-center justify-center rounded-xl text-lg font-extrabold text-white shadow overflow-hidden",
                      !avatarPreview && `bg-gradient-to-br ${avatarGradient}`)}>
                      {avatarPreview
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={avatarPreview} alt="Avatar" className="size-full object-cover" />
                        : initial}
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="outline" disabled={uploadingAvatar}
                        onClick={() => fileInputRef.current?.click()} className="gap-1.5 rounded-xl text-xs">
                        <Camera className="size-3.5" />
                        {uploadingAvatar ? "Đang tải..." : "Chọn ảnh"}
                      </Button>
                      {avatarPreview && (
                        <Button type="button" size="sm" variant="ghost" disabled={uploadingAvatar}
                          onClick={onRemoveAvatar}
                          className="gap-1.5 rounded-xl text-xs text-destructive hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="size-3.5" /> Xóa
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">JPEG, PNG, WebP hoặc GIF. Tối đa 5MB.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    <User className="size-3.5" /> Tên hiển thị
                  </label>
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Nhập tên hiển thị..." maxLength={60} className="h-10" />
                  <p className="text-[11px] text-muted-foreground">Tối đa 60 ký tự.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    <Mail className="size-3.5" /> Email
                  </label>
                  <Input value={profile.email} disabled className="h-10 cursor-not-allowed opacity-60" />
                  <p className="text-[11px] text-muted-foreground">Liên hệ quản trị viên nếu cần đổi email.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Giới thiệu</label>
                  <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 300))}
                    placeholder="Vài dòng về bạn..." rows={3}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
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
                      <Gamepad2 className="size-3.5 text-amber-500" /> ID Free Fire
                      <span className="ml-auto text-[10px] font-normal text-muted-foreground/60 normal-case tracking-normal">Dùng cho giải đấu</span>
                    </label>
                    <div className="relative">
                      <Input value={ffId} onChange={(e) => setFfId(e.target.value.replace(/\D/g, "").slice(0, 12))}
                        placeholder="vd: 123456789" maxLength={12} className="h-10 font-mono pr-16" />
                      {ffId && !/^\d{6,12}$/.test(ffId) && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-red-400">6–12 số</span>
                      )}
                      {ffId && /^\d{6,12}$/.test(ffId) && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-emerald-400">✓</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">Mỗi tài khoản chỉ được liên kết 1 FF ID.</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      <Mail className="size-3.5" /> Email cá nhân (liên hệ)
                    </label>
                    <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="contact@example.com" maxLength={120} className="h-10" />
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
                        <Input value={socials[s.field] ?? ""}
                          onChange={(e) => setSocials((prev) => ({ ...prev, [s.field]: e.target.value }))}
                          placeholder={s.placeholder} className="h-10" />
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
                          <select value={g.game} onChange={(e) => { const next = [...games]; next[idx] = { ...next[idx], game: e.target.value }; setGames(next); }}
                            className="h-9 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                            {GAME_LIST.map((opt) => (<option key={opt.key} value={opt.key}>{opt.label}</option>))}
                          </select>
                          {isOther ? (
                            <Input value={g.custom_label ?? ""} onChange={(e) => { const next = [...games]; next[idx] = { ...next[idx], custom_label: e.target.value }; setGames(next); }}
                              placeholder="Tên game" maxLength={40} className="h-9" />
                          ) : (
                            <Input value={g.nickname ?? ""} onChange={(e) => { const next = [...games]; next[idx] = { ...next[idx], nickname: e.target.value }; setGames(next); }}
                              placeholder="Nickname (tuỳ chọn)" maxLength={60} className="h-9" />
                          )}
                          <Input value={g.uid} onChange={(e) => { const next = [...games]; next[idx] = { ...next[idx], uid: e.target.value }; setGames(next); }}
                            placeholder={GAME_LIST.find((x) => x.key === g.game)?.hint ?? "ID game"} maxLength={60} className="h-9" />
                          <Button type="button" size="sm" variant="ghost" onClick={() => setGames(games.filter((_, i) => i !== idx))}
                            className="h-9 gap-1 rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                    {games.length < 20 && (
                      <Button type="button" size="sm" variant="outline"
                        onClick={() => setGames([...games, { game: "free_fire", uid: "" }])}
                        className="gap-1.5 rounded-xl text-xs">
                        <Plus className="size-3.5" /> Thêm game
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    ID hiển thị công khai trên /u/{profile.id.slice(0, 8)}…. Tối đa 20 game.
                  </p>
                </div>

                <Button onClick={onSave} disabled={saving || !isDirty} className="w-full gap-2 rounded-xl sm:w-auto">
                  <Save className="size-4" />
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
              </div>
            </div>

            {/* Thông tin tài khoản + rank */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-5 flex items-center gap-2.5">
                <span className="h-4 w-0.5 rounded-full bg-primary dark:bg-amber-400" />
                <h2 className="font-heading text-sm font-black uppercase tracking-[0.18em] text-primary dark:text-amber-400">
                  Thông tin tài khoản
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { icon: Shield,       label: "Vai trò",       value: roleMeta.label },
                  { icon: CalendarDays, label: "Ngày tham gia", value: joinDate },
                  { icon: Eye,          label: "Lượt xem",      value: Number(profile.views ?? 0).toLocaleString("vi-VN") },
                ].map(({ icon: Icon, label: l, value }) => (
                  <div key={l} className="flex flex-col gap-1.5 rounded-xl border border-border bg-muted/30 px-4 py-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      <Icon className="size-3" /> {l}
                    </div>
                    <p className="text-sm font-semibold text-foreground">{value}</p>
                  </div>
                ))}
              </div>
              <div className={cn("mt-3 relative overflow-hidden rounded-2xl border p-5 space-y-3", rankMeta.bg)}>
                <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
                  style={{ backgroundImage: "radial-gradient(ellipse at 80% 20%, currentColor 0%, transparent 60%)" }} />
                <div className="relative flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-3xl leading-none">{rankMeta.icon}</span>
                    <div>
                      <p className={cn("font-heading text-lg font-black uppercase leading-tight", rankMeta.color)}>
                        {rankMeta.rank} {subRank}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {userPoints.toLocaleString("vi-VN")} điểm tích lũy
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-2xl font-black tabular-nums", rankMeta.color)}>{rankProgress}%</p>
                    <p className="text-[10px] text-muted-foreground">tiến trình</p>
                  </div>
                </div>
                <div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                    <div className={cn("h-full rounded-full transition-all duration-700", rankMeta.color.replace("text-", "bg-"))}
                      style={{ width: `${rankProgress}%` }} />
                  </div>
                  <p className="mt-1.5 text-[10px] text-muted-foreground">
                    {pointsToNext != null
                      ? `Còn ${pointsToNext.toLocaleString("vi-VN")} điểm để lên tier tiếp`
                      : "🏆 Bạn đã đạt hạng tối đa!"}
                  </p>
                </div>
              </div>
            </div>

            {/* Cosmetics */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-5 flex items-center gap-2.5">
                <span className="h-4 w-0.5 rounded-full bg-primary dark:bg-amber-400" />
                <h2 className="font-heading text-sm font-black uppercase tracking-[0.18em] text-primary dark:text-amber-400">
                  🎨 Trang Phục & Danh Hiệu
                </h2>
              </div>
              <CosmeticsSelector
                avatarUrl={avatarPreview}
                displayName={displayName || profile.display_name || profile.email.split("@")[0]}
              />
            </div>
          </div>
        )}

        {/* ── Tab: Hoạt động ── */}
        {activeTab === "activity" && (
          <div className="space-y-5">
            {/* Bài viết diễn đàn */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="h-4 w-0.5 rounded-full bg-primary dark:bg-amber-400" />
                <h2 className="font-heading text-sm font-black uppercase tracking-[0.18em] text-primary dark:text-amber-400 flex items-center gap-2">
                  <MessageSquare className="size-3.5" /> Bài viết diễn đàn
                </h2>
                {myPosts.length > 0 && (
                  <span className="ml-auto text-xs font-semibold tabular-nums text-muted-foreground">{myPosts.length} bài</span>
                )}
              </div>
              {myPosts.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <MessageSquare className="size-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Chưa có bài viết nào.</p>
                  <Link href="/cong-dong" className="text-xs text-primary hover:underline dark:text-amber-400">Đến diễn đàn →</Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {myPosts.map((post) => (
                    <Link key={post.id} href={`/cong-dong/${post.id}`}
                      className="group flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-3 transition hover:border-primary/30 hover:bg-muted/40">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">{post.category}</span>
                          {post.status === "removed" && <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-rose-500">Đã ẩn</span>}
                        </div>
                        <p className="line-clamp-1 text-sm font-semibold text-foreground group-hover:text-primary dark:group-hover:text-amber-400 transition-colors">{post.title}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          <Eye className="inline size-2.5 mr-0.5" />{post.view_count}
                          <span className="mx-1.5 opacity-40">·</span>
                          <MessageSquare className="inline size-2.5 mr-0.5" />{post.reply_count}
                          <span className="mx-1.5 opacity-40">·</span>
                          {new Date(post.created_at).toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                      <ExternalLink className="size-3.5 shrink-0 text-muted-foreground/40 group-hover:text-primary/60 mt-0.5" />
                    </Link>
                  ))}
                  {myPosts.length >= 50 && (
                    <Link href="/cong-dong" className="block text-center text-xs text-primary hover:underline dark:text-amber-400 py-1">
                      Xem tất cả →
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Wiki đã đóng góp */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="h-4 w-0.5 rounded-full bg-primary dark:bg-amber-400" />
                <h2 className="font-heading text-sm font-black uppercase tracking-[0.18em] text-primary dark:text-amber-400 flex items-center gap-2">
                  <BookOpen className="size-3.5" /> Wiki đã đóng góp
                </h2>
                {myWiki.length > 0 && (
                  <span className="ml-auto text-xs font-semibold tabular-nums text-muted-foreground">{myWiki.length} bài</span>
                )}
              </div>
              {myWiki.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <BookOpen className="size-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Chưa đóng góp bài wiki nào.</p>
                  <Link href="/wiki/tao-bai" className="text-xs text-emerald-600 hover:underline dark:text-emerald-400">Viết bài wiki đầu tiên →</Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {myWiki.map((article) => (
                    <Link key={article.id} href={`/wiki/${article.slug}`}
                      className="group flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-3 transition hover:border-emerald-500/30 hover:bg-muted/40">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-600 dark:text-emerald-400">{article.category}</span>
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${article.status === "published" ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
                            {article.status === "published" ? "Xuất bản" : "Nháp"}
                          </span>
                        </div>
                        <p className="line-clamp-1 text-sm font-semibold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{article.title}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          <Eye className="inline size-2.5 mr-0.5" />{article.view_count}
                          <span className="mx-1.5 opacity-40">·</span>
                          {new Date(article.created_at).toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                      <ExternalLink className="size-3.5 shrink-0 text-muted-foreground/40 group-hover:text-emerald-500/60 mt-0.5" />
                    </Link>
                  ))}
                  {myWiki.length >= 50 && (
                    <Link href="/wiki" className="block text-center text-xs text-emerald-600 hover:underline dark:text-emerald-400 py-1">Xem tất cả →</Link>
                  )}
                </div>
              )}
            </div>

            {/* Bookmarks */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-5 flex items-center gap-2.5">
                <span className="h-4 w-0.5 rounded-full bg-primary dark:bg-amber-400" />
                <h2 className="font-heading text-sm font-black uppercase tracking-[0.18em] text-primary dark:text-amber-400 flex items-center gap-2">
                  <Bookmark className="size-3.5" /> Bài viết đã lưu
                </h2>
                {bookmarks.length > 0 && (
                  <span className="ml-auto text-xs font-semibold tabular-nums text-muted-foreground">{bookmarks.length} mục</span>
                )}
              </div>
              {bookmarks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa lưu bài viết nào.</p>
              ) : (
                <div className="space-y-2">
                  {bookmarks.map((b) => (
                    <div key={b.id} className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-2.5">
                      {b.item_image && (
                        <Image src={b.item_image} alt="" width={40} height={40} unoptimized className="size-10 shrink-0 rounded-lg object-cover" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{b.item_type}</p>
                        <Link href={b.item_type === "news" ? `/news/${b.item_id}` : `/esports/events/${b.item_id}`}
                          className="text-sm font-semibold text-foreground hover:text-primary line-clamp-1">
                          {b.item_title ?? b.item_id}
                        </Link>
                      </div>
                      <button type="button" onClick={() => void removeBookmark(b)}
                        className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Xóa khỏi danh sách lưu">
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Followed categories */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-5 flex items-center gap-2.5">
                <span className="h-4 w-0.5 rounded-full bg-primary dark:bg-amber-400" />
                <h2 className="font-heading text-sm font-black uppercase tracking-[0.18em] text-primary dark:text-amber-400 flex items-center gap-2">
                  <Bell className="size-3.5" /> Chuyên mục đang theo dõi
                </h2>
                {follows.length > 0 && (
                  <span className="ml-auto text-xs font-semibold tabular-nums text-muted-foreground">{follows.length} chuyên mục</span>
                )}
              </div>
              {follows.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa theo dõi chuyên mục nào. Mở bài viết bất kỳ để theo dõi.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {follows.map((cat) => (
                    <div key={cat} className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary dark:text-amber-400">
                      {cat}
                      <button type="button" onClick={() => void unfollowCategory(cat)}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20" title={`Bỏ theo dõi ${cat}`}>
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Thành tích ── */}
        {activeTab === "achievements" && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-5 flex items-center gap-2.5">
              <span className="h-4 w-0.5 rounded-full bg-primary dark:bg-amber-400" />
              <h2 className="font-heading text-sm font-black uppercase tracking-[0.18em] text-primary dark:text-amber-400 flex items-center gap-2">
                <Trophy className="size-3.5" /> Thành tích
              </h2>
              {achievements.length > 0 && (
                <span className="ml-auto text-xs font-semibold tabular-nums text-muted-foreground">{achievements.length} đã mở khóa</span>
              )}
            </div>
            <AchievementsDisplay earned={achievements} showLocked />
          </div>
        )}

        {/* ── Tab: Bảo mật ── */}
        {activeTab === "security" && (
          <div className="space-y-5">
            {/* Đổi mật khẩu */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-5 flex items-center gap-2.5">
                <span className="h-4 w-0.5 rounded-full bg-primary dark:bg-amber-400" />
                <h2 className="font-heading text-sm font-black uppercase tracking-[0.18em] text-primary dark:text-amber-400 flex items-center gap-2">
                  <KeyRound className="size-3.5" /> Đổi mật khẩu
                </h2>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mật khẩu mới</label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự..." className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Xác nhận mật khẩu mới</label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu..." className="h-10" />
                </div>
                <Button onClick={onChangePassword} disabled={changingPw || !newPassword || !confirmPassword}
                  variant="outline" className="w-full gap-2 rounded-xl sm:w-auto">
                  <Lock className="size-4" />
                  {changingPw ? "Đang đổi..." : "Cập nhật mật khẩu"}
                </Button>
              </div>
            </div>

            {/* 2FA */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-1 flex items-center gap-2.5">
                <span className="h-4 w-0.5 rounded-full bg-primary dark:bg-amber-400" />
                <h2 className="font-heading text-sm font-black uppercase tracking-[0.18em] text-primary dark:text-amber-400 flex items-center gap-2">
                  <Smartphone className="size-3.5" /> Xác thực 2 yếu tố (2FA)
                </h2>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                Bảo vệ tài khoản bằng Google Authenticator hoặc Authy.
              </p>
              {has2FA ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3">
                    <CheckCircle2 className="size-4 text-green-500" />
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">2FA đang được kích hoạt</span>
                  </div>
                  {mfaFactors.filter(f => f.status === "verified").map((f) => (
                    <Button key={f.id} variant="outline" onClick={() => onRemove2FA(f.id)} disabled={removingMfa}
                      className="gap-2 rounded-xl border-rose-500/30 text-rose-500 hover:bg-rose-500/10">
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
                      <code className="font-mono text-sm font-bold tracking-widest text-foreground break-all">{totpSecret}</code>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="Nhập mã 6 chữ số..." className="h-10 font-mono tracking-widest" maxLength={6} />
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

            {/* Đăng xuất */}
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6">
              <div className="mb-1 flex items-center gap-2.5">
                <span className="h-4 w-0.5 rounded-full bg-rose-500" />
                <h2 className="font-heading text-sm font-black uppercase tracking-[0.18em] text-rose-500">Đăng xuất</h2>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                Bạn sẽ được chuyển về trang đăng nhập và cần xác thực lại để truy cập.
              </p>
              <Button variant="outline" onClick={onLogout}
                className="gap-2 rounded-xl border-rose-500/30 text-rose-500 hover:bg-rose-500/10">
                <LogOut className="size-4" />
                Đăng xuất khỏi tài khoản
              </Button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
