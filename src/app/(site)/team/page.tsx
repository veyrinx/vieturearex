import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Users, Briefcase, Activity } from "lucide-react";
import { getAdminProfiles } from "@/lib/data/content-service";
import { TeamGrid } from "@/components/team/team-grid";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { getRoleMeta } from "@/lib/constants/roles";
import { siteConfig } from "@/lib/constants/site";
import type { PublicUserProfile } from "@/lib/types/content";

const TITLE = "Đội Ngũ Quản Trị Arex Network";
const PAGE_PATH = "/team";

export const revalidate = 120;

// generateMetadata và trang cùng cần danh sách này; cache() gộp lại một truy vấn
// cho mỗi lần render thay vì hỏi Supabase hai lượt.
const loadTeam = cache(async () => getAdminProfiles().catch(() => [] as PublicUserProfile[]));

/** Tên hiển thị + chức danh, dùng cho cả thẻ mô tả lẫn JSON-LD. */
function labelOf(p: PublicUserProfile) {
  const name = p.display_name ?? "Thành viên";
  const title = p.team_title ?? getRoleMeta(p.role).label;
  return `${name} (${title})`;
}

/**
 * Mô tả động: liệt kê thẳng tên người và mảng phụ trách thay vì một câu chung
 * chung. Google chấm trang đội ngũ theo việc nó có trả lời được "ai làm gì ở
 * đây" hay không — câu marketing cố định thì trang nào cũng giống trang nào.
 */
export async function generateMetadata(): Promise<Metadata> {
  const profiles = await loadTeam();
  const names = profiles.slice(0, 5).map(labelOf).join(", ");
  const duties = [...new Set(profiles.flatMap((p) => p.team_duties ?? []))].slice(0, 6).join(", ");

  const description = profiles.length
    ? `Đội ngũ ${profiles.length} quản trị viên vận hành Arex Network — cổng thông tin cộng đồng Free Fire.` +
      (names ? ` Gồm ${names}.` : "") +
      (duties ? ` Phụ trách: ${duties}.` : "")
    : "Đội ngũ quản trị và vận hành Arex Network — cổng thông tin cộng đồng Free Fire.";

  return {
    title: TITLE,
    description,
    keywords: [
      "đội ngũ Arex",
      "admin Arex Network",
      "ban quản trị Free Fire",
      "liên hệ quản trị viên Arex",
      ...profiles.slice(0, 8).map((p) => p.display_name ?? "").filter(Boolean),
    ],
    alternates: { canonical: `${siteConfig.url}${PAGE_PATH}` },
    openGraph: {
      title: TITLE,
      description,
      url: `${siteConfig.url}${PAGE_PATH}`,
      type: "website",
      siteName: siteConfig.name,
      images: [{ url: `${siteConfig.url}${siteConfig.ogImage}` }],
    },
    twitter: { card: "summary_large_image", title: TITLE, description },
  };
}

export default async function TeamPage() {
  const profiles = await loadTeam();

  // Nhóm theo mảng phụ trách để có phần "ai lo mảng nào" bằng chữ thật — thẻ
  // thành viên là lưới ảnh, còn Google đọc được đoạn văn bản này.
  const byDuty = new Map<string, PublicUserProfile[]>();
  for (const p of profiles) {
    for (const duty of p.team_duties ?? []) {
      byDuty.set(duty, [...(byDuty.get(duty) ?? []), p]);
    }
  }
  const dutyGroups = [...byDuty.entries()].sort((a, b) => b[1].length - a[1].length);
  const working = profiles.filter((p) => p.team_focus);

  // Organization + employee: dạng Google hiểu được cho trang "về đội ngũ".
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}${siteConfig.ogImage}`,
    description: siteConfig.description,
    employee: profiles.map((p) => ({
      "@type": "Person",
      name: p.display_name ?? "Thành viên",
      jobTitle: p.team_title ?? getRoleMeta(p.role).label,
      url: `${siteConfig.url}/u/${p.id}`,
      ...(p.avatar_url ? { image: p.avatar_url } : {}),
      ...(p.team_duties?.length ? { knowsAbout: p.team_duties } : {}),
      ...(p.team_focus ? { description: p.team_focus } : {}),
      worksFor: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
    })),
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-6 md:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumbs items={[{ name: "Đội ngũ", href: PAGE_PATH }]} />

      {/* Hero header */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-7 md:p-10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-violet-500/5 dark:from-amber-400/6" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 dark:bg-amber-400/10">
              <Users className="size-7 text-primary dark:text-amber-400" />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary dark:text-amber-400">Arex Network</p>
              <h1 className="font-heading text-3xl font-black uppercase tracking-tight text-foreground md:text-4xl">
                Đội Ngũ Vận Hành
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Ai quản lý mảng nào và đang làm gì — quản trị, biên tập, kỹ thuật và hỗ trợ cộng đồng Free Fire mỗi ngày
              </p>
            </div>
          </div>
          <div className="shrink-0 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-4 text-center dark:border-amber-400/20 dark:bg-amber-400/5">
            <p className="font-heading text-3xl font-black tabular-nums text-primary dark:text-amber-400">
              {profiles.length}
            </p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Thành viên
            </p>
          </div>
        </div>
      </div>

      {/* Ai phụ trách mảng nào */}
      {dutyGroups.length > 0 && (
        <section className="rounded-3xl border border-border bg-card p-6 md:p-8">
          <div className="flex items-center gap-2">
            <Briefcase className="size-4 text-primary dark:text-amber-400" />
            <h2 className="font-heading text-lg font-bold uppercase tracking-wider">Ai phụ trách mảng nào</h2>
          </div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dutyGroups.map(([duty, members]) => (
              <div key={duty} className="rounded-2xl border border-border bg-muted/30 p-4">
                <dt className="font-heading text-sm font-bold uppercase tracking-wide text-foreground">{duty}</dt>
                <dd className="mt-1.5 flex flex-wrap gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
                  {members.map((m, i) => (
                    <span key={m.id}>
                      <Link
                        href={`/u/${m.id}`}
                        className="font-semibold text-foreground transition-colors hover:text-primary dark:hover:text-amber-400"
                      >
                        {m.display_name ?? "Thành viên"}
                      </Link>
                      {m.team_title && <span className="text-muted-foreground"> — {m.team_title}</span>}
                      {i < members.length - 1 && ","}
                    </span>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Đang làm gì */}
      {working.length > 0 && (
        <section className="rounded-3xl border border-border bg-card p-6 md:p-8">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-primary dark:text-amber-400" />
            <h2 className="font-heading text-lg font-bold uppercase tracking-wider">Đội ngũ đang làm gì</h2>
          </div>
          <ul className="mt-5 space-y-3">
            {working.map((p) => (
              <li key={p.id} className="flex flex-wrap items-baseline gap-x-2 border-b border-border pb-3 last:border-0 last:pb-0">
                <Link
                  href={`/u/${p.id}`}
                  className="font-heading text-sm font-bold text-foreground transition-colors hover:text-primary dark:hover:text-amber-400"
                >
                  {p.display_name ?? "Thành viên"}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {p.team_title ?? getRoleMeta(p.role).label}
                </span>
                <span className="w-full text-sm text-muted-foreground sm:w-auto sm:flex-1">{p.team_focus}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <h2 className="sr-only">Danh sách thành viên đội ngũ Arex Network</h2>
      <TeamGrid profiles={profiles} />
    </div>
  );
}
