import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng ký",
  description: "Tạo tài khoản Arex miễn phí để trải nghiệm đầy đủ nội dung cộng đồng Free Fire.",
  // robots.txt đã chặn crawl, nhưng chặn crawl không chặn lập chỉ mục URL —
  // cần thêm thẻ noindex thì Google mới bỏ hẳn trang khỏi kết quả.
  robots: { index: false, follow: false },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
