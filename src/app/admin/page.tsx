import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3, CalendarRange, Newspaper, Users, Shield, Zap,
  Settings, ImageIcon, Radio, Star, FileText, Activity,
  ArrowRight,
} from "lucide-react";
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

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-500/10 text-red-500 border-red-500/20",
  admin: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  manager: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  support: "bg-green-500/10 text-green-500 border-green-500/20",
  user: "bg-muted text-muted-foreground border-border",
};

const QUICK_ACTIONS = [
  { href: "/admin/news",     icon: Newspaper,    label: "Bài viết",   desc: "Quản lý tin tức",     color: "text-purple-500 bg-purple-500/10" },
  { href: "/admin/events",   icon: CalendarRange, label: "Sự kiện",   desc: "Lịch & sự kiện",      color: "text-amber-500 bg-amber-500/10" },
  { href: "/admin/gallery",  icon: ImageIcon,     label: "Gallery",   desc: "Ảnh cộng đồng",       color: "text-pink-500 bg-pink-500/10" },
  { href: "/admin/users",    icon: Users,         label: "Thành viên", desc: "Quản lý người dùng", color: "text-blue-500 bg-blue-500/10" },
  { href: "/admin/esports",  icon: Radio,         label: "Esports",   desc: "Stream & giải đấu",   color: "text-red-500 bg-red-500/10" },
  { href: "/admin/ratings",  icon: Star,          label: "Đánh giá",  desc: "Phản hồi người dùng", color: "text-yellow-500 bg-yellow-500/10" },
  { href: "/admin/logs",     icon: Activity,      label: "Nhật ký",   desc: "Hoạt động admin",     color: "text-green-500 bg-green-500/10" },
  { href: "/admin/settings", icon: Settings,      label: "Cài đặt",   desc: "Cấu hình hệ thống",  color: "text-foreground bg-muted" },
];

export default async function AdminDashboardPage() {
  const [stats, auth] = await Promise.all([
    getDashboardStats(),
    getAuthContext(),
  ]);

  const roleLabel = ROLE_LABELS[auth.role] ?? auth.role;
  const roleColor = ROLE_COLORS[auth.role] ?? ROLE_COLORS.user;
  const adminName = auth.email?.split("@")[0]?.toUpperCase() ?? "ADMIN";

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

      {/* ── Stats grid ── */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="Người dùng"
          value={stats.users}
          icon={Users}
          href="/admin/users"
          color="blue"
          sub="Tổng tài khoản đã đăng ký"
        />
        <StatsCard
          title="Sự kiện"
          value={stats.events}
          icon={CalendarRange}
          href="/admin/events"
          color="orange"
          sub="Bao gồm đang & sắp diễn ra"
        />
        <StatsCard
          title="Bài viết"
          value={stats.news}
          icon={Newspaper}
          href="/admin/news"
          color="purple"
          sub="Tin tức đã xuất bản"
        />
        <StatsCard
          title="Lượt xem"
          value={stats.views.toLocaleString("vi-VN")}
          icon={BarChart3}
          color="green"
          sub="Tổng lượt xem trang"
        />
      </div>

      {/* ── Quick actions ── */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <FileText className="size-4 text-muted-foreground" />
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Truy cập nhanh</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {QUICK_ACTIONS.map(({ href, icon: Icon, label, desc, color }) => (
            <Link
              key={href}
              href={href}
              className="group glass-card flex flex-col gap-3 rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className={`flex size-10 items-center justify-center rounded-xl ${color} transition-transform duration-200 group-hover:scale-110`}>
                <Icon className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{label}</p>
                <p className="text-[11px] text-muted-foreground">{desc}</p>
              </div>
              <ArrowRight className="size-3.5 text-muted-foreground/40 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>

      {/* ── Active admins ── */}
      <ActiveAdminsPanel />
    </section>
  );
}
