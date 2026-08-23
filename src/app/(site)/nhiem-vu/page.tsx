import type { Metadata } from "next";
import { CalendarClock, Gift, Target } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { WeeklyQuests } from "@/components/profile/weekly-quests";

export const metadata: Metadata = {
  title: "Nhiệm Vụ Tuần — Nhận Điểm Đóng Góp",
  description:
    "Hoàn thành nhiệm vụ tuần trên Arex: đăng bài diễn đàn, bình luận tin tức, đóng góp wiki, giữ chuỗi điểm danh để nhận điểm đóng góp.",
  alternates: { canonical: `${siteConfig.url}/nhiem-vu` },
  openGraph: {
    title: "Nhiệm Vụ Tuần | Arex",
    description: "Làm nhiệm vụ tuần, nhận điểm đóng góp và lên hạng huy hiệu cộng đồng Arex.",
    url: `${siteConfig.url}/nhiem-vu`,
    type: "website",
  },
};

export default function QuestsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8 md:py-12">
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-card p-7 shadow-lg md:p-10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-teal-500/5" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />
        <div className="relative space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-400">
            Cộng Đồng · Arex
          </p>
          <h1 className="font-heading text-3xl font-black uppercase tracking-tight text-foreground md:text-4xl">
            Nhiệm Vụ <span className="text-emerald-600 dark:text-emerald-500">Tuần</span>
          </h1>
          <p className="max-w-xl text-sm font-medium leading-relaxed text-muted-foreground">
            Điểm danh thôi thì chưa đủ vui. Mỗi tuần có một loạt việc nhỏ trong cộng đồng — làm xong
            thì bấm nhận điểm đóng góp.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            {[
              { icon: Target, text: "Tiến độ đếm từ hoạt động thật" },
              { icon: Gift, text: "Thưởng điểm đóng góp" },
              { icon: CalendarClock, text: "Làm mới thứ Hai hằng tuần" },
            ].map(({ icon: Icon, text }) => (
              <span
                key={text}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/5 px-3.5 py-1.5 text-[11px] font-bold text-foreground shadow-sm"
              >
                <Icon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                {text}
              </span>
            ))}
          </div>
        </div>
      </div>

      <WeeklyQuests />
    </div>
  );
}
