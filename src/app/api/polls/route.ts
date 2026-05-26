import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/server/auth";
import { sendTelegramNotification, sendUserTelegramNotification, vnNow } from "@/lib/server/telegram-notify";

const createSchema = z.object({
  question: z.string().min(5).max(200),
  options: z.array(z.string().min(1).max(100)).min(2).max(8),
  entity_type: z.enum(["event", "news", "global"]).optional(),
  entity_id: z.string().optional(),
  ends_at: z.string().datetime().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "polls", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await getAuthContext();
  if (!auth.userId) return NextResponse.json({ polls: [] }, { status: 401 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ polls: [] });

  const entityType = req.nextUrl.searchParams.get("entity_type");
  const entityId = req.nextUrl.searchParams.get("entity_id");
  const onlyActive = req.nextUrl.searchParams.get("active") !== "false";

  let q = (db.from("polls") as ReturnType<typeof db.from>)
    .select("id, question, entity_type, entity_id, status, ends_at, created_at, poll_options(id, label, display_order)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (onlyActive) q = q.eq("status", "active") as typeof q;
  if (entityType) q = q.eq("entity_type", entityType) as typeof q;
  if (entityId) q = q.eq("entity_id", entityId) as typeof q;

  const { data, error } = await q as { data: unknown[] | null; error: unknown };
  if (error) return NextResponse.json({ polls: [] });
  return NextResponse.json({ polls: data ?? [] });
}

export async function POST(req: NextRequest) {
  const guard = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (guard) return guard;

  const auth = await getAuthContext();
  const payload = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { data: poll, error: pollErr } = await (db.from("polls") as ReturnType<typeof db.from>)
    .insert({
      question: parsed.data.question,
      entity_type: parsed.data.entity_type ?? "global",
      entity_id: parsed.data.entity_id ?? null,
      ends_at: parsed.data.ends_at ?? null,
      created_by: auth.userId,
      status: "active",
    } as never)
    .select("id")
    .single() as { data: { id: string } | null; error: unknown };

  if (pollErr || !poll) return NextResponse.json({ error: "Không thể tạo poll." }, { status: 500 });

  const optionRows = parsed.data.options.map((label, i) => ({
    poll_id: poll.id,
    label,
    display_order: i,
  }));

  const { error: optErr } = await (db.from("poll_options") as ReturnType<typeof db.from>)
    .insert(optionRows as never);
  if (optErr) return NextResponse.json({ error: "Không thể thêm lựa chọn." }, { status: 500 });

  const endStr = parsed.data.ends_at
    ? new Date(parsed.data.ends_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
    : "Không giới hạn";

  const pollPayload = {
    title: "📊 POLL MỚI!",
    subtitle: `Tạo lúc ${vnNow()} (ICT)`,
    sections: [{
      rows: [
        { label: "❓ Câu hỏi", value: parsed.data.question, bold: true },
        { label: "🗳 Số lựa chọn", value: String(parsed.data.options.length) },
        { label: "⏰ Kết thúc", value: endStr },
      ],
    }],
    footer: "📊 Arex Poll",
  };

  void Promise.allSettled([
    sendTelegramNotification(pollPayload),
    sendUserTelegramNotification(pollPayload),
  ]);

  return NextResponse.json({ id: poll.id }, { status: 201 });
}
