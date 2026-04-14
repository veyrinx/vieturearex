import "server-only";
import type { PushSubscription } from "web-push";
import { getSettings } from "@/lib/data/content-service";

const PUSH_SUBS_KEY = "push.subscriptions";

export async function sendPushNotification(title: string, body: string, url = "/") {
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT ?? "mailto:admin@arex.tech";

  if (!vapidPublic || !vapidPrivate) return;

  const settings = await getSettings();
  const raw = settings.find((s) => s.key === PUSH_SUBS_KEY)?.value;
  if (!raw) return;

  let subs: string[] = [];
  try { subs = JSON.parse(raw) as string[]; } catch { return; }
  if (subs.length === 0) return;

  const webpush = await import("web-push");
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const notification = JSON.stringify({
    title,
    body,
    url,
    icon: "https://ik.imagekit.io/oyvgbkwyt/SGM%20NETWORK/29032026/b21232026.png?updatedAt=1774797861035",
  });

  await Promise.allSettled(
    subs.map(async (subStr) => {
      try {
        const sub = JSON.parse(subStr) as PushSubscription;
        await webpush.sendNotification(sub, notification);
      } catch { /* expired subscription */ }
    })
  );
}
