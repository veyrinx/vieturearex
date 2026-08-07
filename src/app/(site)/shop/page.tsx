import type { Metadata } from "next";
import Link from "next/link";
import { PackageSearch, Plus, ReceiptText, ShieldCheck, Store } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { ListingCard } from "@/components/shop/listing-card";
import { getShopViewer, listListings } from "@/lib/server/shop";
import { LISTING_KIND_LABEL, type ListingKind } from "@/lib/constants/shop";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chợ Arex — Mua bán acc & vật phẩm có trung gian",
  description:
    "Mua bán tài khoản, vật phẩm Free Fire an toàn: người bán được xác minh, giao dịch viên giữ tiền, mọi bước đều có ảnh chụp làm bằng chứng.",
  alternates: { canonical: `${siteConfig.url}/shop` },
  openGraph: {
    title: "Chợ Arex — Mua bán acc & vật phẩm có trung gian | Arex",
    description: "Người bán xác minh, giao dịch viên giữ tiền, mọi bước đều có ảnh chụp làm bằng chứng.",
    url: `${siteConfig.url}/shop`,
    type: "website",
    siteName: siteConfig.name,
  },
};

const KINDS: (ListingKind | "all")[] = ["all", "account", "item"];

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; q?: string }>;
}) {
  const { kind, q } = await searchParams;
  const activeKind: ListingKind | "all" =
    kind === "account" || kind === "item" ? kind : "all";

  const [listings, viewer] = await Promise.all([
    listListings({
      kind: activeKind === "all" ? undefined : activeKind,
      search: q,
      limit: 60,
    }),
    getShopViewer(),
  ]);

  const canSell = viewer.seller?.status === "approved";

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-8">
      <Breadcrumbs items={[{ name: "Chợ Arex", href: "/shop" }]} />

      <PageHero
        icon={Store}
        eyebrow="Chợ cộng đồng"
        title="Chợ Arex"
        subtitle="Mua bán acc & vật phẩm Free Fire — trung gian giữ tiền, hai bên đều có bằng chứng."
      />

      {/* Cam kết an toàn */}
      <div className="grid gap-2 sm:grid-cols-3">
        {[
          { icon: ShieldCheck, title: "Trung gian giữ tiền", desc: "Tiền chỉ về người bán khi người mua xác nhận đã nhận." },
          { icon: PackageSearch, title: "Người bán xác minh", desc: "Hồ sơ, số điện thoại, tài khoản ngân hàng đều được duyệt." },
          { icon: ReceiptText, title: "Bước nào cũng có ảnh", desc: "Chuyển tiền, bàn giao, đăng nhập — đều phải chụp màn hình." },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-2xl border border-border bg-card p-3">
            <p className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Icon className="size-4 text-emerald-500" /> {title}
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>

      {/* Bộ lọc + hành động */}
      <div className="flex flex-wrap items-center gap-2">
        {KINDS.map((k) => (
          <Link
            key={k}
            href={k === "all" ? "/shop" : `/shop?kind=${k}`}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-bold transition",
              activeKind === k
                ? "border-primary/40 bg-primary/10 text-primary dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300"
                : "border-border bg-muted/40 text-muted-foreground hover:border-primary/30",
            )}
          >
            {k === "all" ? "Tất cả" : LISTING_KIND_LABEL[k]}
          </Link>
        ))}

        <div className="ml-auto flex flex-wrap gap-2">
          <Link
            href="/shop/don-hang"
            className="rounded-full border border-border bg-muted/40 px-3.5 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/30 hover:text-primary"
          >
            Đơn của tôi
          </Link>
          <Link
            href={canSell ? "/shop/dang-tin" : "/shop/dang-ky-ban"}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-white transition hover:opacity-90 dark:bg-amber-500"
          >
            <Plus className="size-3.5" />
            {canSell ? "Đăng tin bán" : "Xin bán trên chợ"}
          </Link>
        </div>
      </div>

      {/* Danh sách tin */}
      {listings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-16 text-center">
          <p className="text-sm font-bold text-foreground">Chưa có tin nào</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Hãy là người đầu tiên đăng bán trên chợ Arex.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}

      <p className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] leading-relaxed text-muted-foreground">
        <span className="font-bold text-amber-600 dark:text-amber-400">Lưu ý:</span> Arex chỉ đóng vai
        trung gian giữ tiền và lưu bằng chứng giữa hai bên. Việc mua bán tài khoản có thể vi phạm điều
        khoản của nhà phát hành — người mua tự cân nhắc rủi ro khoá tài khoản. Tuyệt đối không giao
        dịch bên ngoài đơn, Arex không xử lý được nếu bạn tự chuyển tiền riêng.
      </p>
    </div>
  );
}
