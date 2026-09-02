import type { Metadata } from "next";
import { siteConfig } from "@/lib/constants/site";

// Trang là client component nên không tự khai metadata được — đặt ở layout.
export const metadata: Metadata = {
  title: "Kho Giao Diện Cộng Đồng",
  description:
    "Đổi khung avatar và danh hiệu cho hồ sơ Arex của bạn — mở khoá bằng hoạt động trong cộng đồng Free Fire.",
  alternates: { canonical: `${siteConfig.url}/community/cosmetics` },
  openGraph: {
    title: "Kho Giao Diện Cộng Đồng | Arex",
    description: "Khung avatar và danh hiệu mở khoá bằng hoạt động cộng đồng.",
    url: `${siteConfig.url}/community/cosmetics`,
    type: "website",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
