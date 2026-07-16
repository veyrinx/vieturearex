import "server-only";
import { getSettings } from "@/lib/data/content-service";
import { parseQuiz, DEFAULT_QUIZ, SETTINGS_KEY_QUIZ, type QuizQuestion } from "@/lib/constants/quiz";

// Đọc bộ câu hỏi quiz từ settings; nếu admin chưa cấu hình -> dùng bộ mặc định.
export async function getQuizQuestions(): Promise<QuizQuestion[]> {
  try {
    const settings = await getSettings();
    const row = settings.find((s) => s.key === SETTINGS_KEY_QUIZ);
    const parsed = parseQuiz(row?.value ?? null);
    return parsed.length > 0 ? parsed : DEFAULT_QUIZ;
  } catch {
    return DEFAULT_QUIZ;
  }
}
