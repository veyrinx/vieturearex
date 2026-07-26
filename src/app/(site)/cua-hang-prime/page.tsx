import type { Metadata } from "next";
import { Check, Crown, Gem, Package, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { RARITY_LABEL } from "@/lib/constants/store";
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

/** Nền game phủ lên gradient (ảnh lỗi thì vẫn còn gradient). */
const GAME_BG: React.CSSProperties = {
  backgroundColor: "#010308",
  backgroundImage:
    "url('/prime/FF_UI_Prime_Bg.jpg'), radial-gradient(circle at top, #1a3a6c 0%, #0d2752 25%, #051329 50%, #020813 75%, #010308 100%)",
  backgroundSize: "cover, auto",
  backgroundPosition: "center, center",
  backgroundRepeat: "no-repeat, no-repeat",
};

export default async function CuaHangPrimePage() {
  const [items, live] = await Promise.all([
    getPrimeItems().then((list) => list.filter((i) => i.enabled !== false)),
    // Cửa hàng thật trong game — hỏng nguồn thì trang vẫn còn phần gói Prime.
    getPrimeStoreLive().catch(() => null),
  ]);

  const memberships = items.filter((i) => i.type === "membership");
  const packs = items.filter((i) => i.type === "pack");
  const prices = items.map((i) => i.price).filter((p) => p > 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;

  // Giá tính bằng kim cương nên không khai Offer (không phải tiền tệ) — chỉ liệt kê gói.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Cửa hàng Prime — Arex",
    url: `${siteConfig.url}/cua-hang-prime`,
    numberOfItems: items.length,
    itemListElement: items.map((i, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: {
        "@type": "Product",
        name: i.name,
        category: i.type === "membership" ? "Gói thành viên Prime" : "Gói thời hạn Prime",
        ...(i.image && { image: i.image }),
        description: [i.duration, ...(i.perks ?? [])].filter(Boolean).join(" · ")
          || `Gói Prime ${i.name} — ${i.price.toLocaleString("vi-VN")} kim cương.`,
      },
    })),
  };

  return (
    <main className="container-main my-8 space-y-5">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumbs items={[{ name: "Cửa hàng Prime", href: "/cua-hang-prime" }]} />

      {/* H1 cho SEO — tiêu đề hiển thị nằm trong khung cửa hàng bên dưới. */}
      <h1 className="sr-only">Cửa hàng Prime — gói thành viên & ưu đãi kim cương Free Fire</h1>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:items-start">
        {/* Cột trái — khung cửa hàng gói Prime */}
        <div className="mx-auto w-full max-w-lg space-y-3 lg:mx-0">
          <div className="overflow-hidden rounded-2xl p-3 sm:p-4" style={GAME_BG}>
            <PrimeStore items={items} />
          </div>

          <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground/70">
            <ShieldCheck className="size-3.5" /> Nạp qua kênh chính thức — Arex không bán kim cương lậu.
          </p>
        </div>

        {/* Cột phải — cửa hàng in-game + thông tin gói */}
        <div className="space-y-4">
          {/* Tổng quan */}
          <div className="grid grid-cols-3 gap-2.5">
            <Stat icon={Crown} label="Gói thành viên" value={String(memberships.length)} accent="text-amber-500" />
            <Stat icon={Package} label="Gói thời hạn" value={String(packs.length)} accent="text-violet-500" />
            <Stat
              icon={Gem}
              label="Giá từ"
              value={minPrice != null ? `${minPrice.toLocaleString("vi-VN")} 💎` : "—"}
              accent="text-cyan-500"
            />
          </div>

          {live && (
            <section className="overflow-hidden rounded-2xl border border-white/10 p-3 sm:p-4" style={GAME_BG}>
              <PrimeStoreLivePanel initial={live} />
            </section>
          )}

          {memberships.length > 0 && (
            <section className="rounded-2xl border border-border bg-card p-4">
              <h2 className="mb-3 flex items-center gap-1.5 font-heading text-sm font-black uppercase tracking-wide text-foreground">
                <Crown className="size-4 text-amber-500" /> So sánh gói thành viên
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {memberships.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "relative rounded-xl border p-3.5",
                      m.featured
                        ? "border-amber-400/50 bg-amber-400/[0.07] shadow-[0_0_0_1px_rgba(251,191,36,0.15)]"
                        : "border-border bg-muted/30",
                    )}
                  >
                    {m.featured && (
                      <span className="absolute -top-2 right-3 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-900">
                        Đáng mua
                      </span>
                    )}

                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {m.rarity && (
                          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                            {RARITY_LABEL[m.rarity]}
                          </p>
                        )}
                        <h3 className="truncate font-heading text-base font-black uppercase tracking-tight text-foreground">
                          {m.name}
                        </h3>
                      </div>
                      {m.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.image} alt="" className="size-10 shrink-0 object-contain" />
                      )}
                    </div>

                    <p className="mt-1.5 flex items-baseline gap-1.5">
                      <Gem className="size-4 self-center text-cyan-500" />
                      <span className="font-heading text-xl font-black tabular-nums text-foreground">
                        {m.price.toLocaleString("vi-VN")}
                      </span>
                      {m.duration && (
                        <span className="text-[11px] text-muted-foreground">{m.duration}</span>
                      )}
                    </p>

                    {m.perks && m.perks.length > 0 && (
                      <ul className="mt-2.5 space-y-1.5 border-t border-border/60 pt-2.5">
                        {m.perks.map((p) => (
                          <li key={p} className="flex items-start gap-1.5 text-[12px] leading-snug text-muted-foreground">
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
            <section className="rounded-2xl border border-border bg-card p-4">
              <h2 className="mb-3 flex items-center gap-1.5 font-heading text-sm font-black uppercase tracking-wide text-foreground">
                <Package className="size-4 text-violet-500" /> Bảng gói thời hạn
              </h2>
              <ul className="divide-y divide-border">
                {packs.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">{p.name}</p>
                      {p.duration && (
                        <p className="truncate text-[11px] text-muted-foreground">{p.duration}</p>
                      )}
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-bold tabular-nums text-foreground">
                      <Gem className="size-3 text-cyan-500" /> {p.price.toLocaleString("vi-VN")}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

function Stat({
  icon: Icon, label, value, accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-3 py-3">
      <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${accent}`}>
        <Icon className="size-3" /> {label}
      </div>
      <p className="mt-1 font-heading text-lg font-black leading-none text-foreground">{value}</p>
    </div>
  );
}
