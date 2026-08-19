import type { Metadata } from "next";
import { Zap, Shield, Layers } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { SkillComboBuilder } from "@/components/tools/skill-combo-builder";
import { FF_CHARACTERS, characterImage } from "@/lib/data/ff-characters";

const CHARACTERS = FF_CHARACTERS.map((c) => ({
  ...c,
  image: characterImage(c.itemId, c.image) ?? undefined,
}));

export const metadata: Metadata = {
  title: "Combo Kỹ Năng Nhân Vật Free Fire",
  description:
    "Ghép combo kỹ năng Free Fire: 1 kỹ năng chủ động + 3 bị động. Xây dựng đội hình kỹ năng theo lối chơi rush, bắn tỉa, hỗ trợ, thủ — có combo gợi ý, lưu & copy.",
  alternates: { canonical: `${siteConfig.url}/combo` },
  openGraph: {
    title: "Combo Kỹ Năng Free Fire | Arex",
    description: "Xây dựng combo 1 chủ động + 3 bị động tối ưu cho lối chơi của bạn.",
    url: `${siteConfig.url}/combo`,
    type: "website",
  },
};

export default function ComboPage() {
  return (
    <div className="mx-auto max-w-4xl py-8 md:py-12 space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-7 md:p-10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/8 dark:from-amber-500/10" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent dark:via-amber-400/60" />
        <div className="relative space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary dark:text-amber-400">
            Xây Dựng Đội Hình · Free Fire
          </p>
          <h1 className="font-heading text-3xl font-black uppercase tracking-tight text-foreground md:text-4xl">
            <span className="text-primary dark:text-amber-400">Combo</span> Kỹ Năng
          </h1>
          <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
            Ghép 1 kỹ năng chủ động và 3 kỹ năng bị động thành bộ combo hoàn chỉnh. Chọn theo lối chơi,
            xem chi tiết từng kỹ năng, lưu và chia sẻ đội hình.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            {[
              { icon: Zap, text: "1 chủ động + 3 bị động" },
              { icon: Layers, text: "Combo gợi ý sẵn" },
              { icon: Shield, text: "Lưu & copy đội hình" },
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

      <SkillComboBuilder characters={CHARACTERS} />
    </div>
  );
}
