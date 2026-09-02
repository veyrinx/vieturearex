import type { Metadata } from "next";
import { siteConfig } from "@/lib/constants/site";

export const metadata: Metadata = {
  title: "Tìm kiếm",
  description: "Tìm kiếm tin tức, sự kiện và nội dung cộng đồng Free Fire trên Arex.",
  alternates: { canonical: `${siteConfig.url}/search` },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
