import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Plus, UserPlus, Globe } from "lucide-react";
import { SectionHeading } from "@/components/common/section-heading";

import { getTmsTournaments } from "@/lib/tms/data";
import { SERVER_LABELS } from "@/lib/tms/types";
import type { TmsServer } from "@/lib/tms/types";
import { cn } from "@/lib/utils";
import { getAuthContext } from "@/lib/server/auth";
import { TournamentListClient } from "@/components/tms/tournament-list-client";

export const metadata: Metadata = {
  title: "Giải Đấu | Arex",
  description: "Tất cả giải đấu Free Fire trên hệ thống Arex — đăng ký, thi đấu, bảng xếp hạng.",
  alternates: { canonical: "https://arexnetwork.site/tournaments" },
  openGraph: {
    title: "Giải Đấu Free Fire — Arex",
    description: "Đăng ký và thi đấu các giải Free Fire. Theo dõi bảng xếp hạng, kết quả và lịch thi đấu.",
    url: "https://arexnetwork.site/tournaments",
    type: "website",
    siteName: "Arex - Trang Tin Tức Cộng Đồng Free Fire",
    locale: "vi_VN",
    images: [{ url: "https://arexnetwork.site/og-image.png", width: 1200, height: 630, alt: "Giải Đấu Free Fire — Arex" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Giải Đấu Free Fire — Arex",
    description: "Đăng ký và thi đấu các giải Free Fire. Bảng xếp hạng và kết quả cập nhật liên tục.",
    images: ["https://arexnetwork.site/og-image.png"],
  },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;


type ServerTab = {
  key: TmsServer | "all";
  label: string;
  flag?: string;
  icon?: "globe";
};

const VN_FLAG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 20'%3E%3Crect width='30' height='20' fill='%23DA251D'/%3E%3Cpolygon points='15,3.5 16.9,9.3 23,9.3 18.1,13 20,18.8 15,15.1 10,18.8 11.9,13 7,9.3 13.1,9.3' fill='%23FFCD00'/%3E%3C/svg%3E`;
const SG_FLAG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 20'%3E%3Crect width='30' height='20' fill='white'/%3E%3Crect width='30' height='10' fill='%23EF3340'/%3E%3Ccircle cx='7' cy='5' r='3' fill='white'/%3E%3Ccircle cx='8.3' cy='5' r='2.4' fill='%23EF3340'/%3E%3Cpolygon points='12,3.5 12.5,5 14,5 12.8,5.9 13.3,7.4 12,6.5 10.7,7.4 11.2,5.9 10,5 11.5,5' fill='white'/%3E%3C/svg%3E`;

const SERVER_TABS: ServerTab[] = [
  { key: "all",    label: "Tất cả" },
  { key: "vn",     label: "VN",     flag: VN_FLAG },
  { key: "sg",     label: "SG/SEA", flag: SG_FLAG },
  { key: "global", label: "Global", icon: "globe" },
];

const ADMIN_ROLES = ["super_admin", "admin", "it", "manager"];

const STATUS_ORDER: Record<string, number> = {
  ongoing: 0, registering: 1, draft: 2, finished: 3, cancelled: 4,
};

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ server?: string; sort?: string }>;
}) {
  const [tournaments, auth, sp] = await Promise.all([
    getTmsTournaments(false).catch(() => []),
    getAuthContext().catch(() => ({ userId: null, role: "user" })),
    searchParams,
  ]);

  const serverFilter = (sp.server ?? "all") as TmsServer | "all";
  const sortBy = sp.sort ?? "status";

  const base = serverFilter === "all"
    ? tournaments
    : tournaments.filter((t) => t.server === serverFilter);

  const filtered = [...base].sort((a, b) => {
    if (sortBy === "newest") {
      return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
    }
    if (sortBy === "name") {
      return a.name.localeCompare(b.name, "vi");
    }
    // Default: by status then newest
    const so = (STATUS_ORDER[a.status] ?? 5) - (STATUS_ORDER[b.status] ?? 5);
    return so !== 0 ? so : new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
  });

  const isAdmin = ADMIN_ROLES.includes(auth.role ?? "");
  const isLoggedIn = !!auth.userId;

  return (
    <div className="py-10 space-y-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <SectionHeading
          eyebrow="TMS"
          title="GIẢI ĐẤU"
          description="Tournament Management System — đăng ký, thi đấu, bảng xếp hạng"
        />

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {isAdmin && (
            <Link
              href="/admin/tournaments/new"
              className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-bold text-amber-400 hover:border-amber-500/60 transition-colors"
            >
              <Plus className="size-4" /> Tạo giải đấu
            </Link>
          )}
          {isLoggedIn && !isAdmin && (
            <Link
              href="/tournaments/propose"
              className="flex items-center gap-2 rounded-xl border border-primary/30 dark:border-amber-400/30 bg-primary/5 dark:bg-amber-400/5 px-4 py-2.5 text-sm font-bold text-primary dark:text-amber-400 hover:border-primary/60 dark:hover:border-amber-400/60 transition-colors"
            >
              <UserPlus className="size-4" /> Đề xuất giải đấu
            </Link>
          )}
          <Link
            href="/tournaments/my-team"
            className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:border-primary/40 transition-colors"
          >
            <Shield className="size-4" /> Team của tôi
          </Link>
        </div>
      </div>

      {/* Server filter + Sort */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5 flex-wrap">
        {SERVER_TABS.map(({ key, label, flag, icon }) => (
          <Link
            key={key}
            href={key === "all" ? "/tournaments" : `/tournaments?server=${key}`}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors",
              serverFilter === key
                ? "border-amber-500/60 bg-amber-500/15 text-amber-400"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {flag && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={flag} alt={label} width={20} height={14} className="rounded-sm" />
            )}
            {icon === "globe" && <Globe className="size-3.5" />}
            {label}
            {key !== "all" && (
              <span className="text-[10px] opacity-60">
                {tournaments.filter((t) => t.server === key).length}
              </span>
            )}
          </Link>
        ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sắp xếp:</span>
          {([
            { key: "status",  label: "Trạng thái" },
            { key: "newest",  label: "Mới nhất" },
            { key: "name",    label: "Tên A-Z" },
          ] as const).map(({ key, label }) => {
            const href = serverFilter === "all"
              ? `/tournaments?sort=${key}`
              : `/tournaments?server=${serverFilter}&sort=${key}`;
            return (
              <Link
                key={key}
                href={href}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-[10px] font-semibold uppercase transition",
                  sortBy === key
                    ? "bg-primary/10 text-primary dark:text-amber-400"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      <TournamentListClient
        tournaments={filtered}
        emptyMessage={serverFilter === "all" ? "Chưa có giải đấu nào." : `Chưa có giải đấu ${SERVER_LABELS[serverFilter as TmsServer] ?? ""} nào.`}
      />
    </div>
  );
}
