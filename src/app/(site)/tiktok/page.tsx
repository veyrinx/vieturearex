import type { Metadata } from "next";
import { Music2, Play, Clock, ExternalLink } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { getSocialVideos } from "@/lib/server/social";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "TikTok cộng đồng — Video Free Fire | Arex",
  description:
    "Tuyển tập video TikTok Free Fire nổi bật từ cộng đồng Arex: khoảnh khắc highlight, mẹo chơi, sự kiện.",
  alternates: { canonical: `${siteConfig.url}/tiktok` },
};

export default async function TiktokPage() {
  const videos = (await getSocialVideos()).filter((v) => v.enabled !== false);

  return (
    <main className="container-main my-8 max-w-3xl space-y-8">
      <Breadcrumbs items={[{ name: "TikTok", href: "/tiktok" }]} />

      <PageHero
        icon={Music2}
        eyebrow="Video cộng đồng"
        title="TikTok Free Fire"
        subtitle="Highlight, mẹo chơi và khoảnh khắc nổi bật từ cộng đồng — cập nhật liên tục."
      />

      {videos.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3">
          <Clock className="size-5 shrink-0 text-amber-500" />
          <p className="text-sm text-foreground"><b>Sắp có video.</b> Nội dung TikTok đang được cập nhật.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {videos.map((v) => (
            <a
              key={v.id}
              href={v.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex aspect-[9/16] items-end overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-muted/40 to-muted/10"
            >
              {v.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.thumbnail} alt={v.title} loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="size-8 text-muted-foreground/30" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-transform group-hover:scale-110">
                <Play className="size-4" />
              </div>
              {v.title && (
                <p className="relative z-10 line-clamp-2 p-2.5 text-xs font-semibold text-white drop-shadow">{v.title}</p>
              )}
            </a>
          ))}
        </div>
      )}

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
