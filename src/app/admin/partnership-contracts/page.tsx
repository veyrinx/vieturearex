import type { Metadata } from "next";
import { requireAdminAccess } from "@/lib/server/auth";
import { PartnershipContractsPanel } from "@/components/admin/partnership-contracts-panel";
import { expireOverdueContracts, getPartyA, listContracts } from "@/lib/server/partnership-contracts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hợp Đồng Hợp Tác",
  description: "Duyệt, ký và theo dõi hợp đồng hợp tác điện tử với đối tác.",
};

export default async function AdminHopDongPage() {
  // Layout cũng gọi requireAdminAccess, nhưng layout và page render SONG SONG —
  // thiếu dòng này thì dữ liệu hợp đồng (CCCD, chữ ký) vẫn kịp chảy ra RSC
  // stream trước khi redirect kịp chặn.
  const auth = await requireAdminAccess();

  await expireOverdueContracts();
  const [items, partyA] = await Promise.all([listContracts(), getPartyA()]);

  return (
    <PartnershipContractsPanel
      initialItems={items}
      initialPartyA={partyA}
      canEdit={auth.role === "super_admin"}
    />
  );
}
