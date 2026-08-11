import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Flame,
  HandCoins,
  Hourglass,
  Lock,
  PackageSearch,
  Plus,
  ReceiptText,
  ShieldCheck,
  Settings2,
  Store,
} from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { ListingCard } from "@/components/shop/listing-card";
import { ShopFilters } from "@/components/shop/shop-filters";
import {
  LISTING_SORTS,
  getShopViewer,
  listFeaturedListings,
  listListings,
  type ListingSort,
} from "@/lib/server/shop";
import { type ListingKind } from "@/lib/constants/shop";

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

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; q?: string; min?: string; max?: string; sort?: string }>;
}) {
  const { kind, q, min, max, sort } = await searchParams;
  const activeKind: ListingKind | undefined =
    kind === "account" || kind === "item" ? kind : undefined;
  const activeSort = (LISTING_SORTS as string[]).includes(sort ?? "")
    ? (sort as ListingSort)
    : "new";

  const num = (v: string | undefined) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  const hasFilter = !!(activeKind || q || min || max);

  const [listings, featured, viewer] = await Promise.all([
    listListings({
      kind: activeKind,
      search: q,
      minPrice: num(min),
      maxPrice: num(max),
      sort: activeSort,
      limit: 60,
    }),
    // Dải nổi bật chỉ hiện ở trang gốc — đang lọc thì người dùng muốn đúng thứ
    // họ tìm, không phải thứ được trả tiền để đẩy lên.
    hasFilter ? Promise.resolve([]) : listFeaturedListings(8),
    getShopViewer(),
  ]);

  const featuredIds = new Set(featured.map((l) => l.id));
  const rest = listings.filter((l) => !featuredIds.has(l.id));

  // Nút bán đổi theo tình trạng hồ sơ. Trước đây chỉ xét "approved", nên người
  // vừa nộp hồ sơ và đang chờ vẫn thấy đúng lời mời "Xin bán trên chợ" như lúc
  // chưa nộp gì — phải bấm vào mới biết hồ sơ của mình đang nằm ở đâu.
  const sellCta = ((): { href: string; label: string; icon: typeof Plus; primary: boolean } => {
    switch (viewer.seller?.status) {
      case "approved":
        return { href: "/shop/dang-tin", label: "Đăng tin bán", icon: Plus, primary: true };
      case "pending":
        return { href: "/shop/dang-ky-ban", label: "Hồ sơ chờ duyệt", icon: Hourglass, primary: false };
      case "suspended":
        return { href: "/shop/dang-ky-ban", label: "Hồ sơ bị tạm khoá", icon: Lock, primary: false };
      default:
        // Chưa nộp, hoặc bị từ chối — trang đăng ký cho sửa rồi gửi lại.
        return { href: "/shop/dang-ky-ban", label: "Xin bán trên chợ", icon: Plus, primary: true };
    }
  })();
  const SellCtaIcon = sellCta.icon;

  // Pill phụ: dùng chung cho mọi lối vào không phải hành động chính.
  const pill =
    "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3.5 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/30 hover:text-primary";

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
      <div className="space-y-3">
        <Suspense fallback={<div className="h-9 rounded-full bg-muted/40" />}>
          <ShopFilters signedIn={!!viewer.userId} />
        </Suspense>

        {/* Thanh hành động — sắp theo vai, hẹp dần từ nội bộ ra tới người mua.
            Ba trang dưới đây vốn đã dựng xong nhưng không có lối vào nào: người
            bán chỉ tới được "Tin của tôi" nhờ cú redirect sau khi đăng tin, còn
            trang quản lý thì phải tự gõ URL. */}
        <div className="flex flex-wrap justify-end gap-2">
          {/* Lối vào khu nội bộ — chỉ hiện với người được gán vai. */}
          {viewer.isAdmin && (
            <Link
              href="/admin/shop"
              className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/40 bg-violet-500/10 px-3.5 py-1.5 text-xs font-bold text-violet-600 transition hover:bg-violet-500/20 dark:text-violet-400"
            >
              <Settings2 className="size-3.5" /> Quản lý chợ
            </Link>
          )}
          {viewer.isAgent && (
            <Link
              href="/shop/ctv"
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold text-emerald-600 transition hover:bg-emerald-500/20 dark:text-emerald-400"
            >
              <HandCoins className="size-3.5" /> Bàn giao dịch viên
            </Link>
          )}

          {/* Khu của người bán — có hồ sơ là quản lý được tin, dù đang chờ duyệt. */}
          {viewer.seller && (
            <Link href="/shop/tin-cua-toi" className={pill}>
              <ClipboardList className="size-3.5" /> Tin của tôi
            </Link>
          )}
          {viewer.seller?.status === "approved" && (
            // Gian hàng công khai: nơi duy nhất hiện đánh giá và số đơn thành
            // công, mà chính người bán lại không có đường nào xem thử.
            <Link href={`/shop/nguoi-ban/${viewer.seller.id}`} className={pill}>
              <Store className="size-3.5" /> Gian hàng của tôi
            </Link>
          )}

          <Link href="/shop/don-hang" className={pill}>
            <ReceiptText className="size-3.5" /> Đơn của tôi
          </Link>

          <Link
            href={sellCta.href}
            className={
              sellCta.primary
                ? "inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-white transition hover:opacity-90 dark:bg-amber-500"
                : "inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3.5 py-1.5 text-xs font-bold text-amber-600 transition hover:bg-amber-500/20 dark:text-amber-400"
            }
          >
            <SellCtaIcon className="size-3.5" />
            {sellCta.label}
          </Link>
        </div>
      </div>

      {/* Tin nổi bật */}
      {featured.length > 0 && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-1.5 font-heading text-sm font-black uppercase tracking-wide text-foreground">
            <Flame className="size-4 text-amber-500" /> Tin nổi bật
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {featured.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        </section>
      )}

      {/* Danh sách tin */}
      {rest.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-16 text-center">
          <p className="text-sm font-bold text-foreground">
            {hasFilter ? "Không có tin nào khớp bộ lọc" : "Chưa có tin nào"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {hasFilter
              ? "Nới khoảng giá hoặc bỏ bớt từ khoá — hoặc theo dõi bộ lọc để được báo khi có tin mới."
              : "Hãy là người đầu tiên đăng bán trên chợ Arex."}
          </p>
        </div>
      ) : (
        <section className="space-y-2">
          {featured.length > 0 && (
            <h2 className="font-heading text-sm font-black uppercase tracking-wide text-foreground">
              Tất cả tin đăng
            </h2>
          )}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {rest.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        </section>
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
