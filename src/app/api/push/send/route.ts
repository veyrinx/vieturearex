import type { PushSubscription } from "web-push";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { getSettings } from "@/lib/data/content-service";

const PUSH_SUBS_KEY = "push.subscriptions";

const sendSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  url: z.string().optional().default("/"),
});

async function getStoredSubs(): Promise<string[]> {
  const settings = await getSettings();
  const raw = settings.find((s) => s.key === PUSH_SUBS_KEY)?.value;
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

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

  const subs = await getStoredSubs();
  if (subs.length === 0) return NextResponse.json({ sent: 0, message: "Không có subscriber nào." });

  const webpush = await import("web-push");
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const notification = JSON.stringify({
    title: parsed.data.title,
    body: parsed.data.body,
    url: parsed.data.url,
    icon: "https://ik.imagekit.io/oyvgbkwyt/SGM%20NETWORK/29032026/b21232026.png?updatedAt=1774797861035",
  });

  let sent = 0;
  await Promise.allSettled(
    subs.map(async (subStr) => {
      try {
        const sub = JSON.parse(subStr) as PushSubscription;
        await webpush.sendNotification(sub, notification);
        sent++;
      } catch {
        // subscription expired - bỏ qua
      }
    })
  );

  return NextResponse.json({ sent, total: subs.length });
}
