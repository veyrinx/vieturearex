"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  House, BookOpenText, MessageSquare, MonitorPlay, User, LayoutDashboard,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  exact?: boolean;
};

const BASE_NAV: NavItem[] = [
  { href: "/",          icon: House,          label: "Trang chủ", exact: true },
  { href: "/news",      icon: BookOpenText,   label: "Tin tức" },
  { href: "/cong-dong", icon: MessageSquare,  label: "Cộng đồng" },
  { href: "/esports",   icon: MonitorPlay,    label: "Stream" },
  { href: "/profile",   icon: User,           label: "Hồ sơ" },
];

const ADMIN_ITEM: NavItem = { href: "/admin", icon: LayoutDashboard, label: "Admin" };
const ADMIN_ROLES = ["super_admin", "admin", "manager", "support"];

export function MobileBottomNav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle<{ role: string }>();
      if (profile?.role && ADMIN_ROLES.includes(profile.role)) {
        setIsAdmin(true);
      }
    });
  }, []);

  useEffect(() => {
    let prev = window.scrollY;
    const onScroll = () => {
      const cur = window.scrollY;
      if (cur < 48) { setCollapsed(false); }
      else if (cur > prev + 4) { setCollapsed(true); }
      else if (prev > cur + 4) { setCollapsed(false); }
      prev = cur;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/tg")
  ) return null;

  const nav = isAdmin ? [...BASE_NAV, ADMIN_ITEM] : BASE_NAV;

  return (
    <div
      className="fixed inset-x-3 z-50 md:hidden"
      style={{ bottom: "calc(12px + env(safe-area-inset-bottom))" }}
    >
      <motion.nav
        animate={{ borderRadius: collapsed ? 22 : 26 }}
        transition={{ type: "spring", stiffness: 400, damping: 35 }}
        className="relative overflow-hidden
          border border-white/40 dark:border-white/[0.08]
          bg-white/35 dark:bg-zinc-900/80
          backdrop-blur-[48px] backdrop-saturate-[200%]"
        style={{
          boxShadow: [
            "0 8px 40px rgba(0,0,0,0.12)",
            "0 2px 8px rgba(0,0,0,0.06)",
            "0 0 0 0.5px rgba(0,0,0,0.04)",
            "inset 0 1.5px 0 rgba(255,255,255,0.80)",
            "inset 0 -0.5px 0 rgba(255,255,255,0.14)",
          ].join(", "),
        }}
      >
        {/* Top specular */}
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/95 to-transparent" />

        <div className="flex items-center px-1.5">
          {nav.map(({ href, icon: Icon, label, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className="relative flex flex-1 flex-col items-center py-2.5"
              >
                {active && (
                  <motion.span
                    layoutId="ios26-pill"
                    className="absolute inset-x-1 -inset-y-0.5 rounded-[17px]
                      border border-white/55 dark:border-white/12
                      bg-white/65 dark:bg-white/[0.11]"
                    style={{
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95), 0 1px 4px rgba(0,0,0,0.08)",
                    }}
                    transition={{ type: "spring", stiffness: 520, damping: 38 }}
                  />
                )}

                <motion.span
                  animate={{ scale: active ? 1.08 : 1, y: active ? -0.5 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="relative z-10 flex flex-col items-center gap-[3px]"
                >
                  <Icon
                    size={21}
                    strokeWidth={active ? 2.4 : 1.65}
                    className={cn(
                      "transition-colors duration-100",
                      active
                        ? "text-primary dark:text-amber-400"
                        : "text-black/36 dark:text-white/36",
                    )}
                  />

                  {active && (
                    <span className="absolute -bottom-[3px] left-1/2 -translate-x-1/2 size-1 rounded-full bg-primary dark:bg-amber-400 shadow-[0_0_6px_2px_hsl(var(--primary)/0.55)] dark:shadow-[0_0_6px_2px_rgba(251,191,36,0.55)]" />
                  )}

                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.span
                        key="label"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.16, ease: "easeInOut" }}
                        className={cn(
                          "overflow-hidden text-[9px] leading-none tracking-tight font-semibold",
                          active
                            ? "text-primary dark:text-amber-400"
                            : "text-black/36 dark:text-white/36",
                        )}
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.span>
              </Link>
            );
          })}
        </div>
      </motion.nav>
    </div>
  );
}
