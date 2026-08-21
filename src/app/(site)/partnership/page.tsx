import type { Metadata } from "next";
import Link from "next/link";
import {
  Handshake, ExternalLink, Mail, Star, FileSignature, ShieldCheck, XCircle, CheckCircle2, ArrowRight,
  UserPlus, Wrench,
} from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { PageContentOverride } from "@/components/common/page-content-override";
import { ContactInfo } from "@/components/common/contact-info";
import { getPartners } from "@/lib/server/partners";
import { SOCIAL_DEFS } from "@/lib/constants/social-links";
import { PARTNER_TIERS, TIER_LABEL, isPartnerLive, type Partner } from "@/lib/constants/partners";
import { CONTRACT_KINDS, KIND_DESC, KIND_LABEL, KIND_PAIR, type ContractKind } from "@/lib/constants/partnership-contract";
import {
  AREX_CAPABILITIES, NOT_ACCEPTED, PACKAGE_BENEFITS, PACKAGE_FEE_NOTE, PACKAGE_TAGLINE,
  MEMBER_BENEFITS, TECH_BENEFITS,
  PARTNERSHIP_FAQ, PARTNERSHIP_PROCESS,
} from "@/lib/constants/partnership";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const DESC =
  "Hợp tác cùng Arex: đội nhóm và cộng đồng đồng hành, cá nhân tham gia đội ngũ, đối tác kỹ thuật. Xem quyền lợi từng hình thức, quy trình và ký hợp đồng điện tử ngay trên website.";

export const metadata: Metadata = {
  title: "Hợp tác & Đối tác",
  description: DESC,
  alternates: { canonical: `${siteConfig.url}/partnership` },
  openGraph: {
    title: "Hợp tác & Đối tác | Arex",
    description: DESC,
    url: `${siteConfig.url}/partnership`,
    type: "website",
    siteName: siteConfig.name,
  },
};

const KIND_ICON: Record<ContractKind, typeof Handshake> = {
  team: Handshake,
  member: UserPlus,
  tech: Wrench,
};

