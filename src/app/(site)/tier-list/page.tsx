import type { Metadata } from "next";
import { Swords, Filter, Sparkles } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { CharacterTierList } from "@/components/tools/character-tier-list";
import { FF_CHARACTERS, charSlug } from "@/lib/data/ff-characters";
import { supabaseUrl } from "@/lib/supabase/env";

// Ảnh chân dung nạp từ bụ­c ff-items, thư mục con characters/<slug>.png (thiếu -> fallback chữ cái)
const IMG_BASE = supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/ff-items/characters/` : null;
const CHARACTERS = FF_CHARACTERS.map((c) => ({
  ...c,
  image: IMG_BASE ? `${IMG_BASE}${charSlug(c.name)}.png` : undefined,
}));

export const metadata: Metadata = {
  title: "Tier List Nhân Vật Free Fire",
  description:
    "Bảng xếp hạng (tier list) nhân vật Free Fire mới nhất theo đánh giá cộng đồng: S/A/B/C/D, lọc theo vai trò áp sát, hỗ trợ, hồi máu, cơ động, phòng thủ, trinh sát.",
  alternates: { canonical: `${siteConfig.url}/tier-list` },
  openGraph: {
    title: "Tier List Nhân Vật Free Fire | Arex",
    description:
      "Xếp hạng nhân vật Free Fire theo meta cộng đồng — tìm nhân vật mạnh nhất theo vai trò và kỹ năng.",
    url: `${siteConfig.url}/tier-list`,
    type: "website",
  },
};

export default function TierListPage() {
  return (
    <div className="mx-auto max-w-4xl py-8 md:py-12 space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-7 md:p-10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-red-500/8 dark:from-amber-500/10" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent dark:via-amber-400/60" />
        <div className="relative space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary dark:text-amber-400">
            Meta Cộng Đồng · Free Fire
          </p>
          <h1 className="font-heading text-3xl font-black uppercase tracking-tight text-foreground md:text-4xl">
            <span className="text-primary dark:text-amber-400">Tier List</span> Nhân Vật
          </h1>
          <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
            Xếp hạng nhân vật Free Fire theo đánh giá cộng đồng. Lọc theo vai trò, tìm theo kỹ năng
            và bấm vào từng nhân vật để xem chi tiết.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            {[
              { icon: Swords, text: "5 bậc S · A · B · C · D" },
              { icon: Filter, text: "Lọc theo 6 vai trò" },
              { icon: Sparkles, text: "Chi tiết kỹ năng từng tướng" },
            ].map(({ icon: Icon, text }) => (
              <span
                key={text}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground"
              >
                <Icon className="size-3.5 text-primary dark:text-amber-400" />
                {text}
              </span>
            ))}
          </div>
        </div>
      </div>

      <CharacterTierList characters={CHARACTERS} />
    </div>
  );
}
