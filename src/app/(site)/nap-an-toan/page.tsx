import type { Metadata } from "next";
import { ShieldCheck, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { PageContentOverride } from "@/components/common/page-content-override";

// Admin có thể thay nội dung ở /admin/noi-dung-trang.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Nạp Free Fire an toàn — Tránh lừa đảo",
  description:
    "Hướng dẫn nạp kim cương Free Fire an toàn qua kênh chính thức, dấu hiệu nhận biết lừa đảo và mẹo bảo vệ tài khoản.",
  alternates: { canonical: `${siteConfig.url}/nap-an-toan` },
  openGraph: {
    title: "Nạp Free Fire an toàn — Tránh lừa đảo | Arex",
    description: "Hướng dẫn nạp kim cương Free Fire an toàn qua kênh chính thức, dấu hiệu nhận biết lừa đảo và mẹo bảo vệ tài khoản.",
    url: `${siteConfig.url}/nap-an-toan`,
    type: "website",
    siteName: siteConfig.name,
  },
};

const OFFICIAL = [
  "Nạp trong game (mục Kim Cương) qua cửa hàng chính thức.",
  "Website chính thức Garena / Codashop / Unipin / các đại lý được uỷ quyền.",
  "Thanh toán qua ví/thẻ chính chủ, có hoá đơn/lịch sử giao dịch rõ ràng.",
];

const SCAM_SIGNS = [
  "Rao \"nạp lậu / hack kim cương giá rẻ\", nạp hộ giá thấp bất thường.",
  "Yêu cầu bạn cho mật khẩu, mã OTP, hoặc đăng nhập tài khoản game.",
  "Bắt chuyển khoản trước rồi mới nạp, tài khoản người lạ.",
  "Link \"sự kiện nạp tặng\" lạ, bắt điền tài khoản/mật khẩu.",
  "Hứa \"vòng quay chắc trúng\", \"đổi thưởng\" ngoài kênh chính thức.",
];

const TIPS = [
  "Không bao giờ cho ai mật khẩu / mã OTP — kể cả \"admin\".",
  "Bật bảo mật 2 lớp (liên kết tài khoản) cho game.",
  "Chỉ nạp qua kênh chính thức, giữ lại hoá đơn.",
  "Nghi ngờ thì dừng lại — không có \"nạp lậu\" nào an toàn.",
];

export default function NapAnToanPage() {
  return (
    <main className="container-main my-8 max-w-2xl space-y-8">
      <Breadcrumbs items={[{ name: "Nạp an toàn", href: "/nap-an-toan" }]} />

      <PageHero
        icon={ShieldCheck}
        eyebrow="Bảo vệ tài khoản"
        title="Nạp Free Fire an toàn"
        subtitle="Nạp qua kênh chính thức, nhận biết lừa đảo, giữ tài khoản an toàn."
      />

      <PageContentOverride pageKey="nap-an-toan">
      <section className="space-y-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5">
        <h2 className="flex items-center gap-2 font-heading text-base font-bold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-5" /> Kênh nạp chính thức
        </h2>
        <ul className="space-y-2">
          {OFFICIAL.map((t, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" /> {t}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl border border-rose-500/25 bg-rose-500/5 p-5">
        <h2 className="flex items-center gap-2 font-heading text-base font-bold text-rose-600 dark:text-rose-400">
          <XCircle className="size-5" /> Dấu hiệu LỪA ĐẢO — tránh xa
        </h2>
        <ul className="space-y-2">
          {SCAM_SIGNS.map((t, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
              <XCircle className="mt-0.5 size-4 shrink-0 text-rose-500" /> {t}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 font-heading text-base font-bold text-foreground">
          <AlertTriangle className="size-5 text-amber-500" /> Mẹo giữ an toàn
        </h2>
        <ul className="space-y-2">
          {TIPS.map((t, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" /> {t}
            </li>
          ))}
        </ul>
      </section>

      <p className="text-center text-[11px] text-muted-foreground/70">
        Arex không bán/nạp kim cương và không thu tiền người dùng. Mọi lời mời nạp lậu đều là lừa đảo.
      </p>
      </PageContentOverride>
    </main>
  );
}
