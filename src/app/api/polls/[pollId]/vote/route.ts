import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const voteSchema = z.object({ option_id: z.string().uuid() });

type RouteContext = { params: Promise<{ pollId: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { pollId } = await params;

  const limited = enforceRateLimit(req, { name: "poll-vote", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const supabase = createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập để bình chọn." }, { status: 401 });

  const payload = await req.json().catch(() => null);
  const parsed = voteSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Lựa chọn không hợp lệ." }, { status: 400 });

  const db = createAdminSupabaseClient() ?? supabase;

  // Verify poll exists and is active
  const { data: poll } = await (db.from("polls") as ReturnType<typeof db.from>)
    .select("id, status, ends_at")
    .eq("id", pollId)
    .single() as { data: { id: string; status: string; ends_at: string | null } | null };

  if (!poll) return NextResponse.json({ error: "Poll không tồn tại." }, { status: 404 });
  if (poll.status !== "active") return NextResponse.json({ error: "Poll đã đóng." }, { status: 400 });
  if (poll.ends_at && new Date(poll.ends_at) < new Date()) {
    return NextResponse.json({ error: "Poll đã hết hạn." }, { status: 400 });
  }

  // Verify option belongs to this poll
  const { data: option } = await (db.from("poll_options") as ReturnType<typeof db.from>)
    .select("id")
    .eq("id", parsed.data.option_id)
    .eq("poll_id", pollId)
    .single() as { data: { id: string } | null };

  if (!option) return NextResponse.json({ error: "Lựa chọn không hợp lệ." }, { status: 400 });

  const { error } = await (db.from("poll_votes") as ReturnType<typeof db.from>)
    .insert({ poll_id: pollId, option_id: parsed.data.option_id, user_id: user.id } as never);

  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "23505") return NextResponse.json({ error: "Bạn đã bình chọn rồi." }, { status: 409 });
    return NextResponse.json({ error: "Không thể bình chọn. Vui lòng thử lại." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
