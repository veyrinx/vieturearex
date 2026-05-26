import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { sendTelegramNotification, vnNow } from "@/lib/server/telegram-notify";

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-support", limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "support" });
  if (denied) return denied;

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ sessions: [] });

  const { data, error } = await db
    .from("support_sessions")
    .select("id, display_name, status, last_message_at, created_at, anonymous_id, user_id")
    .order("last_message_at", { ascending: false })
    .limit(100) as { data: Array<{ id: string; display_name: string; status: string; last_message_at: string; created_at: string; anonymous_id: string | null; user_id: string | null }> | null; error: unknown };

  if (error) return NextResponse.json({ sessions: [] });
  return NextResponse.json({ sessions: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const denied = await enforceAdminApiAuth({ minimumRole: "support" });
  if (denied) return denied;

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "Không khả dụng." }, { status: 503 });

  const body = (await request.json().catch(() => null)) as { id?: string; status?: "open" | "closed" } | null;
  if (!body?.id) return NextResponse.json({ error: "Thiếu id." }, { status: 400 });

  const newStatus = body.status ?? "closed";

  const { error } = await db
    .from("support_sessions")
    .update({ status: newStatus } as never)
    .eq("id", body.id);

  if (error) {
    void sendTelegramNotification({
      title: "❌ LỖI CẬP NHẬT PHIÊN HỖ TRỢ",
      subtitle: vnNow(),
      sections: [{ rows: [{ label: "Session ID", value: body.id, mono: true, status: "err" }] }],
      footer: "⚠️ Arex Support",
    }).catch(() => null);
    return NextResponse.json({ error: "Không thể cập nhật." }, { status: 500 });
  }

  await logAdminActivity({
    action: newStatus === "closed" ? "SUPPORT_SESSION_CLOSED" : "SUPPORT_SESSION_REOPENED",
    targetType: "SUPPORT",
    targetId: body.id,
    summary: `Phiên hỗ trợ ${body.id} → ${newStatus}`,
  }).catch(() => {});

  void sendTelegramNotification({
    title: newStatus === "closed" ? "✅ PHIÊN HỖ TRỢ ĐÓNG" : "🔄 PHIÊN HỖ TRỢ MỞ LẠI",
    subtitle: vnNow(),
    sections: [{ rows: [
      { label: "Session ID", value: body.id, mono: true },
      { label: "Trạng thái", value: newStatus === "closed" ? "Đã đóng" : "Đang mở", status: newStatus === "closed" ? "ok" : "info" },
    ]}],
    footer: "🎧 Arex Support",
  }).catch(() => null);

  return NextResponse.json({ ok: true });
}
