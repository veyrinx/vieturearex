import type { PushSubscription } from "web-push";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

const sendSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  url: z.string().optional().default("/"),
});

type SubRow = { endpoint: string; subscription: PushSubscription };

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, { name: "push-send", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const payload = await request.json().catch(() => null);
  const parsed = sendSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload." }, { status: 400 });

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT ?? "mailto:admin@arex.tech";

  if (!vapidPublic || !vapidPrivate) {
    return NextResponse.json({ error: "VAPID keys chưa được cấu hình." }, { status: 500 });
  }

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { data } = await untypedFrom(db, "push_subscriptions")
    .select("endpoint, subscription")
    .limit(10000) as { data: SubRow[] | null };

  const subs = data ?? [];
  if (subs.length === 0) return NextResponse.json({ sent: 0, total: 0, message: "Không có subscriber nào." });

  const webpush = await import("web-push");
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const notification = JSON.stringify({
    title: parsed.data.title,
    body: parsed.data.body,
    url: parsed.data.url,
    icon: "https://ik.imagekit.io/oyvgbkwyt/SGM%20NETWORK/29032026/b21232026.png?updatedAt=1774797861035",
  });

  let sent = 0;
  const expired: string[] = [];
  await Promise.allSettled(
    subs.map(async (row) => {
      try {
        await webpush.sendNotification(row.subscription, notification);
        sent++;
      } catch (err) {
        // Sub hết hạn / không còn hợp lệ → đánh dấu để xoá
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) expired.push(row.endpoint);
      }
    })
  );

  // Dọn sub chết
  if (expired.length > 0) {
    await untypedFrom(db, "push_subscriptions").delete().in("endpoint", expired);
  }

  return NextResponse.json({ sent, total: subs.length, cleaned: expired.length });
}
