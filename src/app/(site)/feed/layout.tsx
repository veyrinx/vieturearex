import type { Metadata } from "next";
import { siteConfig } from "@/lib/constants/site";

// Trang là client component nên không tự khai metadata được — đặt ở layout.
export const metadata: Metadata = {
  title: "Bảng Tin Cộng Đồng",
  description:
    "Bảng tin Arex: bài viết diễn đàn, wiki và hoạt động mới nhất từ những người bạn theo dõi trong cộng đồng Free Fire Việt Nam.",
  alternates: { canonical: `${siteConfig.url}/feed` },
  openGraph: {
    title: "Bảng Tin Cộng Đồng | Arex",
    description: "Bài viết, wiki và hoạt động mới nhất từ cộng đồng Arex.",
    url: `${siteConfig.url}/feed`,
    type: "website",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
