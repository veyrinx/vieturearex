import type { Metadata } from "next";
import { Brain } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { QuizGame } from "@/components/tools/quiz-game";

export const metadata: Metadata = {
  title: "Quiz Free Fire — Đố vui kiến thức | Arex",
  description: "Trắc nghiệm kiến thức Free Fire: nhân vật, vũ khí, chế độ chơi, rank… Kiểm tra xem bạn hiểu game đến đâu.",
  alternates: { canonical: `${siteConfig.url}/quiz` },
  openGraph: {
    title: "Quiz Free Fire — Đố vui kiến thức | Arex",
    description: "Trắc nghiệm kiến thức Free Fire cộng đồng Arex.",
    url: `${siteConfig.url}/quiz`,
    type: "website",
  },
};

export default function QuizPage() {
  return (
    <main className="container-main my-8 max-w-2xl space-y-8">
      <Breadcrumbs items={[{ name: "Quiz", href: "/quiz" }]} />
      <PageHero
        icon={Brain}
        eyebrow="Đố vui"
        title="Quiz Free Fire"
        subtitle="Kiểm tra kiến thức về nhân vật, vũ khí, chế độ chơi & meta. Chơi trong Mini App Telegram để lưu điểm & lên BXH."
      />
      <QuizGame />
    </main>
  );
}
