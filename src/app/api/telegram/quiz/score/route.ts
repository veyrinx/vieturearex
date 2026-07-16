import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { resolveTgUser } from "@/lib/server/tg-miniapp-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

const schema = z.object({
  score: z.number().int().min(0).max(1000),
  total: z.number().int().min(1).max(1000),
});

// POST — lưu điểm quiz cho tài khoản đã liên kết (giữ điểm cao nhất).
export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "tg-quiz-score", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const resolved = await resolveTgUser(req);
  if (!resolved.ok) return NextResponse.json({ error: "Phiên Telegram không hợp lệ." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { data: link } = (await untypedFrom(db, "telegram_account_links")
    .select("user_id")
    .eq("telegram_user_id", resolved.user.id)
    .maybeSingle()) as { data: { user_id: string } | null };
  if (!link) return NextResponse.json({ error: "Chưa liên kết tài khoản.", needLink: true }, { status: 400 });

  const { score, total } = parsed.data;
  const userId = link.user_id;

  const { data: existing } = (await untypedFrom(db, "quiz_scores")
    .select("best_score, best_total, plays")
    .eq("user_id", userId)
    .maybeSingle()) as { data: { best_score: number; best_total: number; plays: number } | null };

  // So sánh theo tỉ lệ đúng; hoà thì lấy số câu đúng cao hơn.
  const prevRatio = existing && existing.best_total > 0 ? existing.best_score / existing.best_total : -1;
  const newRatio = score / total;
  const isBetter = newRatio > prevRatio || (newRatio === prevRatio && score > (existing?.best_score ?? 0));

  const { error } = await untypedFrom(db, "quiz_scores").upsert(
    {
      user_id: userId,
      best_score: isBetter ? score : existing?.best_score ?? score,
      best_total: isBetter ? total : existing?.best_total ?? total,
      plays: (existing?.plays ?? 0) + 1,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "user_id" },
  );
  if (error) return NextResponse.json({ error: "Không lưu được điểm." }, { status: 500 });

  return NextResponse.json({ ok: true, best: isBetter ? { score, total } : { score: existing?.best_score, total: existing?.best_total } });
}
