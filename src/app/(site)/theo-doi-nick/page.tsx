import type { Metadata } from "next";
import { Bell, History, UserSearch } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { PlayerWatchPanel } from "@/components/tools/player-watch-panel";

export const metadata: Metadata = {
  title: "Theo Dõi Nick Free Fire — Báo Đổi Tên, Đổi Guild",
  description:
    "Ghim nick Free Fire để nhận thông báo khi có đổi tên, đổi guild, lên level hoặc thay đổi điểm rank. Xem lịch sử biến động trước khi mua acc.",
  alternates: { canonical: `${siteConfig.url}/theo-doi-nick` },
  openGraph: {
    title: "Theo Dõi Nick Free Fire | Arex",
    description:
      "Nhận thông báo khi nick bạn theo dõi đổi tên, đổi guild hay lên rank. Lịch sử đổi tên giúp nhận ra acc đã qua nhiều chủ.",
    url: `${siteConfig.url}/theo-doi-nick`,
    type: "website",
  },
};

export default function PlayerWatchPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 py-8 md:py-12">
      <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card p-7 shadow-lg md:p-10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-sky-500/5" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        <div className="relative space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
            Công Cụ Người Chơi · Arex
          </p>
          <h1 className="font-heading text-3xl font-black uppercase tracking-tight text-foreground md:text-4xl">
            Theo Dõi <span className="text-primary">Nick Free Fire</span>
          </h1>
          <p className="max-w-xl text-sm font-medium leading-relaxed text-muted-foreground">
            Ghim nick của bạn, của đối thủ hay của acc đang định mua. Mỗi ngày hệ thống chụp lại chỉ
            số một lần và báo cho bạn khi có thay đổi.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            {[
              { icon: Bell, text: "Báo khi đổi tên / đổi guild" },
              { icon: History, text: "Lịch sử biến động" },
              { icon: UserSearch, text: "Soi acc trước khi mua" },
            ].map(({ icon: Icon, text }) => (
              <span
                key={text}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/5 px-3.5 py-1.5 text-[11px] font-bold text-foreground shadow-sm"
              >
                <Icon className="size-3.5 text-primary" />
                {text}
              </span>
            ))}
          </div>
        </div>
      </div>

      <PlayerWatchPanel />
    </div>
  );
}
