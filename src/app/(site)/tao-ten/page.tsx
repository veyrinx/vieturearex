import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { SectionHeading } from "@/components/common/section-heading";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { NameGenerator } from "@/components/tools/name-generator";

export const metadata: Metadata = {
  title: "Tạo tên kí tự đặc biệt Free Fire — Nickname phong cách | Arex",
  description:
    "Tạo tên Free Fire kí tự đặc biệt, chữ kiểu đẹp + khung trang trí (꧁༒꧂, súng, kiếm...). Nhập tên, bấm copy dán vào game.",
  alternates: { canonical: `${siteConfig.url}/tao-ten` },
};

export default function TaoTenPage() {
  return (
    <main className="container-main my-8 max-w-2xl space-y-8">
      <Breadcrumbs items={[{ name: "Tạo tên kí tự", href: "/tao-ten" }]} />

      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="size-5" />
        </div>
        <SectionHeading title="Tạo tên kí tự đặc biệt" eyebrow="Nickname Free Fire" align="left" />
      </div>

      <NameGenerator />
    </main>
  );
}
