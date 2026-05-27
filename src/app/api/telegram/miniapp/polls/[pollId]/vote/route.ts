import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { resolveTgUser } from "@/lib/server/tg-miniapp-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

const voteSchema = z.object({ option_id: z.string().uuid() });

type RouteContext = { params: Promise<{ pollId: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { pollId } = await params;

  const limited = enforceRateLimit(req, { name: "tg-poll-vote", limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await resolveTgUser(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.reason === "not_configured" ? "not_configured" : "invalid" },
      { status: auth.reason === "not_configured" ? 503 : 401 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = voteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Lựa chọn không hợp lệ." }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  // Verify poll is active
  const { data: poll } = (await untypedFrom(db, "polls")
    .select("id, status, ends_at")
    .eq("id", pollId)
    .eq("entity_type", "global")
    .single()) as { data: { id: string; status: string; ends_at: string | null } | null };

  if (!poll) return NextResponse.json({ error: "Poll không tồn tại." }, { status: 404 });
  if (poll.status !== "active") return NextResponse.json({ error: "Poll đã đóng." }, { status: 400 });
  if (poll.ends_at && new Date(poll.ends_at) < new Date()) {
    return NextResponse.json({ error: "Poll đã hết hạn." }, { status: 400 });
  }

  // Verify option belongs to poll
  const { data: option } = (await untypedFrom(db, "poll_options")
    .select("id")
    .eq("id", parsed.data.option_id)
    .eq("poll_id", pollId)
    .single()) as { data: { id: string } | null };

  if (!option) return NextResponse.json({ error: "Lựa chọn không hợp lệ." }, { status: 400 });

  const { error } = await untypedFrom(db, "tg_poll_votes").insert({
    poll_id: pollId,
    option_id: parsed.data.option_id,
    tg_user_id: auth.user.id,
  } as never);

  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "23505") return NextResponse.json({ error: "already_voted" }, { status: 409 });
    return NextResponse.json({ error: "Không thể bình chọn." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
