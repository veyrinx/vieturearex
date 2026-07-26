import type { Metadata } from "next";
import Link from "next/link";
import { Brain, Trophy } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { PageHero } from "@/components/common/page-hero";
import { QuizGame } from "@/components/tools/quiz-game";
import { ShareButton } from "@/components/common/share-button";

export const metadata: Metadata = {
  title: "Quiz Free Fire — Đố vui kiến thức",
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
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/bxh-quiz" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-bold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
          <Trophy className="size-4 text-amber-500" /> Xem BXH Quiz
        </Link>
        <ShareButton title="Quiz Free Fire" text="Thử tài kiến thức Free Fire trên Arex!" />
      </div>
      <QuizGame />
    </main>
  );
}
