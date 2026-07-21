import type { Metadata } from "next";
import { Crown, ShieldCheck } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { getPrimeItems } from "@/lib/server/store";
import { PrimeStore } from "@/components/tools/prime-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cửa hàng Prime — Ưu đãi thành viên | Arex",
  description:
    "Cửa hàng Prime của Arex: gói thành viên Prime, ưu đãi kim cương và quyền lợi độc quyền cho cộng đồng Free Fire.",
  alternates: { canonical: `${siteConfig.url}/cua-hang-prime` },
};

export default async function CuaHangPrimePage() {
  const items = (await getPrimeItems()).filter((i) => i.enabled !== false);

  return (
    <main className="container-main my-8 max-w-4xl space-y-6">
      <Breadcrumbs items={[{ name: "Cửa hàng Prime", href: "/cua-hang-prime" }]} />

      <PageHero
        icon={Crown}
        eyebrow="Ưu đãi thành viên"
        title="Cửa hàng Prime"
        subtitle="Gói thành viên Prime, ưu đãi kim cương và quyền lợi độc quyền cho cộng đồng."
      />

      <PrimeStore items={items} />

      <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground/70">
        <ShieldCheck className="size-3.5" /> Nạp qua kênh chính thức — Arex không bán kim cương lậu.
      </p>
    </main>
  );
}
