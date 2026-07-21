import type { Metadata } from "next";
import { Crown, Gem, Check, Sparkles, ShieldCheck } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { getPrimeItems } from "@/lib/server/store";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cửa hàng Prime — Ưu đãi thành viên | Arex",
  description:
    "Cửa hàng Prime của Arex: gói thành viên Prime, ưu đãi kim cương và quyền lợi độc quyền cho cộng đồng Free Fire.",
  alternates: { canonical: `${siteConfig.url}/cua-hang-prime` },
};

function DiamondPrice({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 font-heading font-black tabular-nums text-foreground">
      <Gem className="size-4 text-sky-400" /> {value.toLocaleString("vi-VN")}
    </span>
  );
}

export default async function CuaHangPrimePage() {
  const all = (await getPrimeItems()).filter((i) => i.enabled !== false);
  const memberships = all.filter((i) => i.type === "membership");
  const packs = all.filter((i) => i.type === "pack");

  return (
    <main className="container-main my-8 max-w-3xl space-y-8">
      <Breadcrumbs items={[{ name: "Cửa hàng Prime", href: "/cua-hang-prime" }]} />

      <PageHero
        icon={Crown}
        eyebrow="Ưu đãi thành viên"
        title="Cửa hàng Prime"
        subtitle="Gói thành viên Prime, ưu đãi kim cương và quyền lợi độc quyền cho cộng đồng."
      />

      {memberships.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-heading text-lg font-black uppercase tracking-wide text-foreground">Gói thành viên</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {memberships.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "relative overflow-hidden rounded-2xl border p-5",
                  t.featured ? "border-primary/40 bg-primary/[0.04]" : "border-border bg-card",
                )}
              >
                {t.featured && (
                  <span className="absolute right-3 top-3 rounded-full bg-primary px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary-foreground">
                    Phổ biến
                  </span>
                )}
                <div className={cn("mb-3 flex size-11 items-center justify-center rounded-xl text-white shadow-lg",
                  t.featured ? "bg-gradient-to-br from-violet-500 to-fuchsia-500" : "bg-gradient-to-br from-amber-500 to-orange-500")}>
                  <Crown className="size-5" />
                </div>
                <p className="font-heading text-lg font-black text-foreground">{t.name}</p>
                <p className="mt-1 flex items-baseline gap-1">
                  <DiamondPrice value={t.price} />
                  {t.duration && <span className="text-xs text-muted-foreground">{t.duration}</span>}
                </p>
                {t.perks && t.perks.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {t.perks.map((p) => (
                      <li key={p} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-500" /> {p}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {packs.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-heading text-lg font-black uppercase tracking-wide text-foreground">Gói thời hạn</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {packs.map((p) => (
              <div key={p.id} className="rounded-2xl border border-border bg-card p-4 text-center">
                <Sparkles className="mx-auto mb-2 size-5 text-primary dark:text-amber-400" />
                <p className="font-bold text-foreground">{p.name}</p>
                {p.duration && <p className="text-[11px] text-muted-foreground">{p.duration}</p>}
                <p className="mt-2"><DiamondPrice value={p.price} /></p>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground/70">
        <ShieldCheck className="size-3.5" /> Nạp qua kênh chính thức — Arex không bán kim cương lậu.
      </p>
    </main>
  );
}
