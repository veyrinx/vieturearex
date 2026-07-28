import { env } from "@/env";
import { currentAccessToken, supabase } from "@/lib/supabase";

/**
 * Cầu nối tới REST API của arexnetwork.site.
 *
 * App chạy ở origin `capacitor://localhost` (iOS) / `http://localhost` (Android)
 * nên KHÔNG gửi được cookie phiên. Thay vào đó mọi request kèm
 * `Authorization: Bearer <supabase jwt>`; phía server `createServerSupabaseClient()`
 * đọc header này và chạy đúng danh tính người dùng (xem src/lib/supabase/server.ts).
 * CORS đã được mở sẵn cho `/api/*` trong next.config.mjs.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Lỗi mạng (mất sóng, server sập) — tách riêng để UI hiện màn hình offline. */
export class NetworkError extends Error {
  constructor(message = "Không kết nối được máy chủ.") {
    super(message);
    this.name = "NetworkError";
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Bỏ qua khi gọi endpoint không cần đăng nhập. */
  auth?: boolean;
  signal?: AbortSignal;
};

async function authHeaders(): Promise<Record<string, string>> {
  const token = await currentAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string; message?: string };
    return data.error ?? data.message ?? `Lỗi ${response.status}`;
  } catch {
    return `Lỗi ${response.status}`;
  }
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, signal } = options;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) Object.assign(headers, await authHeaders());

  let response: Response;
  try {
    response = await fetch(`${env.apiBaseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new NetworkError();
  }

  if (response.status === 401 && auth) {
    // Token hỏng/hết hạn mà refresh cũng không cứu được → buộc đăng nhập lại.
    await supabase.auth.signOut().catch(() => null);
    throw new ApiError("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.", 401);
  }

  if (!response.ok) throw new ApiError(await readError(response), response.status);

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/**
 * Tải ảnh lên Supabase Storage qua `/api/upload`, trả về URL công khai.
 * Bucket hợp lệ theo server: `logos` | `forum` | `events`.
 */
export async function uploadImage(
  file: File | Blob,
  options: { bucket?: "logos" | "forum" | "events"; fileName?: string } = {},
): Promise<string> {
  const form = new FormData();
  const name = options.fileName ?? (file instanceof File ? file.name : `hub-${Date.now()}.jpg`);
  form.append("file", file, name);
  form.append("bucket", options.bucket ?? "logos");

  let response: Response;
  try {
    response = await fetch(`${env.apiBaseUrl}/api/upload`, {
      method: "POST",
      headers: { Accept: "application/json", ...(await authHeaders()) },
      body: form,
    });
  } catch {
    throw new NetworkError("Không tải được ảnh lên — kiểm tra kết nối mạng.");
  }

  if (!response.ok) throw new ApiError(await readError(response), response.status);

  const data = (await response.json()) as { publicUrl?: string };
  if (!data.publicUrl) throw new ApiError("Máy chủ không trả về đường dẫn ảnh.", 500);
  return data.publicUrl;
}

/**
 * Link tải file cài đặt app: endpoint trả về redirect tới signed URL, mà signed
 * URL thì không cần header nên mở thẳng bằng trình duyệt hệ thống được. Ta gọi
 * kèm Bearer với `redirect: "manual"` để lấy đúng đường dẫn đã ký.
 */
export async function signedReleaseUrl(path: string): Promise<string> {
  const response = await fetch(
    `${env.apiBaseUrl}/api/admin/app-releases/download?path=${encodeURIComponent(path)}`,
    { headers: await authHeaders(), redirect: "manual" },
  );

  const location = response.headers.get("location");
  if (location) return location;

  // Một số WebView tự đi theo redirect — khi đó `response.url` chính là signed URL.
  if (response.ok && response.url) return response.url;

  throw new ApiError(await readError(response), response.status || 500);
}
