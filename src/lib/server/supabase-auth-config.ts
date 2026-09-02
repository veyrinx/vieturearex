import "server-only";
import {
  SOCIAL_PROVIDERS,
  type SocialProvider,
} from "@/lib/constants/social-login";

/**
 * Đọc/ghi cấu hình đăng nhập xã hội của chính dự án Supabase.
 *
 * Bật một provider KHÔNG phải việc của repo này — nó nằm trong dự án Supabase.
 * Có hai đường tới đó:
 *
 *  - Đọc trạng thái: `GET /auth/v1/settings` là endpoint công khai, ai cũng gọi
 *    được, trả đúng danh sách provider đang bật. Luôn dùng được.
 *  - Ghi: `PATCH https://api.supabase.com/v1/projects/{ref}/config/auth`, cần
 *    Personal Access Token (SUPABASE_ACCESS_TOKEN, chuỗi bắt đầu bằng `sbp_`).
 *    Không có token thì trang admin chuyển sang chế độ hướng dẫn thay vì giả vờ
 *    lưu được.
 *
 * Client secret KHÔNG bao giờ được ghi vào bảng settings của site: nó đi thẳng
 * từ form sang Supabase rồi thôi.
 */

const MANAGEMENT_API = "https://api.supabase.com";
const TIMEOUT_MS = 10_000;

export type ProviderLiveStatus = Record<SocialProvider, boolean>;

/** Ref dự án suy từ URL Supabase: https://<ref>.supabase.co */
export function projectRef(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const m = url.match(/^https?:\/\/([a-z0-9]+)\.supabase\.(co|in)/i);
  return m?.[1] ?? null;
}

export const hasManagementToken = (): boolean =>
  !!process.env.SUPABASE_ACCESS_TOKEN && !!projectRef();

/** Provider nào ĐANG bật trên Supabase. Lỗi thì trả tất cả false. */
export async function fetchProviderStatus(): Promise<ProviderLiveStatus> {
  const empty = Object.fromEntries(SOCIAL_PROVIDERS.map((p) => [p, false])) as ProviderLiveStatus;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return empty;

  try {
    const res = await fetch(`${url.replace(/\/+$/, "")}/auth/v1/settings`, {
      headers: { apikey: anon },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return empty;
    const json = (await res.json()) as { external?: Record<string, boolean> };
    const ext = json.external ?? {};
    return Object.fromEntries(
      SOCIAL_PROVIDERS.map((p) => [p, ext[p] === true]),
    ) as ProviderLiveStatus;
  } catch {
    return empty;
  }
}

export type ProviderCredentials = {
  provider: SocialProvider;
  enabled: boolean;
  clientId?: string;
  /** Chỉ gửi khi người dùng nhập mới — bỏ trống là giữ nguyên secret cũ. */
  secret?: string;
};

/**
 * Đẩy cấu hình một provider sang Supabase. Trả thông điệp lỗi, hoặc null nếu
 * xong xuôi.
 */
export async function pushProviderConfig(input: ProviderCredentials): Promise<string | null> {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = projectRef();
  if (!token || !ref) {
    return "Chưa có SUPABASE_ACCESS_TOKEN — không thể bật/tắt provider từ đây.";
  }

  const body: Record<string, unknown> = {
    [`external_${input.provider}_enabled`]: input.enabled,
  };
  if (input.clientId) body[`external_${input.provider}_client_id`] = input.clientId;
  if (input.secret) body[`external_${input.provider}_secret`] = input.secret;

  try {
    const res = await fetch(`${MANAGEMENT_API}/v1/projects/${ref}/config/auth`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.ok) return null;
    const text = await res.text();
    return `Supabase từ chối (HTTP ${res.status}): ${text.slice(0, 200)}`;
  } catch (err) {
    return err instanceof Error ? err.message : "Không gọi được Management API.";
  }
}

/** Client ID đang khai bên Supabase (để form hiện lại). Cần token. */
export async function fetchProviderClientIds(): Promise<Partial<Record<SocialProvider, string>>> {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = projectRef();
  if (!token || !ref) return {};

  try {
    const res = await fetch(`${MANAGEMENT_API}/v1/projects/${ref}/config/auth`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return {};
    const cfg = (await res.json()) as Record<string, unknown>;
    const out: Partial<Record<SocialProvider, string>> = {};
    for (const p of SOCIAL_PROVIDERS) {
      const id = cfg[`external_${p}_client_id`];
      if (typeof id === "string" && id) out[p] = id;
    }
    return out;
  } catch {
    return {};
  }
}
