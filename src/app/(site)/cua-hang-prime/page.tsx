import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { getPrimeItems } from "@/lib/server/store";
import { PrimeStore } from "@/components/tools/prime-store";
import { getPrimeStoreLive } from "@/lib/server/prime-store-live";
import { PrimeStoreLivePanel } from "@/components/tools/prime-store-live";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cửa hàng Prime — Ưu đãi thành viên",
  description:
    "Cửa hàng Prime của Arex: gói thành viên Prime, ưu đãi kim cương và quyền lợi độc quyền cho cộng đồng Free Fire.",
  alternates: { canonical: `${siteConfig.url}/cua-hang-prime` },
  openGraph: {
    title: "Cửa hàng Prime — Ưu đãi thành viên | Arex",
    description: "Cửa hàng Prime của Arex: gói thành viên Prime, ưu đãi kim cương và quyền lợi độc quyền cho cộng đồng Free Fire.",
    url: `${siteConfig.url}/cua-hang-prime`,
    type: "website",
    siteName: siteConfig.name,
  },
};

export default async function CuaHangPrimePage() {
  const [items, live] = await Promise.all([
    getPrimeItems().then((list) => list.filter((i) => i.enabled !== false)),
    // Cửa hàng thật trong game — hỏng nguồn thì trang vẫn còn phần gói Prime.
    getPrimeStoreLive().catch(() => null),
  ]);

  return (
    <main className="container-main my-8 max-w-lg space-y-5">
      <Breadcrumbs items={[{ name: "Cửa hàng Prime", href: "/cua-hang-prime" }]} />

      {/* H1 cho SEO — tiêu đề hiển thị nằm trong khung cửa hàng bên dưới. */}
      <h1 className="sr-only">Cửa hàng Prime — gói thành viên & ưu đãi kim cương Free Fire</h1>

      {/* Nền game phủ lên gradient nền (ảnh lỗi thì vẫn còn gradient). */}
      <div
        className="overflow-hidden rounded-2xl p-3 sm:p-4"
        style={{
          backgroundColor: "#010308",
          backgroundImage:
            "url('/prime/FF_UI_Prime_Bg.jpg'), radial-gradient(circle at top, #1a3a6c 0%, #0d2752 25%, #051329 50%, #020813 75%, #010308 100%)",
          backgroundSize: "cover, auto",
          backgroundPosition: "center, center",
          backgroundRepeat: "no-repeat, no-repeat",
        }}
      >
        <PrimeStore items={items} />

        {live && (
          <div className="mt-4 border-t border-white/10 pt-4">
            <PrimeStoreLivePanel initial={live} />
          </div>
        )}
      </div>

      <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground/70">
        <ShieldCheck className="size-3.5" /> Nạp qua kênh chính thức — Arex không bán kim cương lậu.
      </p>
    </main>
  );
}
