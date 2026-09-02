import type { Metadata } from "next";

// Trang riêng tư hoặc một bước trong luồng — có tiêu đề tử tế trên tab trình
// duyệt, nhưng không cho lập chỉ mục.
export const metadata: Metadata = {
  title: "Đội Của Tôi",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
