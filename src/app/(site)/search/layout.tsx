import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tìm kiếm",
  description: "Tìm kiếm tin tức, sự kiện và nội dung cộng đồng Free Fire trên Arex.",
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
