import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { SellerApplyForm } from "@/components/shop/seller-apply-form";
import { getShopViewer } from "@/lib/server/shop";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Xin bán trên chợ Arex",
  description: "Đăng ký làm người bán trên chợ Arex — cần hồ sơ thật và được admin duyệt trước khi đăng tin.",
  alternates: { canonical: `${siteConfig.url}/shop/dang-ky-ban` },
  robots: { index: false },
};

const RULES = [
  "Hồ sơ phải là thông tin thật — sai lệch sẽ bị khoá vĩnh viễn và giữ tiền đơn đang chạy.",
  "Chỉ giao dịch qua đơn trên site. Tự nhận tiền ngoài đơn thì Arex không bảo vệ được bạn.",
  "Mỗi bước bàn giao đều phải chụp màn hình đính kèm — đó là bằng chứng bảo vệ chính bạn.",
  "Đăng tin sai sự thật (khác ảnh, khác mô tả) sẽ bị gỡ tin và trừ uy tín.",
];

export default async function SellerApplyPage() {
  const viewer = await getShopViewer();
  if (!viewer.userId) redirect("/login?next=/shop/dang-ky-ban");

  return (
    <div className="mx-auto max-w-3xl space-y-5 py-8">
      <Breadcrumbs
        items={[
          { name: "Chợ Arex", href: "/shop" },
          { name: "Xin bán", href: "/shop/dang-ky-ban" },
        ]}
      />

      <PageHero
        icon={BadgeCheck}
        eyebrow="Người bán"
        title="Xin bán trên chợ"
        subtitle="Điền hồ sơ thật, admin duyệt xong là đăng tin được."
      />

      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
        <p className="flex items-center gap-1.5 text-xs font-black uppercase text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="size-4" /> Cam kết khi bán trên Arex
        </p>
        <ul className="mt-2 space-y-1.5">
          {RULES.map((r) => (
            <li key={r} className="flex gap-2 text-[11px] leading-relaxed text-muted-foreground">
              <span className="mt-1 size-1 shrink-0 rounded-full bg-emerald-500" />
              {r}
            </li>
          ))}
        </ul>
      </div>

      <SellerApplyForm existing={viewer.seller} />

      {viewer.seller?.status === "approved" && (
        <Link
          href="/shop/dang-tin"
          className="flex w-full items-center justify-center rounded-xl bg-primary py-3 text-sm font-black uppercase text-white transition hover:opacity-90 dark:bg-amber-500"
        >
          Đăng tin bán ngay
        </Link>
      )}
    </div>
  );
}
