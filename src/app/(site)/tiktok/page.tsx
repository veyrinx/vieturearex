import type { Metadata } from "next";
import { Music2, Clock, ExternalLink } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { getSocialVideos } from "@/lib/server/social";
import { SocialVideoGrid } from "@/components/tools/social-video-grid";

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
        <SocialVideoGrid videos={videos} />
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
