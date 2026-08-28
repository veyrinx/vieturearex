import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

/**
 * Gán server cho nhiều sự kiện một lượt.
 * POST { ids: string[], server_region: string | null }
 *
 * Không đi qua PATCH /api/admin/events được: route đó đòi nguyên payload sự
 * kiện và bắn thông báo Telegram/Discord cho MỖI lượt sửa — gán 40 sự kiện là
 * dội 40 tin vào nhóm. Đây là thao tác dọn dữ liệu, im lặng mới đúng.
 */

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  // Chuỗi rỗng = gỡ server, đưa sự kiện về "chưa gán".
  server_region: z.string().trim().max(20).nullable().default(null),
});

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-events-bulk", limit: 10, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ capability: "events.edit" });
  if (denied) return denied;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const db = createAdminSupabaseClient();
  if (!db) {
    return NextResponse.json({ error: "Supabase chưa cấu hình." }, { status: 500 });
  }

  const { ids } = parsed.data;
  const server = (parsed.data.server_region ?? "").trim().toLowerCase() || null;

  const { error, count } = await untypedFrom(db, "events")
    .update({ server_region: server } as never, { count: "exact" })
    .in("id", ids);

  if (error) {
    // Cột chưa có thì nói thẳng tên file migration, đừng để admin đoán.
    const missingColumn = /server_region/.test(error.message ?? "");
    return NextResponse.json(
      {
        error: missingColumn
          ? "CSDL chưa có cột server_region — chạy supabase/migration-event-server-region.sql."
          : error.message,
      },
      { status: 500 },
    );
  }

  await logAdminActivity({
    action: "EVENT_UPDATED",
    targetType: "EVENT",
    targetId: ids[0],
    summary: `Gán server ${server ?? "(gỡ)"} cho ${ids.length} sự kiện`,
  });

  revalidatePath("/events", "layout");
  revalidatePath("/calendar", "layout");
  revalidatePath("/", "layout");

  return NextResponse.json({ ok: true, updated: count ?? ids.length, server_region: server });
}
