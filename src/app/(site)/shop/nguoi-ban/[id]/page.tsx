import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  CalendarDays,
  PackageCheck,
  ShieldCheck,
  Star,
  Store,
  TicketPercent,
} from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { ListingCard } from "@/components/shop/listing-card";
import {
  getSellerById,
  listListings,
  listSellerReviews,
  toPublicSeller,
} from "@/lib/server/shop";
import { effectivePrice, formatVnd, isSaleLive } from "@/lib/constants/shop";

export const dynamic = "force-dynamic";

/**
 * Gian hàng công khai của một người bán.
 *
 * Chỉ hồ sơ đã duyệt mới có trang — hồ sơ chờ duyệt / bị khoá trả 404 để
 * không ai dò được danh sách người đã nộp giấy tờ. Dữ liệu hiển thị đi qua
 * `toPublicSeller`, nên số điện thoại, STK và giấy tờ không bao giờ tới đây.
 */

async function load(id: string) {
  const seller = await getSellerById(id);
  if (!seller || seller.status !== "approved") return null;

  const [listings, reviews] = await Promise.all([
    listListings({ sellerId: seller.id, limit: 60 }),
    listSellerReviews(seller.id, 20),
  ]);

  return { seller, publicSeller: toPublicSeller(seller)!, listings, reviews };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const seller = await getSellerById(id);
  if (!seller || seller.status !== "approved") {
    return { title: "Không tìm thấy gian hàng", robots: { index: false } };
  }
  const rating =
    seller.rating_count > 0 ? (seller.rating_sum / seller.rating_count).toFixed(1) : null;
  return {
    title: `${seller.display_name} — Gian hàng trên Chợ Arex`,
    description: `${seller.display_name}: ${seller.orders_done} đơn thành công${rating ? `, ${rating}★ từ ${seller.rating_count} đánh giá` : ""}. Mua bán acc & vật phẩm Free Fire qua trung gian giữ tiền.`,
    alternates: { canonical: `${siteConfig.url}/shop/nguoi-ban/${seller.id}` },
    openGraph: {
      title: `${seller.display_name} — Gian hàng trên Chợ Arex`,
      url: `${siteConfig.url}/shop/nguoi-ban/${seller.id}`,
      type: "profile",
      siteName: siteConfig.name,
    },
  };
}

export default async function SellerStorefrontPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await load(id);
  if (!data) notFound();

  const { seller, publicSeller, listings, reviews } = data;
  const active = listings.filter((l) => l.status === "active");
  const sold = listings.filter((l) => l.status === "sold");
  const onSaleCount = active.filter(isSaleLive).length;
  const rating = publicSeller.rating;
  const joined = new Date(seller.created_at).toLocaleDateString("vi-VN", {
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-8">
      <Breadcrumbs
        items={[
          { name: "Chợ Arex", href: "/shop" },
          { name: seller.display_name, href: `/shop/nguoi-ban/${seller.id}` },
        ]}
      />

      {/* Đầu trang gian hàng */}
      <div className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="h-20 bg-gradient-to-r from-primary/20 via-amber-400/20 to-transparent dark:from-amber-500/20" />
        <div className="-mt-10 space-y-3 p-5">
          {seller.avatar_url ? (
            <div className="relative size-20 overflow-hidden rounded-2xl border-4 border-card bg-muted">
              <Image
                src={seller.avatar_url}
                alt={seller.display_name}
                fill
                sizes="80px"
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="flex size-20 items-center justify-center rounded-2xl border-4 border-card bg-primary text-white dark:bg-amber-500">
              <Store className="size-9" />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-black text-foreground">
              {seller.display_name}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              <BadgeCheck className="size-3.5" /> Đã xác minh
            </span>
            {onSaleCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[11px] font-bold text-red-500">
                <TicketPercent className="size-3.5" /> {onSaleCount} tin đang giảm giá
              </span>
            )}
          </div>

          {seller.bio && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {seller.bio}
            </p>
          )}

          <div className="grid gap-2 sm:grid-cols-4">
            <Stat
              icon={PackageCheck}
              label="Đơn thành công"
              value={String(seller.orders_done)}
            />
            <Stat
              icon={Star}
              label="Điểm đánh giá"
              value={rating != null ? `${rating}/5` : "Chưa có"}
              hint={rating != null ? `${publicSeller.rating_count} lượt` : undefined}
            />
            <Stat icon={Store} label="Tin đang bán" value={String(active.length)} />
            <Stat icon={CalendarDays} label="Bán từ" value={joined} />
          </div>

          <p className="flex items-start gap-1.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-[11px] leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            Hồ sơ người bán này đã được Arex duyệt giấy tờ và tài khoản ngân hàng. Vẫn hãy đặt đơn
            qua chợ để giao dịch viên giữ tiền — chuyển khoản riêng cho người bán thì Arex không xử
            lý được.
          </p>
        </div>
      </div>

      {/* Tin đang bán */}
      <section className="space-y-3">
        <h2 className="font-heading text-lg font-black text-foreground">
          Đang bán ({active.length})
        </h2>
        {active.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-muted/20 py-10 text-center text-xs text-muted-foreground">
            Người bán này chưa có tin nào đang mở.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {active.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </section>

      {/* Đánh giá */}
      <section className="space-y-3">
        <h2 className="font-heading text-lg font-black text-foreground">
          Đánh giá từ người mua ({publicSeller.rating_count})
        </h2>
        {reviews.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-muted/20 py-10 text-center text-xs text-muted-foreground">
            Chưa có đánh giá nào.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-foreground">{r.buyer_name}</p>
                  <span className="flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={
                          i < r.rating ? "size-3.5 fill-current" : "size-3.5 text-muted-foreground/30"
                        }
                      />
                    ))}
                  </span>
                </div>
                {r.comment && (
                  <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{r.comment}</p>
                )}
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("vi-VN")}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Tin đã bán — bằng chứng gian hàng có hoạt động thật */}
      {sold.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-black text-foreground">Đã bán gần đây</h2>
          <div className="flex flex-wrap gap-2">
            {sold.slice(0, 12).map((l) => (
              <Link
                key={l.id}
                href={`/shop/${l.id}`}
                className="rounded-xl border border-border bg-muted/30 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
              >
                {l.title.slice(0, 40)} · {formatVnd(effectivePrice(l))}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Store;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-3">
      <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </p>
      <p className="font-heading text-lg font-black text-foreground">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
