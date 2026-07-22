import type { Metadata } from "next";
import Link from "next/link";
import { Handshake, ExternalLink, Mail, Star } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { getPartners } from "@/lib/server/partners";
import { PARTNER_TIERS, TIER_LABEL, type Partner } from "@/lib/constants/partners";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hợp tác & Đối tác | Arex",
  description:
    "Nhà tài trợ, đối tác truyền thông và cộng đồng đồng hành cùng Arex. Liên hệ để hợp tác quảng bá, tài trợ giải đấu Free Fire.",
  alternates: { canonical: `${siteConfig.url}/hop-tac` },
};

function PartnerCard({ p }: { p: Partner }) {
  const inner = (
    <>
      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/40">
        {p.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.logo} alt={p.name} loading="lazy" className="size-full object-contain" />
        ) : (
          <span className="font-heading text-lg font-black text-muted-foreground">
            {p.name.slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 font-heading text-sm font-black uppercase tracking-tight text-foreground">
          <span className="truncate">{p.name}</span>
          {p.featured && <Star className="size-3.5 shrink-0 text-amber-500" />}
        </p>
        {p.desc && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{p.desc}</p>}
      </div>
      {p.url && <ExternalLink className="size-4 shrink-0 text-muted-foreground" />}
    </>
  );

  const cls = cn(
    "flex items-center gap-3 rounded-2xl border bg-card p-4 transition-colors",
    p.featured ? "border-amber-400/40" : "border-border",
    p.url && "hover:border-primary/50",
  );

  return p.url ? (
    <a href={p.url} target="_blank" rel="noopener noreferrer nofollow" className={cls}>{inner}</a>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

export default async function HopTacPage() {
  const partners = (await getPartners()).filter((p) => p.enabled !== false);

  // Nổi bật lên trước trong từng nhóm.
  const byTier = PARTNER_TIERS.map((tier) => ({
    tier,
    items: partners
      .filter((p) => p.tier === tier)
      .sort((a, b) => Number(!!b.featured) - Number(!!a.featured)),
  })).filter((g) => g.items.length > 0);

  return (
    <main className="container-main my-8 max-w-3xl space-y-8">
      <Breadcrumbs items={[{ name: "Hợp tác", href: "/hop-tac" }]} />

      <PageHero
        icon={Handshake}
        eyebrow="Đồng hành cùng Arex"
        title="Hợp tác & Đối tác"
        subtitle="Nhà tài trợ, đối tác truyền thông và cộng đồng đang đồng hành cùng Arex."
      />

      {byTier.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <Handshake className="mx-auto mb-3 size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Chưa có đối tác nào được công bố. Bạn muốn đồng hành cùng Arex?{" "}
            <Link href="/lien-he" className="text-primary underline dark:text-amber-400">Liên hệ với chúng tôi</Link>.
          </p>
        </div>
      ) : (
        byTier.map((g) => (
          <section key={g.tier} className="space-y-3">
            <h2 className="font-heading text-sm font-black uppercase tracking-widest text-muted-foreground">
              {TIER_LABEL[g.tier]}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {g.items.map((p) => <PartnerCard key={p.id} p={p} />)}
            </div>
          </section>
        ))
      )}

      {/* CTA hợp tác */}
      <section className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-6 text-center">
        <h2 className="font-heading text-lg font-black uppercase tracking-tight text-foreground">
          Muốn hợp tác với Arex?
        </h2>
        <p className="mx-auto mt-1.5 max-w-lg text-sm text-muted-foreground">
          Chúng tôi nhận tài trợ giải đấu, hợp tác truyền thông và trao đổi cộng đồng Free Fire.
          Gửi thông tin để đội ngũ liên hệ lại.
        </p>
        <Link
          href="/lien-he"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Mail className="size-4" /> Liên hệ hợp tác
        </Link>
      </section>
    </main>
  );
}
