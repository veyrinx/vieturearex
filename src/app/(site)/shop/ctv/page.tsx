import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { HandCoins } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { AgentDesk } from "@/components/shop/agent-desk";
import { getShopViewer } from "@/lib/server/shop";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bàn giao dịch viên — Chợ Arex",
  alternates: { canonical: `${siteConfig.url}/shop/ctv` },
  robots: { index: false, follow: false },
};

/**
 * Bàn làm việc của giao dịch viên (CTV trung gian).
 *
 * Vai trò `agent` do admin / super admin gán ở /admin/users. Người không có
 * vai trò đó thì trang này không tồn tại (404 chứ không phải "cấm vào") —
 * đỡ lộ ra là site có khu vực nội bộ nào.
 */
export default async function AgentDeskPage() {
  const viewer = await getShopViewer();
  if (!viewer.userId) redirect("/login?next=/shop/ctv");
  if (!viewer.isAgent) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5 py-8">
      <Breadcrumbs
        items={[
          { name: "Chợ Arex", href: "/shop" },
          { name: "Bàn giao dịch viên", href: "/shop/ctv" },
        ]}
      />
      <PageHero
        icon={HandCoins}
        eyebrow="Nội bộ"
        title="Bàn giao dịch viên"
        subtitle="Nhận đơn, soát tiền, giải ngân. Mỗi bước đều phải có ảnh bằng chứng."
      />
      <AgentDesk userId={viewer.userId} />
    </div>
  );
}
