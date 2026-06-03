import type { Metadata } from "next";
import { Users } from "lucide-react";
import { getAdminProfiles } from "@/lib/data/content-service";
import { TeamGrid } from "@/components/team/team-grid";

export const metadata: Metadata = {
  title: "Đội Ngũ — Arex",
  description: "Gặp gỡ đội ngũ quản trị và vận hành của Arex Network — những người xây dựng và phát triển cộng đồng Free Fire.",
};

export const revalidate = 120;

export default async function TeamPage() {
  const profiles = await getAdminProfiles();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12 space-y-8">
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
                Những người đứng sau Arex — quản trị, biên tập và hỗ trợ cộng đồng Free Fire mỗi ngày
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

      <TeamGrid profiles={profiles} />
    </div>
  );
}
