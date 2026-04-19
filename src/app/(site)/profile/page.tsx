"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { User, Mail, Shield, CalendarDays, Eye, Save, LogOut } from "lucide-react";
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
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data: ProfileData) => {
        if (!data.email) {
          router.replace("/login");
          return;
        }
        setProfile(data);
        setDisplayName(data.display_name ?? "");
        setLoading(false);
      })
      .catch(() => {
        router.replace("/login");
      });
  }, [router]);

  const onSave = async () => {
    if (!displayName.trim()) {
      toast.error("Tên hiển thị không được để trống.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName.trim() }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error ?? "Không thể cập nhật hồ sơ.");
        return;
      }
      toast.success("Đã cập nhật hồ sơ.");
      setProfile((prev) => prev ? { ...prev, display_name: displayName.trim() } : prev);
    } catch {
      toast.error("Lỗi mạng, không thể lưu thay đổi.");
    } finally {
      setSaving(false);
    }
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

  const label = profile.display_name || profile.email.split("@")[0];
  const initial = label.charAt(0).toUpperCase();
  const avatarGradient = getAvatarColor(profile.email);
  const roleMeta = ROLE_META[profile.role] ?? ROLE_META.user;
  const joinDate = new Date(profile.created_at).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
  const isDirty = displayName.trim() !== (profile.display_name ?? "");

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="border-b border-border bg-muted/30 py-10">
        <div className="mx-auto max-w-2xl px-6">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
            {/* Avatar */}
            <div
              className={cn(
                "flex size-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-3xl font-extrabold text-white shadow-lg",
                avatarGradient,
              )}
            >
              {initial}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h1 className="font-heading text-2xl font-black uppercase tracking-[0.06em] text-foreground">
                  {label}
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
                  {profile.views.toLocaleString("vi-VN")} lượt xem
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Form */}
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="space-y-5">

          {/* Display name */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 font-heading text-base font-bold uppercase tracking-[0.06em] text-foreground">
              Thông tin cá nhân
            </h2>

            <div className="space-y-4">
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
                  Tên này sẽ hiển thị trên bình luận và hồ sơ công khai của bạn. Tối đa 60 ký tự.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  <Mail className="size-3.5" /> Email
                </label>
                <Input
                  value={profile.email}
                  disabled
                  className="h-10 cursor-not-allowed opacity-60"
                />
                <p className="text-[11px] text-muted-foreground">
                  Email không thể thay đổi từ hồ sơ. Liên hệ quản trị viên nếu cần cập nhật.
                </p>
              </div>

              <Button
                onClick={onSave}
                disabled={saving || !isDirty}
                className="w-full gap-2 rounded-xl sm:w-auto"
              >
                <Save className="size-4" />
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          </div>

          {/* Account info */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 font-heading text-base font-bold uppercase tracking-[0.06em] text-foreground">
              Thông tin tài khoản
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: Shield,      label: "Vai trò",     value: roleMeta.label },
                { icon: CalendarDays, label: "Ngày tham gia", value: joinDate },
                { icon: Eye,         label: "Lượt xem",    value: profile.views.toLocaleString("vi-VN") },
              ].map(({ icon: Icon, label: l, value }) => (
                <div key={l} className="flex flex-col gap-1.5 rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <Icon className="size-3" />
                    {l}
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
