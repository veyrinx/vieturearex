import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { enforceRateLimit } from "@/lib/server/api-guard";
import { sendTelegramNotification, vnNow } from "@/lib/server/telegram-notify";

const schema = z.object({
  display_name: z.string().trim().min(1).max(30),
  anonymous_id: z.string().trim().min(1).max(60),
});

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "support-session", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const authClient = createServerSupabaseClient();
  if (!authClient) return NextResponse.json({ error: "Không khả dụng." }, { status: 503 });
  const db = createAdminSupabaseClient() ?? authClient;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });

  const { display_name, anonymous_id } = parsed.data;

  // Resolve logged-in user if any
  const { data: { user } } = await authClient.auth.getUser();
  const userId = user?.id ?? null;

  // Try to find existing open session for this anonymous_id or user_id
  const matchColumn = userId ? "user_id" : "anonymous_id";
  const matchValue = userId ?? anonymous_id;

  const { data: existing } = await db
    .from("support_sessions")
    .select("id, status")
    .eq(matchColumn, matchValue as string)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle() as { data: { id: string; status: string } | null };

  if (existing) {
    return NextResponse.json({ session_id: existing.id });
  }

  // Create new session
  const { data: session, error } = await db
    .from("support_sessions")
    .insert({
      display_name,
      anonymous_id: userId ? null : anonymous_id,
      user_id: userId,
      status: "open",
    } as never)
    .select("id")
    .single() as { data: { id: string } | null; error: unknown };

  if (error || !session) {
    return NextResponse.json({ error: "Không thể tạo phiên hỗ trợ." }, { status: 500 });
  }

  // Notify admin bot — new support session
  void sendTelegramNotification({
    title: "🆘 CSKH — Khách hàng mới cần hỗ trợ",
    subtitle: `Phiên mới mở lúc ${vnNow()} (ICT)`,
    sections: [{
      icon: "👤",
      heading: "Thông tin",
      rows: [
        { label: "Tên", value: display_name, bold: true },
        { label: "Loại", value: userId ? "Thành viên đăng nhập" : "Khách vãng lai" },
        { label: "Session ID", value: session.id, mono: true },
      ],
    }],
    actions: [{ label: "🔧 Vào trang CSKH", url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://arexnetwork.site"}/admin/cskh` }],
    footer: "🤖 Arex CSKH",
  }).catch(() => null);

  return NextResponse.json({ session_id: session.id }, { status: 201 });
}