/** Quyền lợi tiêu biểu hiện trên thẻ hình thức — bản đầy đủ nằm trong hợp đồng. */
const KIND_HIGHLIGHTS: Record<ContractKind, string[]> = {
  team: PACKAGE_BENEFITS.community.slice(0, 3),
  member: MEMBER_BENEFITS.slice(0, 3),
  tech: TECH_BENEFITS.slice(0, 3),
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

function SectionTitle({ eyebrow, title, desc }: { eyebrow: string; title: string; desc?: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary dark:text-amber-400">{eyebrow}</p>
      <h2 className="mt-1 font-heading text-lg font-black uppercase tracking-tight text-foreground md:text-xl">
        {title}
      </h2>
      {desc && <p className="mx-auto mt-1.5 max-w-2xl text-sm text-muted-foreground">{desc}</p>}
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

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: PARTNERSHIP_FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <main className="container-main my-8 max-w-4xl space-y-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <div className="space-y-8">
        <Breadcrumbs items={[{ name: "Hợp tác", href: "/partnership" }]} />

        <PageHero
          icon={Handshake}
          eyebrow="Đồng hành cùng Arex"
          title="Hợp tác & Đối tác"
          subtitle="Đội với đội, thành viên với đội ngũ, hoặc đối tác kỹ thuật — xem trước mọi thứ ở đây rồi ký hợp đồng điện tử khi thấy hợp."
        />

        {/* ── Ba hình thức hợp tác — phần chính của trang giới thiệu ─────── */}
        <section className="space-y-4">
          <SectionTitle
            eyebrow="Ba hình thức"
            title="Arex hợp tác với ai"
            desc="Không phải hợp đồng doanh nghiệp — đây là thỏa thuận giữa các đội nhóm và cá nhân trong cộng đồng, mỗi hình thức một bộ điều khoản riêng."
          />
          <div className="grid gap-3 md:grid-cols-3">
            {CONTRACT_KINDS.map((k) => {
              const Icon = KIND_ICON[k];
              return (
                <div key={k} className="flex flex-col rounded-2xl border border-border bg-card p-5">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-amber-400/10 dark:text-amber-400">
                    <Icon className="size-5" />
                  </span>
                  <p className="mt-3 font-heading text-base font-black uppercase tracking-tight text-foreground">
                    {KIND_LABEL[k]}
                  </p>
                  <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-primary dark:text-amber-400">
                    {KIND_PAIR[k]}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">{KIND_DESC[k]}</p>
                  <ul className="mt-3 flex-1 space-y-1.5 border-t border-border pt-3">
                    {KIND_HIGHLIGHTS[k].map((b) => (
                      <li key={b} className="flex gap-1.5 text-xs text-muted-foreground">
                        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* Lời mời ký hợp đồng — mọi thao tác đều nằm ở trang hợp đồng */}
        <section className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-5 md:p-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-amber-400/10 dark:text-amber-400">
              <FileSignature className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-base font-black uppercase tracking-tight text-foreground">
                Ký hợp đồng điện tử
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Chọn hình thức, điền nội dung, <strong className="text-foreground">thêm điều khoản của riêng bạn</strong>{" "}
                rồi ký ngay trên trình duyệt. Không cần in, không cần gặp mặt, không hỏi giấy tờ tùy thân.
              </p>
            </div>
            <Link
              href="/partnership/hop-dong"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Mở hợp đồng <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </div>

      {/* ── Đối tác hiện tại ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionTitle eyebrow="Đang đồng hành" title="Đối tác của Arex" />
        {byTier.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
            <Handshake className="mx-auto mb-3 size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Chưa có đối tác nào được công bố. Bạn có thể là người đầu tiên —{" "}
              <Link href="/partnership/hop-dong" className="text-primary underline dark:text-amber-400">
                mở hợp đồng hợp tác
              </Link>
              .
            </p>
          </div>
        ) : (
          byTier.map((g) => (
            <div key={g.tier} className="space-y-3">
              <h3 className="font-heading text-sm font-black uppercase tracking-widest text-muted-foreground">
                {TIER_LABEL[g.tier]}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {g.items.map((p) => (
                  <PartnerCard key={p.id} p={p} />
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      {/* ── Arex mang lại gì ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionTitle
          eyebrow="Vì sao hợp tác"
          title="Arex mang lại gì cho đối tác"
          desc="Không phải một trang tin đơn lẻ — Arex là hệ kênh nội dung, cộng đồng và công cụ xoay quanh người chơi Free Fire Việt Nam."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {AREX_CAPABILITIES.map((c) => (
            <div key={c.title} className="rounded-2xl border border-border bg-card p-4">
              <p className="font-heading text-sm font-black uppercase tracking-tight text-foreground">{c.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Gói hợp tác đội nhóm ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionTitle
          eyebrow="Hợp tác đội nhóm"
          title="Ba gói cho đội & cộng đồng"
          desc="Quyền lợi dưới đây được ghi thẳng vào hợp đồng — không phải lời hứa miệng. Chọn gói ngay ở bước đầu tiên khi mở hợp đồng."
        />
        <div className="grid gap-3 lg:grid-cols-3">
          {PARTNER_TIERS.map((t) => (
            <div key={t} className="flex flex-col rounded-2xl border border-border bg-card p-5">
              <p className="font-heading text-base font-black uppercase tracking-tight text-foreground">
                {TIER_LABEL[t]}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{PACKAGE_TAGLINE[t]}</p>
              <p className="mt-2 inline-flex w-fit rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary dark:bg-amber-400/10 dark:text-amber-400">
                {PACKAGE_FEE_NOTE[t]}
              </p>
              <ul className="mt-3 flex-1 space-y-1.5">
                {PACKAGE_BENEFITS[t].map((b) => (
                  <li key={b} className="flex gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Quy trình ────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionTitle eyebrow="Quy trình" title="Bốn bước là xong" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PARTNERSHIP_PROCESS.map((s) => (
            <div key={s.step} className="rounded-2xl border border-border bg-card p-4">
              <span className="font-heading text-2xl font-black text-primary/30 dark:text-amber-400/30">{s.step}</span>
              <p className="mt-1 font-heading text-sm font-black uppercase tracking-tight text-foreground">{s.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Không nhận ───────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionTitle
          eyebrow="Ranh giới"
          title="Những nội dung Arex không nhận"
          desc="Nói trước cho đỡ mất thời gian hai bên. Danh sách này cũng là điều khoản quy tắc nội dung trong mọi hợp đồng."
        />
        <ul className="grid gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/[0.03] p-5 sm:grid-cols-2">
          {NOT_ACCEPTED.map((n) => (
            <li key={n} className="flex gap-2 text-xs text-muted-foreground">
              <XCircle className="mt-0.5 size-3.5 shrink-0 text-rose-500" />
              <span>{n}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionTitle eyebrow="Hỏi & đáp" title="Câu hỏi thường gặp" />
        <div className="space-y-2">
          {PARTNERSHIP_FAQ.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-border bg-card p-4">
              <summary className="cursor-pointer list-none text-sm font-bold text-foreground marker:hidden">
                <span className="inline-flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary dark:text-amber-400" />
                  {f.q}
                </span>
              </summary>
              <p className="mt-2 pl-6 text-xs leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA hợp tác — admin đè được ở /admin/page-content */}
      <PageContentOverride pageKey="hop-tac">
        <section className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-6 text-center">
          <h2 className="font-heading text-lg font-black uppercase tracking-tight text-foreground">
            Muốn hợp tác với Arex?
          </h2>
          <p className="mx-auto mt-1.5 max-w-lg text-sm text-muted-foreground">
            Đội muốn đồng hành, bạn muốn vào đội ngũ, hay nhận một hạng mục kỹ thuật — mở hợp đồng và điền, hoặc nhắn cho
            đội ngũ nếu muốn trao đổi trước.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/partnership/hop-dong"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <FileSignature className="size-4" /> Mở hợp đồng điện tử
            </Link>
            <Link
              href="/lien-he"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-bold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              <Mail className="size-4" /> Trao đổi trước
            </Link>
          </div>
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
