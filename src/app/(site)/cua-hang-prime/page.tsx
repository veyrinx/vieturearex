import type { Metadata } from "next";
import { Crown, Gem, Check, Sparkles, Clock, ShieldCheck } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Cửa hàng Prime — Ưu đãi thành viên | Arex",
  description:
    "Cửa hàng Prime của Arex: gói thành viên Prime, ưu đãi kim cương và quyền lợi độc quyền cho cộng đồng Free Fire. Sắp ra mắt.",
  alternates: { canonical: `${siteConfig.url}/cua-hang-prime` },
};

// Dữ liệu mẫu (scaffold) — sẽ thay bằng CRUD từ /admin/prime.
const TIERS = [
  {
    name: "Prime",
    price: 599,
    accent: "from-amber-500 to-orange-500",
    perks: ["+10% kim cương mỗi lần nạp", "Khung avatar Prime", "Huy hiệu Prime trong hồ sơ"],
  },
  {
    name: "Prime Plus",
    price: 999,
    accent: "from-violet-500 to-fuchsia-500",
    featured: true,
    perks: ["Toàn bộ quyền lợi Prime", "+25% kim cương mỗi lần nạp", "Quà hằng ngày độc quyền", "Ưu tiên hỗ trợ CSKH"],
  },
];

const PACKS = [
  { name: "Gói Tuần", sub: "7 ngày Prime", price: 149 },
  { name: "Gói Tháng", sub: "30 ngày Prime", price: 499 },
  { name: "Gói Quý", sub: "90 ngày Prime", price: 1290 },
  { name: "Gói Năm", sub: "365 ngày Prime", price: 3990 },
];

function DiamondPrice({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 font-heading font-black tabular-nums text-foreground">
      <Gem className="size-4 text-sky-400" /> {value.toLocaleString("vi-VN")}
    </span>
  );
}

export default function CuaHangPrimePage() {
  return (
    <main className="container-main my-8 max-w-3xl space-y-8">
      <Breadcrumbs items={[{ name: "Cửa hàng Prime", href: "/cua-hang-prime" }]} />

      <PageHero
        icon={Crown}
        eyebrow="Ưu đãi thành viên"
        title="Cửa hàng Prime"
        subtitle="Gói thành viên Prime, ưu đãi kim cương và quyền lợi độc quyền cho cộng đồng."
      />

      {/* Banner đang hoàn thiện */}
      <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3">
        <Clock className="size-5 shrink-0 text-amber-500" />
        <p className="text-sm text-foreground">
          <b>Sắp ra mắt.</b> Cửa hàng đang được hoàn thiện — giá và quyền lợi bên dưới chỉ là minh hoạ.
        </p>
      </div>

      {/* Gói Prime */}
      <section className="space-y-4">
        <h2 className="font-heading text-lg font-black uppercase tracking-wide text-foreground">Gói thành viên</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={cn(
                "relative overflow-hidden rounded-2xl border p-5",
                t.featured ? "border-primary/40 bg-primary/[0.04]" : "border-border bg-card",
              )}
            >
              <div className={cn("absolute -right-8 -top-8 size-24 rounded-full bg-gradient-to-br opacity-20 blur-2xl", t.accent)} />
              {t.featured && (
                <span className="absolute right-3 top-3 rounded-full bg-primary px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary-foreground">
                  Phổ biến
                </span>
              )}
              <div className={cn("mb-3 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg", t.accent)}>
                <Crown className="size-5" />
              </div>
              <p className="font-heading text-lg font-black text-foreground">{t.name}</p>
              <p className="mt-1 flex items-baseline gap-1">
                <DiamondPrice value={t.price} />
                <span className="text-xs text-muted-foreground">/ tháng</span>
              </p>
              <ul className="mt-3 space-y-1.5">
                {t.perks.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-500" /> {p}
                  </li>
                ))}
              </ul>
              <button
                disabled
                className="mt-4 w-full cursor-not-allowed rounded-xl bg-muted px-4 py-2.5 text-sm font-bold text-muted-foreground"
              >
                Sắp mở
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Các gói thời hạn */}
      <section className="space-y-4">
        <h2 className="font-heading text-lg font-black uppercase tracking-wide text-foreground">Gói thời hạn</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PACKS.map((p) => (
            <div key={p.name} className="rounded-2xl border border-border bg-card p-4 text-center">
              <Sparkles className="mx-auto mb-2 size-5 text-primary dark:text-amber-400" />
              <p className="font-bold text-foreground">{p.name}</p>
              <p className="text-[11px] text-muted-foreground">{p.sub}</p>
              <p className="mt-2"><DiamondPrice value={p.price} /></p>
            </div>
          ))}
        </div>
      </section>

      <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground/70">
        <ShieldCheck className="size-3.5" /> Nạp qua kênh chính thức — Arex không bán kim cương lậu.
      </p>
    </main>
  );
}
