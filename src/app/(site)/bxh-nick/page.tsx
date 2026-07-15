import type { Metadata } from "next";
import Link from "next/link";
import { Trophy, Crown, Gem } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "BXH độ khủng nick Free Fire | Arex",
  description:
    "Bảng xếp hạng độ khủng tài khoản Free Fire do cộng đồng tự khai từ máy ước tính — cho vui, không phải giá trị giao dịch.",
  alternates: { canonical: `${siteConfig.url}/bxh-nick` },
};

export const revalidate = 60;

type Row = { ff_name: string; score: number; tier: string | null };

async function getTop(): Promise<Row[]> {
  const db = createAdminSupabaseClient();
  if (!db) return [];
  const { data } = await untypedFrom(db, "account_scores")
    .select("ff_name, score, tier")
    .order("score", { ascending: false })
    .limit(100) as { data: Row[] | null };
  return data ?? [];
}

const MEDAL = ["text-amber-400", "text-zinc-400", "text-orange-600"];

export default async function BxhNickPage() {
  const rows = await getTop();

  return (
    <main className="container-main my-8 max-w-2xl space-y-8">
      <Breadcrumbs items={[{ name: "BXH nick", href: "/bxh-nick" }]} />

      <PageHero
        icon={Trophy}
        eyebrow="Nick khủng cộng đồng"
        title="BXH độ khủng nick"
        subtitle="Xếp hạng tài khoản khủng nhất do cộng đồng tự khai — cho vui."
      />

      <div className="flex justify-center">
        <Link href="/dinh-gia-nick" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90">
          <Gem className="size-4" /> Tính & đăng nick của bạn
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Chưa có ai đăng. Hãy là người đầu tiên!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={r.ff_name} className={cn("flex items-center gap-3 rounded-2xl border bg-card p-3", i < 3 ? "border-primary/40" : "border-border")}>
              <span className={cn("flex w-8 shrink-0 justify-center font-heading text-lg font-black", i < 3 ? MEDAL[i] : "text-muted-foreground")}>
                {i < 3 ? <Crown className="size-5" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-heading text-sm font-bold uppercase tracking-wide text-foreground">{r.ff_name}</p>
                {r.tier && <p className="text-[11px] text-muted-foreground">{r.tier}</p>}
              </div>
              <span className="shrink-0 font-heading text-lg font-black tabular-nums text-primary">{r.score.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-center text-[11px] text-muted-foreground/70">
        Điểm do người dùng tự khai (chỉ để vui) — không phản ánh giá trị giao dịch. Mua/bán nick vi phạm điều khoản Garena.
      </p>
    </main>
  );
}
