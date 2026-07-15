import type { Metadata } from "next";
import { Activity } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { SERVER_STATUS } from "@/lib/data/ff-server-status";
import { ServerStatus } from "@/components/tools/server-status";

export const metadata: Metadata = {
  title: "Trạng thái máy chủ Free Fire — Bảo trì & sự cố | Arex",
  description:
    "Kiểm tra Free Fire có đang bảo trì / gặp sự cố không, xem lịch bảo trì sắp tới và thời gian dự kiến hoạt động lại.",
  alternates: { canonical: `${siteConfig.url}/trang-thai` },
};

export default function TrangThaiPage() {
  return (
    <main className="container-main my-8 max-w-2xl space-y-8">
      <Breadcrumbs items={[{ name: "Trạng thái máy chủ", href: "/trang-thai" }]} />

      <PageHero
        icon={Activity}
        eyebrow="Máy chủ Free Fire"
        title="Trạng thái máy chủ"
        subtitle="Free Fire có đang bảo trì / sự cố không + lịch bảo trì sắp tới."
      />

      <ServerStatus data={SERVER_STATUS} />
    </main>
  );
}
