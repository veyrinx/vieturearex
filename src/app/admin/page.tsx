import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3, CalendarRange, Newspaper, Users, Shield, Zap,
  Settings, Download, LayoutDashboard,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { adminNavGroups } from "@/lib/constants/admin-nav";

function SectionHeader({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className="size-4 text-muted-foreground" />
      <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{title}</h2>
    </div>
  );
}
import { ActiveAdminsPanel } from "@/components/admin/active-admins-panel";
import { StatsCard } from "@/components/admin/stats-card";
import { ViewsTrendCard } from "@/components/admin/views-trend-card";
import { TodayActivityCard } from "@/components/admin/today-activity-card";
import { RegistrationReportCard } from "@/components/admin/registration-report-card";
import { NeedsAttentionPanel } from "@/components/admin/needs-attention-panel";
import { getStatsTrends } from "@/lib/data/admin-stats-trends";
import { APP_VERSION } from "@/lib/data/changelog";

const BUILD = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";
import { getDashboardStats, getUserByEmail } from "@/lib/data/content-service";
import { getAuthContext } from "@/lib/server/auth";

export const metadata: Metadata = {
  title: "Dashboard Quản Trị",
  description: "Tổng quan quản trị Arex.",
};

const ROLE_LABELS: Record<string, string> = {
  it: "IT",
  super_admin: "SUPER ADMIN",
  admin: "ADMIN",
  manager: "QUẢN LÝ",
  support: "CSKH",
  user: "NGƯỜI DÙNG",
};

const ROLE_COLORS: Record<string, string> = {
  it: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  super_admin: "bg-red-500/10 text-red-500 border-red-500/20",
  admin: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  manager: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  support: "bg-green-500/10 text-green-500 border-green-500/20",
  user: "bg-muted text-muted-foreground border-border",
};


export default async function AdminDashboardPage() {
  const auth = await getAuthContext();
  const [stats, userProfile, trends] = await Promise.all([
    getDashboardStats(),
    auth.email ? getUserByEmail(auth.email).catch(() => null) : Promise.resolve(null),
    getStatsTrends().catch(() => ({ users: null, news: null, events: null, views: null })),
  ]);

  const roleLabel = ROLE_LABELS[auth.role] ?? auth.role;
  const roleColor = ROLE_COLORS[auth.role] ?? ROLE_COLORS.user;
  const adminName = (userProfile?.display_name || auth.email?.split("@")[0] || "ADMIN").toUpperCase();

  return (
    <section className="space-y-6">

      {/* ── Welcome card ── */}
      <div className="relative overflow-hidden rounded-[24px] border border-primary/15 bg-gradient-to-br from-primary/8 via-primary/4 to-card p-6 shadow-[0_20px_50px_rgba(0,82,255,0.06)] dark:border-amber-400/15 dark:from-amber-500/8 dark:via-amber-400/4 dark:shadow-[0_20px_50px_rgba(247,147,26,0.04)]">
        {/* Glow orbs */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-[60px] dark:bg-amber-400/10" />
        <div className="pointer-events-none absolute -bottom-8 left-1/3 h-32 w-32 rounded-full bg-primary/5 blur-[40px] dark:bg-amber-400/5" />
        {/* Dot pattern */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 shadow-lg ring-2 ring-primary/20 dark:bg-amber-400/10 dark:ring-amber-400/20">
                <Shield className="size-7 text-primary dark:text-amber-400" />
              </div>
              <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-green-500 ring-2 ring-card">
                <span className="size-1.5 rounded-full bg-white" />
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-xl font-bold uppercase tracking-[0.06em] text-foreground md:text-2xl">
                  Xin chào, {adminName}
                </h1>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${roleColor}`}>
                  <Zap className="size-3" />
                  {roleLabel}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
              </p>
              <Link
                href="/admin/changelog"
                className="inline-flex w-fit items-center gap-1 font-mono text-[10px] text-muted-foreground/70 transition-colors hover:text-primary dark:hover:text-amber-400"
              >
                Phiên bản v{APP_VERSION} · build {BUILD}
              </Link>
            </div>
          </div>

          <Link
            href="/admin/settings"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/70 px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground backdrop-blur-sm transition-all hover:border-primary/40 hover:text-foreground"
          >
            <Settings className="size-3.5" />
            Cài đặt hệ thống
          </Link>
        </div>
      </div>

      {/* ── Tổng quan ── */}
      <div className="space-y-3">
        <SectionHeader icon={LayoutDashboard} title="Tổng quan" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="Người dùng"
          value={stats.users}
          icon={Users}
          href="/admin/users"
          color="blue"
          sub="Tổng tài khoản đã đăng ký"
          trend={trends.users}
        />
        <StatsCard
          title="Sự kiện"
          value={stats.events}
          icon={CalendarRange}
          href="/admin/events"
          color="orange"
          sub="Bao gồm đang & sắp diễn ra"
          trend={trends.events}
        />
        <StatsCard
          title="Bài viết"
          value={stats.news}
          icon={Newspaper}
          href="/admin/news"
          color="purple"
          sub="Tin tức đã xuất bản"
          trend={trends.news}
        />
        <StatsCard
          title="Lượt xem"
          value={Number(stats.views ?? 0).toLocaleString("vi-VN")}
          icon={BarChart3}
          href="/admin/stats"
          color="green"
          sub="Tổng lượt xem trang"
          trend={trends.views}
        />
        </div>
      </div>

      {/* ── Cần xử lý ── */}
      <NeedsAttentionPanel />

      {/* ── Truy cập nhanh (theo nhóm, đồng bộ sidebar) ── */}
      <div className="space-y-4">
        <SectionHeader icon={Zap} title="Truy cập nhanh" />
        {adminNavGroups.map((group) => {
          const items = group.items.filter((it) => it.href !== "/admin");
          if (items.length === 0) return null;
          return (
            <div key={group.label} className="space-y-2">
              <p className="px-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/50">
                {group.label}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                {items.map(({ href, title, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="group flex items-center gap-2.5 rounded-xl border border-border bg-card p-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-primary/10 dark:group-hover:bg-amber-400/10">
                      <Icon className="size-4 text-muted-foreground transition-colors group-hover:text-primary dark:group-hover:text-amber-400" />
                    </span>
                    <span className="truncate text-xs font-semibold text-foreground">{title}</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Báo cáo đăng ký ── */}
      <RegistrationReportCard />

      {/* ── Xuất báo cáo ── */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <Download className="size-4 text-muted-foreground" />
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Xuất báo cáo</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { type: "registrations", label: "Đăng ký người dùng", icon: Users },
            { type: "news", label: "Tin tức", icon: Newspaper },
            { type: "events", label: "Sự kiện", icon: CalendarRange },
          ].map(({ type, label, icon: Icon }) => (
            <a
              key={type}
              href={`/api/admin/report/export?type=${type}`}
              download
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:bg-primary/5"
            >
              <Icon className="size-3.5 text-muted-foreground" />
              {label}
              <span className="text-[10px] text-muted-foreground">.csv</span>
            </a>
          ))}
        </div>
      </div>

      {/* ── Phân tích ── */}
      <div className="space-y-4">
        <SectionHeader icon={BarChart3} title="Phân tích" />
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <ViewsTrendCard />
          <TodayActivityCard />
        </div>
        <ActiveAdminsPanel />
      </div>
    </section>
  );
}
