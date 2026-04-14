"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
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

export function UserNavButton({ className }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setLoading(false);
    });
  }, []);

  const onLogout = async () => {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (loading || !email) return null;

  const initial = email.charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex size-10 items-center justify-center rounded-xl text-xs font-black transition-all",
          "bg-gradient-to-br from-primary/20 to-primary/5 text-primary border border-primary/20 hover:border-primary/40 dark:from-amber-400/20 dark:to-amber-400/5 dark:text-amber-400 dark:border-amber-400/20 dark:hover:border-amber-400/40",
          className,
        )}
      >
        {initial}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl border-border bg-card">
        <div className="px-3 py-2">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">TÀI KHOẢN</p>
          <p className="mt-1 truncate text-sm font-medium text-foreground">{email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout} className="cursor-pointer gap-2 text-destructive focus:text-destructive">
          <LogOut className="size-4" />
          <span className="text-sm font-medium">Đăng xuất</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
