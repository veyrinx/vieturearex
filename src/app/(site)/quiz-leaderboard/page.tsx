import type { Metadata } from "next";
import Link from "next/link";
import { Brain, Crown, Play } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { cn } from "@/lib/utils";
import { ShareButton } from "@/components/common/share-button";

export const metadata: Metadata = {
  title: "BXH Quiz Free Fire",
  description: "Bảng xếp hạng điểm Quiz Free Fire — ai hiểu game nhất cộng đồng Arex.",
  alternates: { canonical: `${siteConfig.url}/quiz-leaderboard` },
  openGraph: {
    title: "BXH Quiz Free Fire | Arex",
    description: "Bảng xếp hạng điểm Quiz Free Fire — ai hiểu game nhất cộng đồng Arex.",
    url: `${siteConfig.url}/quiz-leaderboard`,
    type: "website",
    siteName: siteConfig.name,
  },
};

export const revalidate = 60;

type Row = {
  best_score: number;
  best_total: number;
  plays: number;
  users: { display_name: string | null; avatar_url: string | null } | null;
};

async function getTop(): Promise<Row[]> {
  const db = createAdminSupabaseClient();
  if (!db) return [];
  try {
    const { data } = (await untypedFrom(db, "quiz_scores")
      .select("best_score, best_total, plays, users(display_name, avatar_url)")
      .order("best_score", { ascending: false })
      .limit(50)) as { data: Row[] | null };
    return data ?? [];
  } catch {
    return [];
  }
}

const MEDAL = ["text-amber-400", "text-zinc-400", "text-orange-600"];

export default async function BxhQuizPage() {
  const rows = await getTop();

  return (
    <main className="container-main my-8 max-w-2xl space-y-8">
      <Breadcrumbs items={[{ name: "BXH Quiz", href: "/quiz-leaderboard" }]} />
      <PageHero
        icon={Brain}
        eyebrow="Đố vui"
        title="BXH Quiz Free Fire"
        subtitle="Ai hiểu game nhất? Xếp theo điểm quiz cao nhất. Chơi trong Mini App Telegram để lưu điểm."
      />

      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/quiz" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90">
          <Play className="size-4" /> Chơi Quiz ngay
        </Link>
        <ShareButton title="BXH Quiz Free Fire" text="Ai hiểu Free Fire nhất? Xem BXH Quiz cộng đồng Arex!" />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Chưa có ai lưu điểm. Chơi trong Mini App để lên bảng!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => {
            const name = r.users?.display_name || "Người chơi";
            return (
              <div key={i} className={cn("flex items-center gap-3 rounded-2xl border bg-card p-3", i < 3 ? "border-primary/40" : "border-border")}>
                <span className={cn("flex w-8 shrink-0 justify-center font-heading text-lg font-black", i < 3 ? MEDAL[i] : "text-muted-foreground")}>
                  {i < 3 ? <Crown className="size-5" /> : i + 1}
                </span>
                <div className="size-9 shrink-0 overflow-hidden rounded-full border border-border bg-muted/40">
                  {r.users?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.users.avatar_url} alt={name} className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-sm font-black text-muted-foreground">{name.slice(0, 1).toUpperCase()}</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-sm font-bold uppercase tracking-wide text-foreground">{name}</p>
                  <p className="text-[11px] text-muted-foreground">{r.plays} lượt chơi</p>
                </div>
                <span className="shrink-0 font-heading text-lg font-black tabular-nums text-primary">
                  {r.best_score}<span className="text-sm text-muted-foreground">/{r.best_total}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
