import type { Metadata } from "next";
import { Mail, Bell, Newspaper, Gift } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { NewsletterForm } from "@/components/common/newsletter-form";
import { PageContentOverride } from "@/components/common/page-content-override";

// Admin có thể thay nội dung ở /admin/noi-dung-trang.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Đăng ký nhận tin Free Fire qua email | Arex",
  description:
    "Đăng ký email để nhận tin tức, sự kiện và cập nhật Free Fire mới nhất từ Arex — miễn phí, huỷ bất cứ lúc nào.",
  alternates: { canonical: `${siteConfig.url}/dang-ky-tin` },
};

const PERKS = [
  { icon: Newspaper, text: "Tin tức & cập nhật OB mới nhất" },
  { icon: Bell, text: "Nhắc sự kiện, bảo trì, reset rank" },
  { icon: Gift, text: "Không bỏ lỡ code & sự kiện quà" },
];

export default function DangKyTinPage() {
  return (
    <main className="container-main my-8 max-w-xl space-y-8">
      <Breadcrumbs items={[{ name: "Đăng ký nhận tin", href: "/dang-ky-tin" }]} />

      <PageHero
        icon={Mail}
        eyebrow="Bản tin Arex"
        title="Đăng ký nhận tin"
        subtitle="Nhận tin tức, sự kiện và cập nhật Free Fire mới nhất qua email."
      />

      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        {/* Chỉ bọc phần mô tả — form đăng ký phải luôn còn. */}
        <PageContentOverride pageKey="dang-ky-tin">
          <ul className="space-y-2">
            {PERKS.map(({ icon: Icon, text }, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm text-foreground/90">
                <Icon className="size-4 shrink-0 text-primary" /> {text}
              </li>
            ))}
          </ul>
        </PageContentOverride>
        <NewsletterForm />
        <p className="text-[11px] text-muted-foreground/70">
          Miễn phí, không spam. Bạn cũng có thể bật 🔔 thông báo đẩy trên thanh điều hướng.
        </p>
      </div>
    </main>
  );
}
