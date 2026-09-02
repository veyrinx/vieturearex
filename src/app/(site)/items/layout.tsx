import type { Metadata } from "next";
import { siteConfig } from "@/lib/constants/site";

// Trang là client component nên không tự khai metadata được — đặt ở layout.
export const metadata: Metadata = {
  title: "Thư Viện Vật Phẩm Free Fire",
  description:
    "Tra cứu toàn bộ vật phẩm Free Fire theo tên, loại và độ hiếm — kèm icon tải về, ID vật phẩm và bộ lọc nhanh.",
  alternates: { canonical: `${siteConfig.url}/items` },
  openGraph: {
    title: "Thư Viện Vật Phẩm Free Fire | Arex",
    description: "Tra cứu vật phẩm, icon và ID Free Fire — lọc theo loại và độ hiếm.",
    url: `${siteConfig.url}/items`,
    type: "website",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
