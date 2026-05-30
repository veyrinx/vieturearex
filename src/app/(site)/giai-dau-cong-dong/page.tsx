import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/constants/site";
import { getTmsTournaments } from "@/lib/tms/data";
import { STATUS_LABELS, FORMAT_LABELS, MODE_LABELS, SERVER_LABELS } from "@/lib/tms/types";
import type { TmsServer } from "@/lib/tms/types";
import { TournamentBanner } from "@/components/common/safe-image";
import { TmsServerBadge } from "@/components/tms/server-badge";
import { TournamentRequestForm } from "@/components/tournaments/tournament-request-form";
import { Trophy, Users, CalendarDays, Swords, Plus, ChevronRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Giải Đấu Cộng Đồng — Arex",
  description: "Tham gia giải đấu Free Fire cộng đồng. Đăng ký team, thi đấu và đề xuất tổ chức giải đấu của riêng bạn.",
  alternates: { canonical: `${siteConfig.url}/giai-dau-cong-dong` },
  openGraph: {
    title: "Giải Đấu Cộng Đồng Free Fire — Arex",
    description: "Giải đấu Free Fire do cộng đồng tổ chức. Đăng ký và thi đấu cùng hàng trăm team.",
    url: `${siteConfig.url}/giai-dau-cong-dong`, type: "website",
  },
};

export const revalidate = 120;

const STATUS_COLOR: Record<string, string> = {
  registering: "border-emerald-400/40 bg-emerald-400/10 text-emerald-500",
  ongoing:     "border-amber-400/40 bg-amber-400/10 text-amber-500",
  draft:       "border-border bg-muted text-muted-foreground",
  finished:    "border-border bg-muted text-muted-foreground",
  cancelled:   "border-destructive/30 bg-destructive/10 text-destructive",
};

export default async function CommunityTournamentPage() {
  const all = await getTmsTournaments().catch(() => []);
  const active = all.filter((t) => ["registering","ongoing"].includes(t.status));
  const past = all.filter((t) => ["finished","cancelled"].includes(t.status)).slice(0, 6);

  return (
    <div className="mx-auto max-w-5xl py-8 md:py-12 space-y-10">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-7 md:p-10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/6" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        <div className="relative space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary dark:text-amber-400">Arex TMS</p>
          <h1 className="font-heading text-3xl font-black uppercase tracking-tight text-foreground md:text-4xl">
            Giải Đấu <span className="text-primary dark:text-amber-400">Cộng Đồng</span>
          </h1>
          <p className="max-w-lg text-sm text-muted-foreground">
            Thi đấu, khẳng định bản thân. Đăng ký team vào giải đang mở hoặc đề xuất tổ chức giải đấu mới.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link href="/tournaments" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
              <Trophy className="size-4" /> Tất cả giải đấu
            </Link>
            <Link href="/tournaments/my-team" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-bold text-foreground hover:border-primary/40">
              <Users className="size-4" /> Team của tôi
            </Link>
          </div>
        </div>
      </div>

      {/* Active tournaments */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-4 w-0.5 rounded-full bg-primary dark:bg-amber-400" />
          <h2 className="font-heading text-base font-black uppercase tracking-[0.12em] text-primary dark:text-amber-400">
            Đang mở đăng ký & thi đấu
          </h2>
          {active.length > 0 && (
            <span className="ml-1 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-black text-primary-foreground">
              {active.length}
            </span>
          )}
        </div>
        {active.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
            Hiện chưa có giải đấu nào đang mở. Hãy đề xuất giải đấu bên dưới!
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {active.map((t) => (
              <Link key={t.id} href={`/tournaments/${t.slug}`} className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-md">
                <div className="relative aspect-video overflow-hidden">
                  <TournamentBanner src={t.banner_url} alt={t.name} className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                    <div>
                      <p className="font-heading text-sm font-black text-white line-clamp-1">{t.name}</p>
                      <TmsServerBadge server={t.server as TmsServer} className="mt-1" />
                    </div>
                    <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-black uppercase", STATUS_COLOR[t.status])}>
                      {STATUS_LABELS[t.status]}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
                  {[
                    { icon: Swords, label: MODE_LABELS[t.mode] },
                    { icon: CalendarDays, label: FORMAT_LABELS[t.format] },
                    { icon: Users, label: `${t.max_teams} team` },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center justify-center gap-1.5 py-2.5 text-[11px] text-muted-foreground">
                      <Icon className="size-3" /> {label}
                    </div>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Request form */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-4 w-0.5 rounded-full bg-primary dark:bg-amber-400" />
          <h2 className="font-heading text-base font-black uppercase tracking-[0.12em] text-primary dark:text-amber-400">
            Đề xuất tổ chức giải đấu
          </h2>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 md:p-7">
          <p className="mb-5 text-sm text-muted-foreground">
            Muốn tổ chức giải đấu cho cộng đồng của bạn? Điền thông tin bên dưới, ban tổ chức Arex sẽ liên hệ hỗ trợ.
          </p>
          <TournamentRequestForm />
        </div>
      </section>

      {/* Past tournaments */}
      {past.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-4 w-0.5 rounded-full bg-muted-foreground" />
              <h2 className="font-heading text-sm font-black uppercase tracking-[0.12em] text-muted-foreground">Giải đấu đã kết thúc</h2>
            </div>
            <Link href="/tournaments" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">Xem tất cả <ChevronRight className="size-3" /></Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {past.map((t) => (
              <Link key={t.id} href={`/tournaments/${t.slug}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition-all hover:border-border/80 hover:bg-muted/30">
                <Trophy className="size-5 shrink-0 text-muted-foreground/40" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground line-clamp-1">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground">{STATUS_LABELS[t.status]} · {MODE_LABELS[t.mode]}</p>
                </div>
                <ExternalLink className="ml-auto size-3 shrink-0 text-muted-foreground/30" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
