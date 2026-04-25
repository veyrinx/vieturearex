import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hồ sơ của tôi",
  description: "Quản lý thông tin cá nhân, điểm thưởng và hoạt động của bạn trên Arex.",
  robots: { index: false },
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
