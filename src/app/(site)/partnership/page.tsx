import type { Metadata } from "next";
import Link from "next/link";
import { Handshake, ExternalLink, Mail, Star } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { PageContentOverride } from "@/components/common/page-content-override";
import { ContactInfo } from "@/components/common/contact-info";
import { getPartners } from "@/lib/server/partners";
import { SOCIAL_DEFS } from "@/lib/constants/social-links";
import { PARTNER_TIERS, TIER_LABEL, isPartnerLive, type Partner } from "@/lib/constants/partners";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hợp tác & Đối tác",
  description:
    "Nhà tài trợ, đối tác truyền thông và cộng đồng đồng hành cùng Arex. Liên hệ để hợp tác quảng bá, tài trợ giải đấu Free Fire.",
  alternates: { canonical: `${siteConfig.url}/partnership` },
  openGraph: {
    title: "Hợp tác & Đối tác | Arex",
    description: "Nhà tài trợ, đối tác truyền thông và cộng đồng đồng hành cùng Arex. Liên hệ để hợp tác quảng bá, tài trợ giải đấu Free Fire.",
    url: `${siteConfig.url}/partnership`,
    type: "website",
    siteName: siteConfig.name,
  },
};

function PartnerLogo({ src, alt }: { src?: string; alt: string }) {
  if (!src) return null;
  return (
    <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/40">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" className="size-full object-contain" />
    </span>
  );
}

function PartnerCard({ p }: { p: Partner }) {
  const socials = SOCIAL_DEFS.filter((s) => p.socials?.[s.key]);
  // Không có logo nào thì lấy chữ cái đầu làm ảnh đại diện bên trái.
  const hasLogo = !!(p.logo || p.logoRight);

  const title = (
    <span className="inline-flex min-w-0 items-center gap-1.5 font-heading text-sm font-black uppercase tracking-tight text-foreground">
      <span className="truncate">{p.name}</span>
      {p.featured && <Star className="size-3.5 shrink-0 text-amber-500" />}
      {p.url && <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />}
    </span>
  );

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4 transition-colors",
        p.featured ? "border-amber-400/40" : "border-border",
        p.url && "hover:border-primary/50",
      )}
    >
      {/* Logo hai bên tên — trái / phải đều tùy chọn. */}
      <div className="flex items-center justify-center gap-3">
        {p.logo ? (
          <PartnerLogo src={p.logo} alt={p.name} />
        ) : !hasLogo ? (
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40 font-heading text-lg font-black text-muted-foreground">
            {p.name.slice(0, 1).toUpperCase()}
          </span>
        ) : null}

        <div className="min-w-0 flex-1 text-center">
          {p.url ? (
            <a href={p.url} target="_blank" rel="noopener noreferrer nofollow" className="hover:text-primary">
              {title}
            </a>
          ) : (
            title
          )}
          {p.desc && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{p.desc}</p>}
        </div>

        <PartnerLogo src={p.logoRight} alt={p.name} />
      </div>

      {socials.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
          {socials.map((s) => {
            const Icon = s.icon;
            return (
              <a
                key={s.key}
                href={p.socials?.[s.key]}
                target="_blank"
                rel="noopener noreferrer nofollow"
                title={s.label}
                aria-label={`${p.name} — ${s.label}`}
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors",
                  s.brand,
                )}
              >
                <Icon className="size-4" />
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default async function HopTacPage() {
  // Ẩn thủ công (enabled) hoặc tự ẩn khi quá ngày hết hợp tác.
  const partners = (await getPartners()).filter((p) => isPartnerLive(p));

  // Nổi bật lên trước trong từng nhóm.
  const byTier = PARTNER_TIERS.map((tier) => ({
    tier,
    items: partners
      .filter((p) => p.tier === tier)
      .sort((a, b) => Number(!!b.featured) - Number(!!a.featured)),
  })).filter((g) => g.items.length > 0);

  return (
    <main className="container-main my-8 max-w-3xl space-y-8">
      <Breadcrumbs items={[{ name: "Hợp tác", href: "/partnership" }]} />

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

      {/* CTA hợp tác — admin đè được ở /admin/page-content */}
      <PageContentOverride pageKey="hop-tac">
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
      </PageContentOverride>

      {/* Thông tin liên hệ trực tiếp — luôn hiển thị trên trang, ngoài phần override */}
      <section className="space-y-3">
        <h2 className="text-center font-heading text-sm font-black uppercase tracking-widest text-muted-foreground">
          Liên hệ trực tiếp
        </h2>
        <ContactInfo />
      </section>
    </main>
  );
}
