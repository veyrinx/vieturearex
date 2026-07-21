import type { Metadata } from "next";
import Link from "next/link";
import { Trophy, Search, Gem } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { ShareButton } from "@/components/common/share-button";
import { BxhNickTabs, type AutoRow, type CommunityRow } from "./_tabs";

export const metadata: Metadata = {
  title: "BXH nick khủng Free Fire Việt Nam | Arex",
  description:
    "Bảng xếp hạng nick Free Fire khủng nhất khu vực Việt Nam — tự động chấm điểm từ dữ liệu thật (cấp độ, lượt thích, EXP, rank) mỗi khi có người tra cứu, kèm bảng điểm cộng đồng tự khai.",
  alternates: { canonical: `${siteConfig.url}/bxh-nick-vn` },
};

export const revalidate = 30;

/** BXH tự động — chấm điểm từ dữ liệu thật khi có người tra cứu nick VN. */
async function getAuto(): Promise<AutoRow[]> {
  const db = createAdminSupabaseClient();
  if (!db) return [];
  try {
    const { data } = (await untypedFrom(db, "ff_auto_scores")
      .select("ff_id, nickname, level, likes, br_rank_point, score")
      .eq("region", "VN")
      .order("score", { ascending: false })
      .limit(100)) as { data: AutoRow[] | null };
    return data ?? [];
  } catch {
    return [];
  }
}

/** BXH cộng đồng tự khai qua máy ước tính /dinh-gia-nick. */
async function getCommunity(): Promise<CommunityRow[]> {
  const db = createAdminSupabaseClient();
  if (!db) return [];
  try {
    const { data } = (await untypedFrom(db, "account_scores")
      .select("ff_id, display_name, avatar_url, score, tier")
      .order("score", { ascending: false })
      .limit(100)) as { data: CommunityRow[] | null };
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function BxhNickVnPage() {
  const [auto, community] = await Promise.all([getAuto(), getCommunity()]);

  return (
    <main className="container-main my-8 max-w-2xl space-y-8">
      <Breadcrumbs items={[{ name: "BXH nick", href: "/bxh-nick-vn" }]} />

      <PageHero
        icon={Trophy}
        eyebrow="Tự động · Khu vực Việt Nam"
        title="BXH nick khủng"
        subtitle="Xếp hạng nick FF Việt Nam khủng nhất — tự chấm điểm từ dữ liệu thật mỗi khi có người tra cứu. Không cần đăng ký."
      />

      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/tra-cuu-nick"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Search className="size-4" /> Tra cứu nick để lên BXH
        </Link>
        <Link
          href="/dinh-gia-nick"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          <Gem className="size-4" /> Ước tính độ khủng
        </Link>
        <ShareButton title="BXH nick khủng VN — Free Fire" text="Xem top nick Free Fire khủng nhất Việt Nam trên Arex!" />
      </div>

      <BxhNickTabs auto={auto} community={community} />
    </main>
  );
}
