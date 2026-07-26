import type { Metadata } from "next";
import { siteConfig } from "@/lib/constants/site";
import { CharacterVoteSection } from "@/components/votes/character-vote-section";
import { Trophy, Zap, RefreshCw } from "lucide-react";

export const metadata: Metadata = {
  title: "Bình Chọn Nhân Vật Mạnh Nhất",
  description: "Bình chọn nhân vật Free Fire mạnh nhất theo đánh giá của cộng đồng Arex. Alok, Chrono, K, Skyler và nhiều nhân vật khác.",
  alternates: { canonical: `${siteConfig.url}/binh-chon` },
  openGraph: {
    title: "Bình Chọn Nhân Vật Mạnh Nhất — Free Fire | Arex",
    description: "Cộng đồng bình chọn nhân vật Free Fire mạnh nhất mùa này. Cập nhật thời gian thực.",
    url: `${siteConfig.url}/binh-chon`,
    type: "website",
  },
};

export default function CharacterVotePage() {
  return (
    <div className="mx-auto max-w-5xl py-8 md:py-12 space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-7 md:p-10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-purple-500/8" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
        <div className="relative space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500 dark:text-amber-400">
            Community Poll · Mùa S1
          </p>
          <h1 className="font-heading text-3xl font-black uppercase tracking-tight text-foreground md:text-4xl">
            <span className="text-amber-500 dark:text-amber-400">Bình Chọn</span> Nhân Vật Mạnh Nhất
          </h1>
          <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
            Theo bạn, nhân vật nào mạnh nhất Free Fire hiện tại? Bình chọn và xem cộng đồng nghĩ gì.
            Mỗi tài khoản 1 phiếu — có thể đổi bất cứ lúc nào.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            {[
              { icon: Trophy, text: "Top 3 bình chọn nhiều nhất" },
              { icon: Zap,    text: "Kết quả cập nhật thời gian thực" },
              { icon: RefreshCw, text: "Có thể đổi phiếu bất kỳ lúc nào" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1 text-xs text-muted-foreground">
                <Icon className="size-3 text-amber-500" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      <CharacterVoteSection />
    </div>
  );
}
