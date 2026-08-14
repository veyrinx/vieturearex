import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ExternalLink, PencilLine } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { ListingEditForm } from "@/components/shop/listing-edit-form";
import { getListing, getShopViewer } from "@/lib/server/shop";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sửa tin — Chợ Arex",
  alternates: { canonical: `${siteConfig.url}/shop/tin-cua-toi` },
  robots: { index: false },
};

/**
 * Sửa một tin đã đăng.
 *
 * Vào được: chủ gian hàng, CTV được bật quyền quản lý tin, và admin chợ. Ai
 * khác thì 404 chứ không 403 — không cần cho người lạ biết tin này có tồn tại
 * dưới đường dẫn quản lý hay không.
 */
export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [listing, viewer] = await Promise.all([getListing(id), getShopViewer()]);
  if (!viewer.userId) redirect(`/login?next=/shop/tin-cua-toi/${id}`);
  if (!listing) notFound();

  const access = viewer.shops.find((s) => s.seller.id === listing.seller_id);
  const canEdit = viewer.isAdmin || !!access?.canManageListings;
  if (!canEdit) notFound();

  // Tin đang có đơn thì API cũng chặn — nói trước ở đây thay vì để người bán
  // gõ xong cả trang rồi mới ăn lỗi 409.
  const locked = listing.status === "reserved" && !viewer.isAdmin;

  return (
    <div className="mx-auto max-w-3xl space-y-5 py-8">
      <Breadcrumbs
        items={[
          { name: "Chợ Arex", href: "/shop" },
          { name: "Tin của tôi", href: "/shop/tin-cua-toi" },
          { name: "Sửa tin", href: `/shop/tin-cua-toi/${listing.id}` },
        ]}
      />
      <PageHero
        icon={PencilLine}
        eyebrow={access?.isOwner === false ? "CTV gian hàng" : "Người bán"}
        title="Sửa tin"
        subtitle={listing.title}
      />

      <Link
        href={`/shop/${listing.id}`}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground transition hover:text-primary"
      >
        <ExternalLink className="size-3.5" /> Xem tin trên chợ
      </Link>

      {locked ? (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-600 dark:text-amber-400">
          Tin đang có đơn giao dịch nên tạm khoá sửa. Xong đơn là sửa lại được.
        </p>
      ) : (
        <ListingEditForm listing={listing} isAdmin={viewer.isAdmin} />
      )}
    </div>
  );
}
