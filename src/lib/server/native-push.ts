import "server-only";
import { createSign } from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";

/**
 * Gửi thông báo đẩy tới app native (Arex Hub / Arex Network) qua FCM HTTP v1.
 *
 * Web push của trình duyệt nằm ở `push-notify.ts` — hai đường hoàn toàn khác
 * nhau: web dùng VAPID + bảng `push_subscriptions`, native dùng service account
 * Firebase + bảng `native_push_tokens`.
 *
 * iOS cũng đi qua FCM (Firebase chuyển tiếp sang APNs), nên chỉ cần một bộ
 * thông tin xác thực — với điều kiện đã nạp khoá APNs `.p8` lên Firebase.
 *
 * Cần 3 biến môi trường, lấy từ Firebase Console → Project settings →
 * Service accounts → Generate new private key:
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 * Thiếu bất kỳ biến nào thì hàm im lặng bỏ qua (giống web push khi thiếu VAPID).
 */

type TokenRow = { token: string; platform: "ios" | "android" };

type ServiceAccount = { projectId: string; clientEmail: string; privateKey: string };

const SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

/** Gửi theo lô để không mở hàng nghìn kết nối cùng lúc. */
const BATCH_SIZE = 100;

function readServiceAccount(): ServiceAccount | null {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Biến môi trường không giữ được xuống dòng thật nên khoá được lưu dạng "\n".
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

// Access token sống 1 tiếng — giữ lại giữa các lần gọi để đỡ ký JWT liên tục.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(sa: ServiceAccount): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 60) return cachedToken.value;

  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const claim = Buffer.from(
    JSON.stringify({
      iss: sa.clientEmail,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  ).toString("base64url");

  let assertion: string;
  try {
    const signer = createSign("RSA-SHA256");
    signer.update(`${header}.${claim}`);
    assertion = `${header}.${claim}.${signer.sign(sa.privateKey).toString("base64url")}`;
  } catch {
    // Khoá sai định dạng — không có gì cứu được, đừng ném lỗi ra call site.
    return null;
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  }).catch(() => null);

  if (!res?.ok) return null;

  const json = (await res.json().catch(() => null)) as
    | { access_token?: string; expires_in?: number }
    | null;
  if (!json?.access_token) return null;

  cachedToken = { value: json.access_token, expiresAt: now + (json.expires_in ?? 3600) };
  return cachedToken.value;
}

function buildMessage(row: TokenRow, title: string, body: string, url: string) {
  const message = {
    token: row.token,
    notification: { title, body },
    // App đọc `data.url` trong listener pushNotificationActionPerformed để mở đúng trang.
    data: { url },
  };

  if (row.platform === "android") {
    return { ...message, android: { priority: "HIGH", notification: { sound: "default" } } };
  }

  return {
    ...message,
    apns: {
      headers: { "apns-priority": "10" },
      payload: { aps: { sound: "default" } },
    },
  };
}

/** Token đã bị gỡ app / hết hạn — xoá khỏi DB để lần sau khỏi gửi lại. */
function isStale(status: number, errorCode: string | undefined) {
  return status === 404 || errorCode === "UNREGISTERED" || errorCode === "INVALID_ARGUMENT";
}

/**
 * @param userIds Chỉ gửi cho các tài khoản này. Bỏ trống = gửi cho tất cả.
 *                Mảng rỗng = không gửi cho ai (khác hẳn với bỏ trống).
 */
export async function sendNativePush(
  title: string,
  body: string,
  url = "/",
  userIds?: string[],
) {
  const sa = readServiceAccount();
  if (!sa) return;
  if (userIds && userIds.length === 0) return;

  const db = createAdminSupabaseClient();
  if (!db) return;

  let query = untypedFrom(db, "native_push_tokens").select("token, platform").limit(10000);
  if (userIds) query = query.in("user_id", userIds);
  const { data } = (await query) as { data: TokenRow[] | null };

  const rows = data ?? [];
  if (rows.length === 0) return;

  const accessToken = await getAccessToken(sa);
  if (!accessToken) return;

  const endpoint = `https://fcm.googleapis.com/v1/projects/${sa.projectId}/messages:send`;
  const stale: string[] = [];

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await Promise.allSettled(
      rows.slice(i, i + BATCH_SIZE).map(async (row) => {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: buildMessage(row, title, body, url) }),
        });
        if (res.ok) return;

        const payload = (await res.json().catch(() => null)) as
          | { error?: { details?: { errorCode?: string }[] } }
          | null;
        const errorCode = payload?.error?.details?.find((d) => d.errorCode)?.errorCode;
        if (isStale(res.status, errorCode)) stale.push(row.token);
      }),
    );
  }

  if (stale.length > 0) {
    await untypedFrom(db, "native_push_tokens").delete().in("token", stale);
  }
}
