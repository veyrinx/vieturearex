import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng nhập",
  description: "Đăng nhập vào Arex để theo dõi sự kiện, bình luận bài viết và kết nối cộng đồng Free Fire.",
  // robots.txt đã chặn crawl, nhưng chặn crawl không chặn lập chỉ mục URL —
  // cần thêm thẻ noindex thì Google mới bỏ hẳn trang khỏi kết quả.
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
