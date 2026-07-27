"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LogOut, UserPlus, User, LayoutDashboard,
  Bookmark, CalendarDays, BarChart2, Swords, Settings,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { VerifiedBadge } from "@/components/common/user-badges";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = { className?: string };

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

export function UserNavButton({ className }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  const ADMIN_ROLES = ["super_admin", "admin", "it", "manager", "support"];

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getUser().then(async ({ data }) => {
      const userEmail = data.user?.email ?? null;
      setEmail(userEmail);
      if (userEmail) {
        const { data: profile } = await supabase
          .from("users")
          .select("display_name, avatar_url, role, is_verified")
          .eq("id", data.user!.id)
          .maybeSingle() as { data: { display_name: string | null; avatar_url: string | null; role: string | null; is_verified: boolean | null } | null };
        setDisplayName(profile?.display_name ?? null);
        setAvatarUrl(profile?.avatar_url ?? null);
        setRole(profile?.role ?? null);
        setIsVerified(Boolean(profile?.is_verified));
      }
      setLoading(false);
    });
  }, []);

  const onLogout = async () => {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (loading) {
    return <div className="size-9 animate-pulse rounded-xl bg-muted" />;
  }

  // ── Logged out: single "Tham Gia" button ──
  if (!email) {
    return (
      <>
        <Link
          href="/login"
          className={cn(
            "hidden sm:inline-flex items-center justify-center rounded-xl px-4 h-9 text-[0.7rem] font-bold uppercase tracking-[0.08em] transition-colors",
            "bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-amber-400 dark:text-black dark:hover:bg-amber-300",
            className,
          )}
        >
          <UserPlus className="mr-1.5 size-3.5" />
          Tham Gia
        </Link>
        <Link
          href="/login"
          className={cn(
            "sm:hidden inline-flex size-9 items-center justify-center rounded-xl transition-colors",
            "bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-amber-400 dark:text-black dark:hover:bg-amber-300",
            className,
          )}
          aria-label="Tham gia"
        >
          <UserPlus className="size-[17px]" />
        </Link>
      </>
    );
  }

  // ── Logged in: avatar dropdown ──
  const label = displayName || email.split("@")[0];
  const initial = label.charAt(0).toUpperCase();
  const avatarGradient = getAvatarColor(email);

  const roleLabel: Record<string, string> = {
    super_admin: "Super Admin",
    admin: "Admin",
    it: "IT",
    manager: "Manager",
    support: "Support",
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-black transition-all overflow-hidden",
          avatarUrl ? "bg-muted" : `bg-gradient-to-br ${avatarGradient} text-white`,
          "shadow-sm hover:shadow-md hover:scale-105",
          className,
        )}
        title={label}
      >
        {avatarUrl
          ? <Image src={avatarUrl} alt={label} width={36} height={36} className="size-full object-cover" />
          : initial
        }
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60 rounded-2xl border-border bg-card p-1.5">
        {/* User header */}
        <div className="flex items-center gap-3 px-2.5 py-2.5 mb-1">
          <div className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-black overflow-hidden",
            avatarUrl ? "bg-muted" : `bg-gradient-to-br ${avatarGradient} text-white`,
          )}>
            {avatarUrl
              ? <Image src={avatarUrl} alt={label} width={40} height={40} className="size-full object-cover" />
              : initial
            }
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-bold text-foreground">{label}</p>
              <VerifiedBadge role={role} isVerified={isVerified} size="sm" />
              {role && roleLabel[role] && (
                <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary dark:bg-amber-400/15 dark:text-amber-400">
                  {roleLabel[role]}
                </span>
              )}
            </div>
            <p className="truncate text-[11px] text-muted-foreground">{email}</p>
          </div>
        </div>

        <DropdownMenuSeparator className="mx-1 my-1" />

        {/* Tài khoản */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground/60">
            Tài khoản
          </DropdownMenuLabel>
          <DropdownMenuItem className="cursor-pointer rounded-xl p-0">
            <Link href="/profile" className="flex w-full items-center gap-2.5 px-2.5 py-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 dark:bg-amber-400/10">
                <User className="size-3.5 text-primary dark:text-amber-400" />
              </span>
              <span className="text-sm font-medium">Hồ sơ cá nhân</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer rounded-xl p-0">
            <Link href="/profile?tab=settings" className="flex w-full items-center gap-2.5 px-2.5 py-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-muted">
                <Settings className="size-3.5 text-muted-foreground" />
              </span>
              <span className="text-sm font-medium">Cài đặt</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="mx-1 my-1" />

        {/* Khám phá */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground/60">
            Khám phá
          </DropdownMenuLabel>
          <DropdownMenuItem className="cursor-pointer rounded-xl p-0">
            <Link href="/favorites" className="flex w-full items-center gap-2.5 px-2.5 py-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-rose-500/10">
                <Bookmark className="size-3.5 text-rose-500" />
              </span>
              <span className="text-sm font-medium">Đã lưu</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer rounded-xl p-0">
            <Link href="/calendar" className="flex w-full items-center gap-2.5 px-2.5 py-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10">
                <CalendarDays className="size-3.5 text-blue-500" />
              </span>
              <span className="text-sm font-medium">Lịch sự kiện</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer rounded-xl p-0">
            <Link href="/leaderboard" className="flex w-full items-center gap-2.5 px-2.5 py-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-amber-400/10">
                <BarChart2 className="size-3.5 text-amber-500" />
              </span>
              <span className="text-sm font-medium">Bảng xếp hạng</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer rounded-xl p-0">
            <Link href="/players/compare" className="flex w-full items-center gap-2.5 px-2.5 py-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10">
                <Swords className="size-3.5 text-violet-500" />
              </span>
              <span className="text-sm font-medium">So sánh tuyển thủ</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        {role && ADMIN_ROLES.includes(role) && (
          <>
            <DropdownMenuSeparator className="mx-1 my-1" />
            <DropdownMenuItem className="cursor-pointer rounded-xl p-0">
              <Link href="/admin" className="flex w-full items-center gap-2.5 px-2.5 py-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 dark:bg-amber-400/10">
                  <LayoutDashboard className="size-3.5 text-primary dark:text-amber-400" />
                </span>
                <span className="text-sm font-medium text-primary dark:text-amber-400">Trang quản trị</span>
              </Link>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator className="mx-1 my-1" />
        <DropdownMenuItem
          onClick={onLogout}
          className="cursor-pointer rounded-xl gap-2.5 px-2.5 py-2 text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-destructive/10">
            <LogOut className="size-3.5 text-destructive" />
          </span>
          <span className="text-sm font-medium">Đăng xuất</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
