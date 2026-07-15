import type { Metadata } from "next";
import Link from "next/link";
import {
  Crosshair, ListOrdered, Layers, Image as ImageIcon, ArrowRight, Wrench, Sparkles, CalendarClock, Activity, Skull, type LucideIcon,
} from "lucide-react";
import { siteConfig } from "@/lib/constants/site";

export const metadata: Metadata = {
  title: "Công Cụ Free Fire — Arex",
  description:
    "Bộ công cụ Free Fire cho người chơi: chỉnh độ nhạy theo máy, tier list nhân vật, ghép combo kỹ năng, thư viện icon. Miễn phí trên Arex Network.",
  alternates: { canonical: `${siteConfig.url}/cong-cu` },
  openGraph: {
    title: "Công Cụ Free Fire | Arex",
    description: "Chỉnh độ nhạy, tier list nhân vật, combo kỹ năng, thư viện icon — tất cả trong một chỗ.",
    url: `${siteConfig.url}/cong-cu`,
    type: "website",
  },
};

type Tool = { title: string; desc: string; href: string; icon: LucideIcon; color: string };

const TOOLS: Tool[] = [
  { title: "Chỉnh Độ Nhạy",   desc: "Gợi ý thông số độ nhạy theo cấu hình máy & lối chơi, tự nhận diện thiết bị.", href: "/do-nhay",   icon: Crosshair,   color: "text-sky-500 bg-sky-500/10" },
  { title: "Tier List Nhân Vật", desc: "Xếp hạng nhân vật S/A/B/C/D theo meta cộng đồng, lọc theo vai trò.",       href: "/tier-list", icon: ListOrdered, color: "text-amber-500 bg-amber-500/10" },
  { title: "Combo Kỹ Năng",   desc: "Ghép 1 kỹ năng chủ động + 3 bị động thành combo tối ưu cho lối chơi.",       href: "/combo",     icon: Layers,      color: "text-violet-500 bg-violet-500/10" },
  { title: "Thư Viện Icon",   desc: "Tra cứu hơn 33.000 icon Free Fire (vũ khí, nhân vật, skin...), copy & tải.",  href: "/items",     icon: ImageIcon,   color: "text-emerald-500 bg-emerald-500/10" },
  { title: "Tạo Tên Kí Tự",   desc: "Tạo nickname kí tự đặc biệt + khung trang trí phong cách, bấm copy vào game.", href: "/tao-ten",   icon: Sparkles,    color: "text-pink-500 bg-pink-500/10" },
  { title: "Đếm Ngược Sự Kiện", desc: "Đồng hồ đếm ngược tới bản cập nhật OB, reset rank và sự kiện sắp diễn ra.",  href: "/dem-nguoc", icon: CalendarClock, color: "text-cyan-500 bg-cyan-500/10" },
  { title: "Trạng Thái Máy Chủ", desc: "Free Fire có đang bảo trì / sự cố không + lịch bảo trì sắp tới.",             href: "/trang-thai", icon: Activity,     color: "text-rose-500 bg-rose-500/10" },
  { title: "Máy Tính K/D",     desc: "Tính K/D, tỉ lệ thắng, hạ gục trung bình mỗi trận từ chỉ số của bạn.",          href: "/tinh-kd",   icon: Skull,       color: "text-red-500 bg-red-500/10" },
];

export default function ToolsHubPage() {
  return (
    <div className="mx-auto max-w-4xl py-8 md:py-12 space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-7 md:p-10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/8 dark:from-amber-500/10" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent dark:via-amber-400/60" />
        <div className="relative space-y-3">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-primary dark:text-amber-400">
            <Wrench className="size-3.5" /> Người Chơi · Free Fire
          </p>
          <h1 className="font-heading text-3xl font-black uppercase tracking-tight text-foreground md:text-4xl">
            <span className="text-primary dark:text-amber-400">Công Cụ</span> Free Fire
          </h1>
          <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
            Bộ công cụ miễn phí giúp bạn tối ưu lối chơi: chỉnh độ nhạy, tra tier list, ghép combo kỹ năng
            và tra cứu thư viện icon.
          </p>
        </div>
      </div>

      {/* Tool grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
            >
              <div className={`flex size-12 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-110 ${t.color}`}>
                <Icon className="size-6" />
              </div>
              <div className="space-y-1">
                <h2 className="font-heading text-lg font-black uppercase tracking-tight text-foreground">{t.title}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{t.desc}</p>
              </div>
              <span className="mt-auto inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors group-hover:text-primary dark:group-hover:text-amber-400">
                Mở công cụ
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
