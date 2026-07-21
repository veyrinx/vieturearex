import type { Metadata } from "next";
import { Music2, Play, Clock, ExternalLink } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";

export const metadata: Metadata = {
  title: "TikTok cộng đồng — Video Free Fire | Arex",
  description:
    "Tuyển tập video TikTok Free Fire nổi bật từ cộng đồng Arex: khoảnh khắc highlight, mẹo chơi, sự kiện. Sắp ra mắt.",
  alternates: { canonical: `${siteConfig.url}/tiktok` },
};

// Placeholder (scaffold) — sẽ thay bằng nội dung nhúng thật từ /admin/social.
const SLOTS = Array.from({ length: 6 });

export default function TiktokPage() {
  return (
    <main className="container-main my-8 max-w-3xl space-y-8">
      <Breadcrumbs items={[{ name: "TikTok", href: "/tiktok" }]} />

      <PageHero
        icon={Music2}
        eyebrow="Video cộng đồng"
        title="TikTok Free Fire"
        subtitle="Highlight, mẹo chơi và khoảnh khắc nổi bật từ cộng đồng — cập nhật liên tục."
      />

      <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3">
        <Clock className="size-5 shrink-0 text-amber-500" />
        <p className="text-sm text-foreground">
          <b>Sắp ra mắt.</b> Video TikTok sẽ được quản lý & nhúng từ trang quản trị.
        </p>
      </div>

      {/* Lưới video (khung 9:16 kiểu TikTok) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {SLOTS.map((_, i) => (
          <div
            key={i}
            className="group relative flex aspect-[9/16] items-center justify-center overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-muted/40 to-muted/10"
          >
            <div className="flex size-12 items-center justify-center rounded-full bg-foreground/5 text-muted-foreground/40 transition-transform group-hover:scale-110">
              <Play className="size-5" />
            </div>
            <span className="absolute bottom-2 left-2 rounded-md bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-white/70 backdrop-blur-sm">
              Video #{i + 1}
            </span>
          </div>
        ))}
      </div>

      <a
        href="https://tiktok.com/vieturetechnologycenter"
        target="_blank"
        rel="noopener noreferrer"
        className="mx-auto flex w-fit items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
      >
        <ExternalLink className="size-4" /> Theo dõi TikTok của chúng tôi
      </a>
    </main>
  );
}
