import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Gift, Sparkles } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { FREE_METHODS, FREE_FRIENDLY } from "@/lib/data/ff-free-unlock";
import { charSlug, getCharacterBySlug } from "@/lib/data/ff-characters";

export const metadata: Metadata = {
  title: "Cách nhận nhân vật Free Fire miễn phí",
  description:
    "Tổng hợp cách sở hữu nhân vật Free Fire miễn phí: đăng nhập, nhiệm vụ, token, vòng quay free — và danh sách nhân vật dễ mở khoá.",
  alternates: { canonical: `${siteConfig.url}/nhan-vat-mien-phi` },
  openGraph: {
    title: "Cách nhận nhân vật Free Fire miễn phí | Arex",
    description: "Tổng hợp cách sở hữu nhân vật Free Fire miễn phí: đăng nhập, nhiệm vụ, token, vòng quay free — và danh sách nhân vật dễ mở khoá.",
    url: `${siteConfig.url}/nhan-vat-mien-phi`,
    type: "website",
    siteName: siteConfig.name,
  },
};

export default function NhanVatMienPhiPage() {
  const chars = FREE_FRIENDLY.map((f) => ({ ...f, char: getCharacterBySlug(charSlug(f.name)) }));

  return (
    <main className="container-main my-8 max-w-2xl space-y-8">
      <Breadcrumbs items={[{ name: "Nhân vật", href: "/nhan-vat" }, { name: "Nhận miễn phí", href: "/nhan-vat-mien-phi" }]} />

      <PageHero
        icon={Gift}
        eyebrow="Không tốn kim cương"
        title="Nhận nhân vật miễn phí"
        subtitle="Các cách sở hữu nhân vật Free Fire mà không cần nạp + nhân vật dễ mở khoá."
      />

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-heading text-base font-bold uppercase tracking-wide text-foreground">
          <Sparkles className="size-4 text-primary" /> Các cách nhận free
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {FREE_METHODS.map((m, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4">
              <p className="font-heading text-sm font-bold text-foreground">{m.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-base font-bold uppercase tracking-wide text-foreground">Nhân vật dễ sở hữu</h2>
        <div className="space-y-2">
          {chars.map(({ name, note, char }) => {
            const inner = (
              <>
                <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-muted/40">
                  {char?.image ? (
                    <Image src={char.image} alt={name} width={48} height={48} className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-lg font-black text-muted-foreground">{name.slice(0, 1)}</div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-heading text-sm font-bold uppercase tracking-wide text-foreground">{name}</p>
                  <p className="text-xs text-muted-foreground">{note}</p>
                </div>
              </>
            );
            return char ? (
              <Link key={name} href={`/nhan-vat/${char.slug}`} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-primary/50">
                {inner}
              </Link>
            ) : (
              <div key={name} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">{inner}</div>
            );
          })}
        </div>
      </section>

      <p className="text-center text-[11px] text-muted-foreground/70">
        Danh sách mang tính tham khảo — cách nhận thay đổi theo sự kiện từng mùa. Xem thêm{" "}
        <Link href="/nhan-vat" className="text-primary hover:underline">tất cả nhân vật</Link>.
      </p>
    </main>
  );
}
