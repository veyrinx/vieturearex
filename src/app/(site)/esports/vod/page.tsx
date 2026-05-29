import type { Metadata } from "next";
import { getStreams } from "@/lib/server/stream-service";
import { siteConfig } from "@/lib/constants/site";
import { SectionHeading } from "@/components/common/section-heading";
import { VodGrid } from "./_vod-grid";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Thư viện VOD — Arex",
  description: "Xem lại các buổi livestream và video từ cộng đồng Arex.",
  alternates: { canonical: `${siteConfig.url}/esports/vod` },
};

export default async function VodPage() {
  const streams = await getStreams();
  const vods = streams.filter((s) => s.status === "ended");

  return (
    <div className="space-y-6 pt-6 md:pt-8">
      <SectionHeading
        eyebrow="Esports"
        title="THƯ VIỆN VOD"
        description="Xem lại các buổi phát sóng trực tiếp của cộng đồng Arex."
      />
      <VodGrid vods={vods} />
    </div>
  );
}
