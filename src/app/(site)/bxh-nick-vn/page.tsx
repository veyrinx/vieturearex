import type { Metadata } from "next";
import Link from "next/link";
import { Trophy, Crown, Search, Heart, Star } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { ShareButton } from "@/components/common/share-button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "BXH nick khủng Việt Nam (tự động) | Arex",
  description:
    "Bảng xếp hạng nick Free Fire khủng nhất khu vực Việt Nam — tự động chấm điểm từ dữ liệu thật (cấp độ, lượt thích, EXP, rank) mỗi khi có người tra cứu.",
  alternates: { canonical: `${siteConfig.url}/bxh-nick-vn` },
};

export const revalidate = 30;

type Row = {
  ff_id: string;
  nickname: string | null;
  level: number | null;
  likes: number | null;
  br_rank_point: number | null;
  score: number | null;
};

async function getTop(): Promise<Row[]> {
  const db = createAdminSupabaseClient();
  if (!db) return [];
  try {
    const { data } = (await untypedFrom(db, "ff_auto_scores")
      .select("ff_id, nickname, level, likes, br_rank_point, score")
      .eq("region", "VN")
      .order("score", { ascending: false })
      .limit(100)) as { data: Row[] | null };
    return data ?? [];
  } catch {
    return [];
  }
}

function medal(rank: number) {
  if (rank === 1) return "text-amber-400";
  if (rank === 2) return "text-slate-400";
  if (rank === 3) return "text-amber-700";
  return "text-muted-foreground";
}

export default async function BxhNickVnPage() {
  const rows = await getTop();

  return (
    <main className="container-main my-8 max-w-2xl space-y-8">
      <Breadcrumbs items={[{ name: "BXH nick VN", href: "/bxh-nick-vn" }]} />

      <PageHero
        icon={Trophy}
        eyebrow="Tự động · Khu vực Việt Nam"
        title="BXH nick khủng VN"
        subtitle="Xếp hạng nick FF Việt Nam khủng nhất — tự chấm điểm từ dữ liệu thật mỗi khi có người tra cứu. Không cần đăng ký."
      />

      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/tra-cuu-nick"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Search className="size-4" /> Tra cứu nick để lên BXH
        </Link>
        <ShareButton title="BXH nick khủng VN — Free Fire" text="Xem top nick Free Fire khủng nhất Việt Nam trên Arex!" />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Chưa có nick VN nào. Hãy <Link href="/tra-cuu-nick" className="text-primary underline dark:text-amber-400">tra cứu một nick</Link> để tự động thêm vào BXH!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => {
            const rank = i + 1;
            return (
              <div
                key={r.ff_id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3",
                  rank === 1 && "border-amber-400/40 bg-amber-400/5",
                  rank === 2 && "border-slate-400/30 bg-slate-400/5",
                  rank === 3 && "border-amber-700/30 bg-amber-700/5",
                  rank > 3 && "border-border bg-card",
                )}
              >
                <div className="flex w-8 shrink-0 items-center justify-center">
                  {rank <= 3 ? (
                    <Crown className={cn("size-5", medal(rank))} />
                  ) : (
                    <span className="font-mono text-sm font-bold text-muted-foreground">#{rank}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-sm font-black text-foreground">{r.nickname || "Ẩn danh"}</p>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Star className="size-3" /> Lv {r.level ?? "—"}</span>
                    <span className="inline-flex items-center gap-1"><Heart className="size-3" /> {(r.likes ?? 0).toLocaleString("vi-VN")}</span>
                    <span className="inline-flex items-center gap-1"><Trophy className="size-3" /> {(r.br_rank_point ?? 0).toLocaleString("vi-VN")}</span>
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-heading text-lg font-black tabular-nums text-primary dark:text-amber-400">
                    {(r.score ?? 0).toLocaleString("vi-VN")}
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">điểm</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-center text-[11px] text-muted-foreground/70">
        Điểm tự tính từ cấp độ, lượt thích, EXP & rank — chỉ để tham khảo cho vui. Chỉ gồm tài khoản khu vực VN.
      </p>
    </main>
  );
}
