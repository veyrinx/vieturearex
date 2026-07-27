import type { Metadata } from "next";
import { Crosshair, Gauge, Smartphone } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { SensitivityTool } from "@/components/tools/sensitivity-tool";

export const metadata: Metadata = {
  title: "Công Cụ Chỉnh Độ Nhạy Free Fire",
  description:
    "Công cụ gợi ý thông số độ nhạy Free Fire theo phong cách chơi, số ngón và cấu hình máy. Tính nhanh độ nhạy chung, điểm đỏ, 2x, 4x, bắn tỉa và DPI đề xuất.",
  alternates: { canonical: `${siteConfig.url}/sensitivity` },
  openGraph: {
    title: "Công Cụ Chỉnh Độ Nhạy Free Fire | Arex",
    description:
      "Nhập phong cách chơi, số ngón và loại máy — nhận ngay thông số độ nhạy Free Fire tối ưu. Copy & lưu cấu hình.",
    url: `${siteConfig.url}/sensitivity`,
    type: "website",
  },
};

export default function SensitivityPage() {
  return (
    <div className="mx-auto max-w-5xl py-8 md:py-12 space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-7 md:p-10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/8 dark:from-amber-500/10" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent dark:via-amber-400/60" />
        <div className="relative space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary dark:text-amber-400">
            Công Cụ Người Chơi · Free Fire
          </p>
          <h1 className="font-heading text-3xl font-black uppercase tracking-tight text-foreground md:text-4xl">
            <span className="text-primary dark:text-amber-400">Chỉnh Độ Nhạy</span> Chuẩn Tay
          </h1>
          <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
            Chọn phong cách chơi, số ngón và cấu hình máy — công cụ sẽ gợi ý ngay bộ thông số độ nhạy
            phù hợp để bạn ngắm mượt và xoay tâm nhanh hơn.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            {[
              { icon: Crosshair, text: "6 thông số + DPI đề xuất" },
              { icon: Gauge, text: "Tinh chỉnh nhanh/chậm" },
              { icon: Smartphone, text: "Lưu cấu hình trên máy" },
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

      {/* Công cụ */}
      <SensitivityTool />
    </div>
  );
}
