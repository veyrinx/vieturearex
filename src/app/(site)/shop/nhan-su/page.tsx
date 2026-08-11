import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { StaffPanel } from "@/components/shop/staff-panel";
import { getShopViewer } from "@/lib/server/shop";
import { listShopStaff, listStaffMemberships } from "@/lib/server/shop-staff";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CTV gian hàng — Chợ Arex",
  alternates: { canonical: `${siteConfig.url}/shop/nhan-su` },
  robots: { index: false },
};

/**
 * Nhân sự của gian hàng: chủ shop mời CTV, người được mời trả lời.
 *
 * Trang này mở cho mọi người đã đăng nhập chứ không chỉ người bán — ai cũng có
 * thể được mời làm CTV, kể cả người chưa từng bán gì.
 */
export default async function ShopStaffPage() {
  const viewer = await getShopViewer();
  if (!viewer.userId) redirect("/login?next=/shop/nhan-su");

  const [staff, memberships] = await Promise.all([
    viewer.seller ? listShopStaff(viewer.seller.id) : Promise.resolve([]),
    listStaffMemberships(viewer.userId, ["invited", "active"]),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-5 py-8">
      <Breadcrumbs
        items={[
          { name: "Chợ Arex", href: "/shop" },
          { name: "CTV gian hàng", href: "/shop/nhan-su" },
        ]}
      />
      <PageHero
        icon={Users}
        eyebrow="Người bán"
        title="CTV gian hàng"
        subtitle="Mời người phụ đăng tin và xử lý đơn cho shop — bật đúng phần việc cần giao."
      />
      <StaffPanel
        shop={
          viewer.seller
            ? {
                id: viewer.seller.id,
                display_name: viewer.seller.display_name,
                approved: viewer.seller.status === "approved",
              }
            : null
        }
        staff={staff}
        invites={memberships.filter((m) => m.status === "invited")}
        memberships={memberships.filter((m) => m.status === "active")}
      />
    </div>
  );
}
