import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/constants/site";
import { getTmsTeams } from "@/lib/tms/data";
import { SERVER_LABELS } from "@/lib/tms/types";
import type { TmsServer } from "@/lib/tms/types";
import { Users, Shield, Globe, Plus, ExternalLink, Search } from "lucide-react";

export const metadata: Metadata = {
  title: "Tuyển Thành Viên Clan & Team — Arex",
  description: "Tìm clan và đội nhóm Free Fire đang tuyển thành viên. Lọc theo server, phong cách chơi và gia nhập ngay.",
  alternates: { canonical: `${siteConfig.url}/tuyen-thanh-vien` },
  openGraph: {
    title: "Tuyển Thành Viên Clan & Team Free Fire — Arex",
    description: "Danh sách clan và team Free Fire đang tuyển thành viên. Tìm đội phù hợp và gia nhập ngay hôm nay.",
    url: `${siteConfig.url}/tuyen-thanh-vien`, type: "website",
  },
};

export const revalidate = 120;

const SERVER_ICON: Record<string, typeof Globe> = {};

export default async function RecruitmentPage() {
  const teams = await getTmsTeams().catch(() => []);
  const publicTeams = teams.filter((t) => t.is_public);

  const byServer: Record<string, typeof publicTeams> = {};
  for (const t of publicTeams) {
    byServer[t.server] = [...(byServer[t.server] ?? []), t];
  }

  return (
    <div className="mx-auto max-w-5xl py-8 md:py-12 space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-7 md:p-10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/8 via-transparent to-blue-500/6" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">Clan & Guild</p>
            <h1 className="font-heading text-3xl font-black uppercase tracking-tight text-foreground md:text-4xl">
              Góc Tuyển <span className="text-emerald-500">Thành Viên</span>
            </h1>
            <p className="max-w-md text-sm text-muted-foreground">
              Tìm clan hoặc đội nhóm Free Fire phù hợp. Tất cả {publicTeams.length} team đang mở cửa đón thành viên mới.
            </p>
          </div>
          <Link
            href="/tournaments/my-team"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 transition-colors"
          >
            <Plus className="size-4" /> Tạo Team
          </Link>
        </div>
        <div className="relative mt-5 flex flex-wrap gap-3">
          {(["vn","sg","global"] as TmsServer[]).map((s) => (
            <div key={s} className="flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs">
              <Globe className="size-3 text-emerald-500" />
              <span className="font-semibold text-foreground">{SERVER_LABELS[s]}</span>
              <span className="text-muted-foreground">{(byServer[s] ?? []).length} team</span>
            </div>
          ))}
        </div>
      </div>

      {publicTeams.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center space-y-4">
          <Users className="mx-auto size-10 text-muted-foreground/40" />
          <p className="text-muted-foreground">Chưa có team nào. Hãy là người đầu tiên tạo team!</p>
          <Link href="/tournaments/my-team" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
            <Plus className="size-4" /> Tạo Team ngay
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {(["vn","sg","global"] as TmsServer[]).filter((s) => (byServer[s] ?? []).length > 0).map((server) => (
            <section key={server} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-4 w-0.5 rounded-full bg-emerald-500" />
                <h2 className="font-heading text-sm font-black uppercase tracking-[0.14em] text-emerald-500">
                  {SERVER_LABELS[server]} — {(byServer[server] ?? []).length} team
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(byServer[server] ?? []).map((t) => (
                  <Link
                    key={t.id}
                    href={`/teams/${t.id}`}
                    className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition-all hover:border-emerald-400/40 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      {t.logo_url ? (
                        <img src={t.logo_url} alt={t.name} className="size-11 rounded-xl object-cover border border-border" />
                      ) : (
                        <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 font-heading text-sm font-black text-white">
                          {t.tag.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-heading text-sm font-black text-foreground truncate">{t.name}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">[{t.tag}]</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[10px]">
                      <span className="rounded-full border border-emerald-400/30 bg-emerald-400/8 px-2 py-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
                        {SERVER_LABELS[t.server as TmsServer]}
                      </span>
                      {t.total_points > 0 && (
                        <span className="rounded-full border border-amber-400/30 bg-amber-400/8 px-2 py-0.5 font-semibold text-amber-600 dark:text-amber-400">
                          {t.total_points.toLocaleString()} điểm
                        </span>
                      )}
                    </div>
                    <div className="mt-auto flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Shield className="size-3" /> Đang tuyển thành viên
                      </span>
                      <ExternalLink className="size-3.5 text-muted-foreground/40 group-hover:text-emerald-500 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* CTA - search */}
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center space-y-3">
        <Search className="mx-auto size-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Không tìm thấy team phù hợp? Đăng lên diễn đàn để tìm đồng đội.</p>
        <Link
          href="/cong-dong?category=Clan+%26+Team"
          className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2 text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
        >
          Xem diễn đàn Clan & Team
        </Link>
      </div>
    </div>
  );
}
