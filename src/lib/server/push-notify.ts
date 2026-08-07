import "server-only";
import type { PushSubscription } from "web-push";
import { sendNativePush } from "@/lib/server/native-push";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

type SubRow = { endpoint: string; subscription: PushSubscription };

/**
 * Bắn thông báo ra mọi kênh: web push (trình duyệt) và FCM (app native).
 *
 * Hai kênh chạy độc lập — thiếu cấu hình VAPID thì native vẫn gửi, và ngược
 * lại. Dùng allSettled để một bên hỏng không kéo bên kia chết theo.
 */
export async function sendPushNotification(title: string, body: string, url = "/") {
  await Promise.allSettled([
    sendWebPush(title, body, url),
    sendNativePush(title, body, url),
  ]);
}

/**
 * Bắn thông báo cho đúng một nhóm tài khoản — dùng cho việc riêng tư như đơn
 * hàng của chợ.
 *
 * Chỉ tới được thiết bị đã gắn chủ: token native luôn có `user_id`, còn web
 * push chỉ có nếu người đó bật thông báo lúc đã đăng nhập. Người chưa gắn thì
 * im lặng bỏ qua — họ vẫn thấy chuông thông báo trong site.
 */
export async function sendPushToUsers(
  userIds: string[],
  title: string,
  body: string,
  url = "/",
) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return;
  await Promise.allSettled([
    sendWebPush(title, body, url, ids),
    sendNativePush(title, body, url, ids),
  ]);
}

/** Gửi web push tới subscriber (toàn bộ, hoặc chỉ những người trong `userIds`). */
async function sendWebPush(title: string, body: string, url: string, userIds?: string[]) {
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT ?? "mailto:admin@arex.tech";

  if (!vapidPublic || !vapidPrivate) return;

  const db = createAdminSupabaseClient();
  if (!db) return;

  let query = untypedFrom(db, "push_subscriptions").select("endpoint, subscription").limit(10000);
  if (userIds) query = query.in("user_id", userIds);
  const { data } = await query as { data: SubRow[] | null };

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
