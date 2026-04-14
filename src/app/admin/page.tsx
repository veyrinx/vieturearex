import type { Metadata } from "next";
import { BarChart3, CalendarRange, Newspaper, Users, Shield, Zap } from "lucide-react";
import { ActiveAdminsPanel } from "@/components/admin/active-admins-panel";
import { StatsCard } from "@/components/admin/stats-card";
import { getDashboardStats } from "@/lib/data/content-service";
import { getAuthContext } from "@/lib/server/auth";

export const metadata: Metadata = {
  title: "Dashboard Quản Trị",
  description: "Tổng quan quản trị Arex.",
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "SUPER ADMIN",
  admin: "ADMIN",
  manager: "QUẢN LÝ",
  support: "CSKH",
  user: "NGƯỜI DÙNG",
};

export default async function AdminDashboardPage() {
  const [stats, auth] = await Promise.all([
    getDashboardStats(),
    getAuthContext(),
  ]);

  const roleLabel = ROLE_LABELS[auth.role] ?? auth.role;

  return (
    <section className="space-y-5">
      {/* Welcome card */}
      <div className="relative overflow-hidden rounded-[24px] border border-primary/15 bg-gradient-to-br from-primary/8 via-primary/4 to-card p-6 shadow-[0_20px_50px_rgba(0,82,255,0.06)] dark:border-amber-400/15 dark:from-amber-500/8 dark:via-amber-400/4 dark:shadow-[0_20px_50px_rgba(247,147,26,0.04)]">
        <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/10 blur-[60px] dark:bg-amber-400/10" />
        <div className="relative z-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 dark:bg-amber-400/10">
                <Shield className="size-5 text-primary dark:text-amber-400" />
              </div>
              <div>
                <h1 className="font-heading text-xl font-bold uppercase text-foreground md:text-2xl">
                  XIN CHÀO, {auth.email?.split("@")[0]?.toUpperCase() ?? "ADMIN"}
                </h1>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-primary dark:bg-amber-400/10 dark:text-amber-400">
                    <Zap className="size-3" />
                    {roleLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="NGƯỜI DÙNG" value={stats.users} icon={Users} />
        <StatsCard title="SỰ KIỆN" value={stats.events} icon={CalendarRange} />
        <StatsCard title="TIN TỨC" value={stats.news} icon={Newspaper} />
        <StatsCard title="LƯỢT XEM" value={stats.views.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")} icon={BarChart3} />
      </div>

      {/* Active admins */}
      <ActiveAdminsPanel />
    </section>
  );
}
