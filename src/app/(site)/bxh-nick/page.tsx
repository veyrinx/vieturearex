import type { Metadata } from "next";
import Link from "next/link";
import { Trophy, Gem } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { NickList } from "./_list";
import { ShareButton } from "@/components/common/share-button";

export const metadata: Metadata = {
  title: "BXH độ khủng nick Free Fire | Arex",
  description:
    "Bảng xếp hạng độ khủng tài khoản Free Fire do cộng đồng tự khai từ máy ước tính — cho vui, không phải giá trị giao dịch.",
  alternates: { canonical: `${siteConfig.url}/bxh-nick` },
};

export const revalidate = 60;

type Row = { ff_id: string | null; display_name: string | null; avatar_url: string | null; score: number; tier: string | null };

async function getTop(): Promise<Row[]> {
  const db = createAdminSupabaseClient();
  if (!db) return [];
  const { data } = await untypedFrom(db, "account_scores")
    .select("ff_id, display_name, avatar_url, score, tier")
    .order("score", { ascending: false })
    .limit(100) as { data: Row[] | null };
  return data ?? [];
}

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

      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/dinh-gia-nick" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90">
          <Gem className="size-4" /> Tính & đăng nick của bạn
        </Link>
        <ShareButton title="BXH độ khủng nick Free Fire" text="Xem bảng xếp hạng nick khủng nhất cộng đồng Arex!" />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Chưa có ai đăng. Hãy là người đầu tiên!</p>
        </div>
      ) : (
        <NickList rows={rows} />
      )}

      <p className="text-center text-[11px] text-muted-foreground/70">
        Điểm do người dùng tự khai (chỉ để vui) — không phản ánh giá trị giao dịch. Mua/bán nick vi phạm điều khoản Garena.
      </p>
    </main>
  );
}
