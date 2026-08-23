import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { claimQuest, getQuestBoard } from "@/lib/server/quests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function currentUserId(): Promise<string | null> {
  const supabase = createServerSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  return data.user?.id ?? null;
}

/** GET — bảng nhiệm vụ tuần này kèm tiến độ đếm trực tiếp từ dữ liệu thật. */
export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ loggedIn: false });

  const board = await getQuestBoard(userId);
  return NextResponse.json({ loggedIn: true, ...board });
}

/** POST { key } — nhận thưởng một nhiệm vụ đã hoàn thành. */
export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "quest-claim", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { key?: string };
  const key = (body.key ?? "").trim();
  if (!key) return NextResponse.json({ error: "Thiếu mã nhiệm vụ." }, { status: 400 });

  const result = await claimQuest(userId, key);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.code });

  return NextResponse.json({ ok: true, points: result.points, totalPoints: result.totalPoints });
}
