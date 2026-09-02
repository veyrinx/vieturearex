import type { Metadata } from "next";
import { siteConfig } from "@/lib/constants/site";

// Trang là client component nên không tự khai metadata được — đặt ở layout.
export const metadata: Metadata = {
  title: "Nội Dung Đã Xác Minh",
  description:
    "Kho nội dung đã được đội ngũ Arex xác minh: mỗi bài có dấu vết kiểm chứng, mã băm nội dung và hạn xác minh rõ ràng.",
  alternates: { canonical: `${siteConfig.url}/verified-content` },
  openGraph: {
    title: "Nội Dung Đã Xác Minh | Arex",
    description: "Nội dung Free Fire đã qua kiểm chứng, có dấu vết xác minh và hạn hiệu lực.",
    url: `${siteConfig.url}/verified-content`,
    type: "website",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
