import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { getQuizQuestions } from "@/lib/server/quiz";

// Công khai — trả câu hỏi quiz (đảo thứ tự, tối đa 10) cho Mini App.
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "quiz-questions", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const all = await getQuizQuestions();
  const shuffled = [...all].sort(() => Math.random() - 0.5).slice(0, 10);
  return NextResponse.json({ questions: shuffled });
}
