import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { untypedFrom } from "@/lib/supabase/untyped";

/**
 * Đăng ký token thông báo đẩy của app native (FCM trên Android, APNs trên iOS).
 * Web Push của trình duyệt vẫn dùng /api/push/subscribe.
 */

type Body = {
  token?: string;
  platform?: string;
  appVersion?: string;
};

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "push-native", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const body = (await request.json().catch(() => null)) as Body | null;
  const token = body?.token?.trim();
  const platform = body?.platform;

  if (!token || (platform !== "ios" && platform !== "android")) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  // Gắn token vào tài khoản nếu người dùng đang đăng nhập (để gửi thông báo riêng).
  let userId: string | null = null;
  const supabase = createServerSupabaseClient();
  if (supabase) {
    const { data } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
    userId = data?.user?.id ?? null;
  }

  const { error } = await untypedFrom(db, "native_push_tokens").upsert(
    {
      token,
      platform,
      user_id: userId,
      app_version: body?.appVersion ?? null,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "token" },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "push-native", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const body = (await request.json().catch(() => null)) as Body | null;
  const token = body?.token?.trim();
  if (!token) return NextResponse.json({ error: "Invalid token" }, { status: 400 });

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  await untypedFrom(db, "native_push_tokens").delete().eq("token", token);
  return NextResponse.json({ ok: true });
}
