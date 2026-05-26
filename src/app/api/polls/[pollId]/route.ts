import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/server/auth";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { sendTelegramNotification, vnNow } from "@/lib/server/telegram-notify";

type RouteContext = { params: Promise<{ pollId: string }> };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const limited = enforceRateLimit(req, { name: "polls-detail", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const { pollId } = await params;
  const auth = await getAuthContext();
  if (!auth.userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { data: poll } = await (db.from("polls") as ReturnType<typeof db.from>)
    .select("id, question, status, ends_at, poll_options(id, label, display_order)")
    .eq("id", pollId)
    .single() as { data: { id: string; question: string; status: string; ends_at: string | null; poll_options: { id: string; label: string; display_order: number }[] } | null };

  if (!poll) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Vote counts per option
  const { data: votes } = await (db.from("poll_votes") as ReturnType<typeof db.from>)
    .select("option_id")
    .eq("poll_id", pollId) as { data: { option_id: string }[] | null };

  const voteCounts: Record<string, number> = {};
  for (const v of votes ?? []) {
    voteCounts[v.option_id] = (voteCounts[v.option_id] ?? 0) + 1;
  }

  // User's existing vote
  const { data: myVote } = await (db.from("poll_votes") as ReturnType<typeof db.from>)
    .select("option_id")
    .eq("poll_id", pollId)
    .eq("user_id", auth.userId)
    .maybeSingle() as { data: { option_id: string } | null };

  const totalVotes = Object.values(voteCounts).reduce((s, n) => s + n, 0);

  const options = poll.poll_options
    .sort((a, b) => a.display_order - b.display_order)
    .map((o) => ({
      ...o,
      votes: voteCounts[o.id] ?? 0,
      percent: totalVotes > 0 ? Math.round(((voteCounts[o.id] ?? 0) / totalVotes) * 100) : 0,
    }));

  return NextResponse.json({
    id: poll.id,
    question: poll.question,
    status: poll.status,
    ends_at: poll.ends_at,
    options,
    totalVotes,
    myVote: myVote?.option_id ?? null,
  });
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const { pollId } = await params;
  const guard = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (guard) return guard;

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { status } = (await req.json().catch(() => ({}))) as { status?: string };
  if (!status || !["active", "closed"].includes(status)) {
    return NextResponse.json({ error: "Status không hợp lệ." }, { status: 400 });
  }

  const { data: pollRow } = await (db.from("polls") as ReturnType<typeof db.from>)
    .select("question")
    .eq("id", pollId)
    .single() as { data: { question: string } | null };

  const { error } = await (db.from("polls") as ReturnType<typeof db.from>)
    .update({ status } as never)
    .eq("id", pollId);

  if (error) {
    void sendTelegramNotification({
      title: "❌ LỖI CẬP NHẬT POLL",
      subtitle: vnNow(),
      sections: [{ rows: [{ label: "Poll ID", value: pollId, mono: true, status: "err" }] }],
      footer: "⚠️ Arex Poll",
    }).catch(() => null);
    return NextResponse.json({ error: "Không thể cập nhật." }, { status: 500 });
  }

  void sendTelegramNotification({
    title: status === "closed" ? "🔒 POLL ĐÃ ĐÓNG" : "🔓 POLL MỞ LẠI",
    subtitle: vnNow(),
    sections: [{ rows: [
      ...(pollRow ? [{ label: "❓ Câu hỏi", value: pollRow.question, bold: true }] : []),
      { label: "Trạng thái", value: status === "closed" ? "Đã đóng" : "Đang mở", status: status === "closed" ? "warn" : "ok" as "warn" | "ok" },
    ]}],
    footer: "📊 Arex Poll",
  }).catch(() => null);

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const { pollId } = await params;
  const guard = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (guard) return guard;

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { data: pollRow } = await (db.from("polls") as ReturnType<typeof db.from>)
    .select("question")
    .eq("id", pollId)
    .single() as { data: { question: string } | null };

  const { error } = await (db.from("polls") as ReturnType<typeof db.from>)
    .delete()
    .eq("id", pollId);

  if (error) {
    void sendTelegramNotification({
      title: "❌ LỖI XÓA POLL",
      subtitle: vnNow(),
      sections: [{ rows: [{ label: "Poll ID", value: pollId, mono: true, status: "err" }] }],
      footer: "⚠️ Arex Poll",
    }).catch(() => null);
    return NextResponse.json({ error: "Không thể xóa." }, { status: 500 });
  }

  void sendTelegramNotification({
    title: "🗑️ POLL BỊ XÓA",
    subtitle: vnNow(),
    sections: [{ rows: [
      ...(pollRow ? [{ label: "❓ Câu hỏi", value: pollRow.question }] : []),
      { label: "Poll ID", value: pollId, mono: true },
    ]}],
    footer: "📊 Arex Poll",
  }).catch(() => null);

  return NextResponse.json({ ok: true });
}
