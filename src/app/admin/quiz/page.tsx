import type { Metadata } from "next";
import { QuizPanel } from "@/components/admin/quiz-panel";

export const metadata: Metadata = {
  title: "Quiz Free Fire",
  description: "Quản lý câu hỏi quiz hiển thị trong Mini App.",
};

export default function AdminQuizPage() {
  return <QuizPanel />;
}
