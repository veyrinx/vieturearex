import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng nhập",
  description: "Đăng nhập vào Arex để theo dõi sự kiện, bình luận bài viết và kết nối cộng đồng Free Fire.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
