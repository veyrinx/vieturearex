import "server-only";
import type { PushSubscription } from "web-push";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

type SubRow = { endpoint: string; subscription: PushSubscription };

/** Gửi web push tới toàn bộ subscriber (đọc từ bảng push_subscriptions). */
export async function sendPushNotification(title: string, body: string, url = "/") {
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT ?? "mailto:admin@arex.tech";

  if (!vapidPublic || !vapidPrivate) return;

  const db = createAdminSupabaseClient();
  if (!db) return;

  const { data } = await untypedFrom(db, "push_subscriptions")
    .select("endpoint, subscription")
    .limit(10000) as { data: SubRow[] | null };

  const subs = data ?? [];
  if (subs.length === 0) return;

  const webpush = await import("web-push");
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const notification = JSON.stringify({
    title,
    body,
    url,
    icon: "https://ik.imagekit.io/oyvgbkwyt/SGM%20NETWORK/29032026/b21232026.png?updatedAt=1774797861035",
  });

  const expired: string[] = [];
  await Promise.allSettled(
    subs.map(async (row) => {
      try {
        await webpush.sendNotification(row.subscription, notification);
      } catch (err) {
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) expired.push(row.endpoint);
      }
    })
  );

  if (expired.length > 0) {
    await untypedFrom(db, "push_subscriptions").delete().in("endpoint", expired);
  }
}
