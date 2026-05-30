import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { logAdminActivity } from "@/lib/server/admin-activity";

const patchSchema = z.object({
  title:     z.string().min(1).max(120).optional(),
  message:   z.string().min(1).max(500).optional(),
  type:      z.enum(["info", "warning", "success", "error"]).optional(),
  is_active: z.boolean().optional(),
  ends_at:   z.string().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = enforceRateLimit(request, { name: "admin-broadcast-patch", limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { error } = await untypedFrom(db, "system_announcements").update(parsed.data as never).eq("id", id);
  if (error) return NextResponse.json({ error: "Không thể cập nhật" }, { status: 500 });

  void logAdminActivity({ action: "broadcast_update", targetType: "announcement", targetId: id, summary: `Cập nhật thông báo ${id}` }).catch(() => null);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = enforceRateLimit(request, { name: "admin-broadcast-del", limit: 10, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const { id } = await params;
  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { error } = await untypedFrom(db, "system_announcements").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Không thể xóa" }, { status: 500 });

  void logAdminActivity({ action: "broadcast_delete", targetType: "announcement", targetId: id, summary: `Xóa thông báo ${id}` }).catch(() => null);
  return NextResponse.json({ ok: true });
}
