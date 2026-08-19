import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceAdminApiAuth } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import {
  normalizeDuties,
  TEAM_DUTIES_MAX,
  TEAM_DUTY_MAX,
  TEAM_FOCUS_MAX,
  TEAM_TITLE_MAX,
} from "@/lib/constants/team-duties";

// Chức danh / mảng phụ trách / việc đang làm của một thành viên đội ngũ.
// Chuỗi rỗng = xoá trắng ô đó (null trong DB), khác với không gửi trường = giữ
// nguyên. Nhờ vậy admin xoá được từng mục mà không phải gửi cả cụm.
const schema = z.object({
  userId: z.string().uuid(),
  title: z.string().trim().max(TEAM_TITLE_MAX).nullish(),
  focus: z.string().trim().max(TEAM_FOCUS_MAX).nullish(),
  duties: z.array(z.string().trim().max(TEAM_DUTY_MAX)).max(TEAM_DUTIES_MAX).nullish(),
  order: z.number().int().min(-999).max(999).nullish(),
});

/** Cột chưa có = chưa chạy migration. Nói thẳng thay vì trả 500 chung chung. */
function missingColumn(error: { code?: string; message?: string }) {
  return error.code === "42703" || Boolean(error.message?.includes("team_"));
}

export async function PATCH(request: NextRequest) {
  const denied = await enforceAdminApiAuth({ minimumRole: "manager" });
  if (denied) return denied;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." }, { status: 400 });
  }
  const { userId, title, focus, duties, order } = parsed.data;

  const patch: Record<string, unknown> = {};
  if (title !== undefined) patch.team_title = title || null;
  if (focus !== undefined) patch.team_focus = focus || null;
  if (duties !== undefined) patch.team_duties = normalizeDuties(duties);
  if (order !== undefined) patch.team_order = order ?? 0;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Không có gì để cập nhật." }, { status: 400 });
  }

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "Không kết nối được DB." }, { status: 503 });

  const { error } = await untypedFrom(db, "users").update(patch as never).eq("id", userId);
  if (error) {
    if (missingColumn(error)) {
      return NextResponse.json(
        { error: "Chưa có cột team_* trong DB — chạy supabase/migration-team-duties.sql trước." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...patch });
}
