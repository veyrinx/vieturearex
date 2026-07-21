import type { Metadata } from "next";
import { Rocket } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { getResolvedProjects } from "@/lib/server/projects";
import { PROJECT_STATUS_META, type ResolvedProject } from "@/lib/constants/projects";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sắp ra mắt — Tiến độ tính năng | Arex",
  description: "Các tính năng, công cụ Arex đang phát triển và sắp ra mắt, kèm tiến độ hoàn thiện.",
  alternates: { canonical: `${siteConfig.url}/sap-ra-mat` },
};

// Ưu tiên hiển thị: đang làm dở lên trước, đã ra mắt xuống cuối.
const ORDER: Record<ResolvedProject["status"], number> = {
  finishing: 0,
  in_progress: 1,
  locked: 2,
  planning: 3,
  live: 4,
};

function Card({ p }: { p: ResolvedProject }) {
  const meta = PROJECT_STATUS_META[p.status];
  const colorText = meta.color.split(" ")[0];
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-bold text-foreground">{p.name}</h3>
          {p.category && <span className="text-xs text-muted-foreground">{p.category}</span>}
        </div>
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${meta.color}`}>
          {meta.label}
        </span>
      </div>
      {p.description && <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>}
      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-muted-foreground">Tiến độ</span>
          <span className={colorText}>{p.progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className={`h-full rounded-full ${colorText}`} style={{ width: `${p.progress}%`, backgroundColor: "currentColor" }} />
        </div>
      </div>
      {p.targetDate && (
        <p className="mt-3 text-xs text-muted-foreground">Dự kiến: <b className="text-foreground">{p.targetDate}</b></p>
      )}
    </div>
  );
}

export default async function SapRaMatPage() {
  const projects = (await getResolvedProjects()).sort((a, b) => {
    const d = ORDER[a.status] - ORDER[b.status];
    return d !== 0 ? d : b.progress - a.progress;
  });

  return (
    <main className="container-main my-8 max-w-4xl space-y-8">
      <Breadcrumbs items={[{ name: "Sắp ra mắt", href: "/sap-ra-mat" }]} />

      <PageHero
        icon={Rocket}
        eyebrow="Roadmap Arex"
        title="Sắp ra mắt"
        subtitle="Các tính năng đang được phát triển — tiến độ cập nhật tự động theo tình trạng thực tế."
      />

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Chưa có dự án nào được công bố.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((p) => <Card key={p.id} p={p} />)}
        </div>
      )}
    </main>
  );
}
