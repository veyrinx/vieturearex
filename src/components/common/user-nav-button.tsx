"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, UserCircle, UserPlus, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getUser().then(async ({ data }) => {
      const userEmail = data.user?.email ?? null;
      setEmail(userEmail);
      if (userEmail) {
        const { data: profile } = await supabase
          .from("users")
          .select("display_name")
          .eq("id", data.user!.id)
          .maybeSingle() as { data: { display_name: string | null } | null };
        setDisplayName(profile?.display_name ?? null);
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

  // ── Logged out: show Login + Register buttons ──
  if (!email) {
    return (
      <>
        <Link
          href="/login"
          className={cn(
            "hidden sm:inline-flex items-center justify-center rounded-xl px-3 h-9 text-[0.7rem] font-bold uppercase tracking-[0.08em] transition-colors",
            "border border-border bg-background text-foreground hover:bg-muted",
            className,
          )}
        >
          Đăng nhập
        </Link>
        <Link
          href="/login"
          className={cn(
            "sm:hidden inline-flex size-9 items-center justify-center rounded-xl transition-colors border border-border bg-background text-muted-foreground hover:bg-muted",
            className,
          )}
          aria-label="Đăng nhập"
        >
          <UserCircle className="size-[17px]" />
        </Link>
        <Link
          href="/register"
          className={cn(
            "hidden md:inline-flex items-center justify-center rounded-xl px-3 h-9 text-[0.7rem] font-bold uppercase tracking-[0.08em] transition-colors",
            "bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-amber-400 dark:text-black dark:hover:bg-amber-300",
            className,
          )}
        >
          <UserPlus className="mr-1.5 size-3.5" />
          Đăng ký
        </Link>
      </>
    );
  }

  // ── Logged in: avatar dropdown ──
  const label = displayName || email.split("@")[0];
  const initial = label.charAt(0).toUpperCase();
  const avatarGradient = getAvatarColor(email);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-black transition-all",
          `bg-gradient-to-br ${avatarGradient} text-white shadow-sm hover:shadow-md hover:scale-105`,
          className,
        )}
        title={label}
      >
        {initial}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl border-border bg-card">
        <div className="px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">TÀI KHOẢN</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{label}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer gap-2 p-0">
          <Link href="/profile" className="flex w-full items-center gap-2 px-2 py-1.5">
            <User className="size-4" />
            <span className="text-sm font-medium">Hồ sơ cá nhân</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout} className="cursor-pointer gap-2 text-destructive focus:text-destructive">
          <LogOut className="size-4" />
          <span className="text-sm font-medium">Đăng xuất</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
