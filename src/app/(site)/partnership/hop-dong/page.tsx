import type { Metadata } from "next";
import Link from "next/link";
import { FileSignature, ShieldCheck, Clock, Scale } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { PartnershipContractForm } from "@/components/partnership/contract-form";
import { getPartyA } from "@/lib/server/partnership-contracts";
import { LEGAL_BASES } from "@/lib/constants/partnership-contract";

export const dynamic = "force-dynamic";

const DESC =
  "Ký hợp đồng hợp tác với Arex ngay trên website: điền thông tin hai bên, đọc toàn văn điều khoản và ký điện tử theo Luật Giao dịch điện tử 2023.";

export const metadata: Metadata = {
  title: "Ký hợp đồng hợp tác trực tuyến",
  description: DESC,
  alternates: { canonical: `${siteConfig.url}/partnership/hop-dong` },
  openGraph: {
    title: "Ký hợp đồng hợp tác trực tuyến | Arex",
    description: DESC,
    url: `${siteConfig.url}/partnership/hop-dong`,
    type: "website",
    siteName: siteConfig.name,
  },
};

const NOTES = [
  {
    icon: ShieldCheck,
    title: "Có giá trị pháp lý",
    desc: "Hợp đồng điện tử theo Luật Giao dịch điện tử 2023, lưu kèm mã kiểm tra toàn vẹn SHA-256.",
  },
  {
    icon: Clock,
    title: "Phản hồi trong 3 ngày",
    desc: "Bạn ký trước, Arex thẩm định rồi ký lại. Kết quả gửi về email bạn khai trong hợp đồng.",
  },
  {
    icon: Scale,
    title: "Đúng luật Việt Nam",
    desc: "Mẫu điều khoản soạn theo Bộ luật Dân sự 2015, Luật Thương mại 2005 và các văn bản liên quan.",
  },
];

export default async function KyHopDongPage() {
  const partyA = await getPartyA();

  return (
    <main className="container-main my-8 max-w-4xl space-y-6">
      <Breadcrumbs
        items={[
          { name: "Hợp tác", href: "/partnership" },
          { name: "Ký hợp đồng", href: "/partnership/hop-dong" },
        ]}
      />

      <PageHero
        icon={FileSignature}
        eyebrow="Hợp đồng điện tử"
        title="Ký hợp đồng hợp tác"
        subtitle="Điền thông tin hai bên, đọc toàn văn điều khoản rồi ký trực tiếp trên trình duyệt."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {NOTES.map((n) => {
          const Icon = n.icon;
          return (
            <div key={n.title} className="rounded-2xl border border-border bg-card p-4">
              <Icon className="size-5 text-primary dark:text-amber-400" />
              <p className="mt-2 font-heading text-sm font-black uppercase tracking-tight text-foreground">{n.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{n.desc}</p>
            </div>
          );
        })}
      </div>

      <PartnershipContractForm partyA={partyA} />

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-heading text-sm font-black uppercase tracking-widest text-muted-foreground">
          Căn cứ pháp lý của mẫu hợp đồng
        </h2>
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          {LEGAL_BASES.map((b) => (
            <li key={b} className="pl-4 -indent-4">
              — {b}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Cần trao đổi trước khi ký?{" "}
          <Link href="/lien-he" className="text-primary underline dark:text-amber-400">
            Liên hệ đội ngũ Arex
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
