import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { logAdminActivity } from "@/lib/server/admin-activity";
import { DB_ENV_GROUPS, envAdminClient, isDbEnvName, listDbEnvStatus, setDbEnv } from "@/lib/server/env-config";

// Chỉ trả trạng thái (đã đặt ở DB / trên Vercel), không bao giờ trả giá trị.
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-env", limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "super_admin" });
  if (denied) return denied;

  const client = envAdminClient();
  if (!client) return NextResponse.json({ error: "Thiếu cấu hình Supabase service role." }, { status: 500 });
  try {
    const status = await listDbEnvStatus(client);
    return NextResponse.json({ groups: DB_ENV_GROUPS, status });
  } catch (err) {
    return NextResponse.json(
      { error: `Không đọc được bảng app_env — chạy supabase/migration-app-env.sql. (${(err as Error).message})` },
      { status: 500 },
    );
  }
}

const putSchema = z.object({ name: z.string().min(1), value: z.string().max(10_000) });

export async function PUT(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "admin-env", limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const denied = await enforceAdminApiAuth({ minimumRole: "super_admin" });
  if (denied) return denied;

  const parsed = putSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isDbEnvName(parsed.data.name)) {
    return NextResponse.json({ error: "Tên biến không hợp lệ." }, { status: 400 });
  }
  const client = envAdminClient();
  if (!client) return NextResponse.json({ error: "Thiếu cấu hình Supabase service role." }, { status: 500 });

  const { name } = parsed.data;
  const value = parsed.data.value.trim();
  try {
    await setDbEnv(client, name, value);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  await logAdminActivity({
    action: "SETTING_UPDATED",
    targetType: "SETTING",
    targetId: `env.${name}`,
    summary: value ? `Cập nhật biến môi trường ${name}` : `Xoá biến môi trường ${name}`,
  });
  return NextResponse.json({ ok: true });
}
