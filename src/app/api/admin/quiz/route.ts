import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { updateSetting, getSettings } from "@/lib/data/content-service";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { parseQuiz, serializeQuiz, SETTINGS_KEY_QUIZ } from "@/lib/constants/quiz";

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-quiz", limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const settings = await getSettings();
  const row = settings.find((s) => s.key === SETTINGS_KEY_QUIZ);
  return NextResponse.json({ questions: parseQuiz(row?.value ?? null) });
}

export async function PUT(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-quiz", limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin", capability: "settings.edit" });
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.questions)) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const cleaned = parseQuiz(JSON.stringify(body.questions));

  try {
    await updateSetting(SETTINGS_KEY_QUIZ, serializeQuiz(cleaned));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể lưu." },
      { status: 500 },
    );
  }

  await logAdminActivity({
    action: "update",
    targetType: "settings",
    targetId: SETTINGS_KEY_QUIZ,
    summary: `Cập nhật câu hỏi quiz (${cleaned.length} câu)`,
  }).catch(() => {});

  revalidatePath("/tg/quiz");
  return NextResponse.json({ questions: cleaned });
}
