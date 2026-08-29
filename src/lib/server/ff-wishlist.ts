import "server-only";
import { getSettings } from "@/lib/data/content-service";
import { decryptSecret, encryptSecret } from "@/lib/server/shop-crypto";
import { iconUrl } from "@/lib/data/ff-icons";
import {
  WISHLIST_CAPACITY,
  isValidWishlistItemId,
  type WishlistItem,
  type WishlistMethod,
} from "@/lib/constants/ff-wishlist";

/**
 * Cầu nối sang API wishlist Free Fire.
 *
 * Luồng: người trực dán acc của người chơi (.dat hoặc uid + mật khẩu) → MÁY CHỦ
 * gọi /login hộ → nhận token phiên của game → thêm/bớt món theo ID vật phẩm.
 * Không ai phải mở game, và không dòng nào của mật khẩu được ghi xuống DB.
 *
 * Token phiên cũng không đi thẳng ra trình duyệt: nó được niêm phong (AES-GCM,
 * khoá ở biến môi trường) thành một chuỗi vô nghĩa, client chỉ cầm chuỗi đó và
 * gửi lại mỗi lượt gọi. Lấy được chuỗi mà không có khoá thì cũng không mở được
 * acc nào, và nó tự hết hạn sau 2 giờ.
 */

/** Gateway mặc định; đổi được ở /admin/settings mà không phải build lại. */
const DEFAULT_API_BASE = "https://kog-api-gateway.vercel.app/api/wishlist/account";
const API_BASE_SETTING_KEY = "integrations.wishlist_api_base";

/** Kho tên + độ hiếm vật phẩm (chỉ để hiển thị; ID mới là thứ gửi sang game). */
const LIBRARY_URL =
  "https://raw.githubusercontent.com/KingofGames02/Free-Fire-Items-Library/main/ItemsData_en.json";

const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const SESSION_PREFIX = "v1.";

export type WishlistSession = {
  token: string;
  serverUrl: string;
  uid: string;
  region: string | null;
  expiresAt: number;
};

async function apiBase(): Promise<string> {
  if (process.env.WISHLIST_API_BASE) return process.env.WISHLIST_API_BASE.replace(/\/+$/, "");
  try {
    const settings = await getSettings();
    const value = settings.find((s) => s.key === API_BASE_SETTING_KEY)?.value?.trim();
    if (value && /^https?:\/\//.test(value)) return value.replace(/\/+$/, "");
  } catch {
    /* không đọc được settings thì dùng mặc định */
  }
  return DEFAULT_API_BASE;
}

// ── Niêm phong phiên ─────────────────────────────────────────────────────────

export async function sealSession(session: WishlistSession): Promise<string | null> {
  const envelope = await encryptSecret({
    token: session.token,
    server_url: session.serverUrl,
    uid: session.uid,
    region: session.region ?? "",
    exp: String(session.expiresAt),
  });
  return envelope ? `${SESSION_PREFIX}${envelope.enc}` : null;
}

/** Mở niêm phong. Sai khoá, sai định dạng hay quá hạn đều trả null. */
export async function openSession(sealed: string | null | undefined): Promise<WishlistSession | null> {
  if (!sealed || !sealed.startsWith(SESSION_PREFIX)) return null;
  const plain = await decryptSecret({ v: 1, enc: sealed.slice(SESSION_PREFIX.length) });
  if (!plain?.token || !plain.server_url) return null;

  const expiresAt = Number(plain.exp ?? 0);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;

  return {
    token: plain.token,
    serverUrl: plain.server_url,
    uid: plain.uid ?? "",
    region: plain.region || null,
    expiresAt,
  };
}

// ── Gọi gateway ──────────────────────────────────────────────────────────────

type GatewayResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

async function callGateway<T>(
  path: string,
  session: WishlistSession,
  body: unknown,
): Promise<GatewayResult<T>> {
  const base = await apiBase();
  try {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: session.token,
        "Server-Url": session.serverUrl,
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });

    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Phiên đăng nhập của acc đã hết hạn, đăng nhập lại.", status: 401 };
    }

    const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!res.ok || !data) {
      return { ok: false, error: data?.error ?? "Gateway trả lỗi.", status: res.status || 502 };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, error: "Không gọi được gateway wishlist.", status: 504 };
  }
}

/**
 * Đăng nhập acc người chơi. `dat` là nội dung tệp guest (bytes), `guest` là
 * uid + mật khẩu — đúng một trong hai.
 *
 * Bản rõ chỉ sống trong đúng lượt gọi này: gửi đi, lấy token, rồi rơi ra khỏi
 * bộ nhớ. Không có chỗ nào ghi nó xuống.
 */
export async function loginWishlistAccount(input: {
  method: WishlistMethod;
  datName?: string;
  datBytes?: Uint8Array;
  uid?: string;
  password?: string;
}): Promise<{ session: WishlistSession } | { error: string; status: number }> {
  const base = await apiBase();

  let init: RequestInit;
  if (input.method === "dat") {
    if (!input.datBytes?.length) return { error: "Thiếu tệp .dat.", status: 400 };
    const form = new FormData();
    form.append(
      "file",
      new Blob([input.datBytes as unknown as BlobPart], { type: "application/octet-stream" }),
      input.datName || "GUEST.DAT",
    );
    init = { method: "POST", body: form };
  } else {
    if (!input.uid || !input.password) return { error: "Thiếu UID hoặc mật khẩu.", status: 400 };
    init = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: input.uid, password: input.password }),
    };
  }

  try {
    const res = await fetch(`${base}/login`, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok || !data) {
      const message = typeof data?.error === "string" ? data.error : "Đăng nhập thất bại.";
      return { error: message, status: res.status || 502 };
    }

    const token = typeof data.token === "string" ? data.token : "";
    const serverUrl = typeof data.server_url === "string" ? data.server_url : "";
    if (!token || !serverUrl) return { error: "Gateway không trả token phiên.", status: 502 };

    return {
      session: {
        token,
        serverUrl,
        uid: String(data.uid ?? input.uid ?? ""),
        region: typeof data.lockRegion === "string" ? data.lockRegion : null,
        expiresAt: Date.now() + SESSION_TTL_MS,
      },
    };
  } catch {
    return { error: "Không gọi được gateway wishlist.", status: 504 };
  }
}

/** Wishlist hiện tại của một acc (mặc định là acc đang đăng nhập). */
export async function fetchWishlist(
  session: WishlistSession,
  accountId?: string,
): Promise<{ ids: string[]; corrupted: boolean } | { error: string; status: number }> {
  const target = accountId?.trim() || session.uid;
  const result = await callGateway<{
    items?: Array<{ id?: string | number }>;
    has_corrupted_item?: boolean;
    has_corrupted_items?: boolean;
  }>("/wishlist", session, { account_id: /^\d+$/.test(target) ? Number(target) : target });

  if (!result.ok) return { error: result.error, status: result.status };

  const ids = (result.data.items ?? [])
    .map((i) => String(i?.id ?? ""))
    .filter((id) => isValidWishlistItemId(id));
  return {
    ids,
    corrupted: Boolean(result.data.has_corrupted_item || result.data.has_corrupted_items),
  };
}

/**
 * Thêm / bớt món. Gateway chỉ nhận MỘT món mỗi lượt nên đi tuần tự và trả về
 * đúng những id đã ăn — hỏng giữa chừng thì phần trước đó vẫn có hiệu lực,
 * người trực nhìn danh sách là biết còn thiếu món nào.
 */
export async function updateWishlist(
  session: WishlistSession,
  input: { add?: string[]; remove?: string[] },
): Promise<{ added: string[]; removed: string[]; failed: string[] }> {
  const added: string[] = [];
  const removed: string[] = [];
  const failed: string[] = [];

  for (const id of input.remove ?? []) {
    const res = await callGateway("/wishlist/update", session, {
      add_ids: [],
      del_ids: [Number(id)],
      add_src: [],
      del_src: ["WishList"],
    });
    (res.ok ? removed : failed).push(id);
  }

  for (const id of input.add ?? []) {
    const res = await callGateway("/wishlist/update", session, {
      add_ids: [Number(id)],
      del_ids: [],
      add_src: ["WishList"],
      del_src: [],
    });
    (res.ok ? added : failed).push(id);
  }

  return { added, removed, failed };
}

// ── Kho vật phẩm (tên + độ hiếm) ─────────────────────────────────────────────

type LibraryEntry = { name: string | null; rarity: string | null };

let libraryCache: { map: Map<string, LibraryEntry>; ts: number } | null = null;
const LIBRARY_TTL_MS = 60 * 60 * 1000;

/**
 * Kho tên vật phẩm, nhớ 1 giờ trong bộ nhớ tiến trình. Tải hỏng thì trả kho cũ
 * (hoặc rỗng) — thiếu tên thì công cụ vẫn chạy được bằng ID, mất kho mới là mất
 * việc.
 */
async function library(): Promise<Map<string, LibraryEntry>> {
  if (libraryCache && Date.now() - libraryCache.ts < LIBRARY_TTL_MS) return libraryCache.map;
  try {
    const res = await fetch(LIBRARY_URL, {
      headers: { "User-Agent": "arex-network" },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return libraryCache?.map ?? new Map();
    const rows = (await res.json()) as Array<{ Id?: string | number; Name?: string; Rare?: string }>;
    const map = new Map<string, LibraryEntry>();
    for (const row of rows) {
      const id = String(row?.Id ?? "");
      if (!isValidWishlistItemId(id)) continue;
      map.set(id, { name: row.Name?.trim() || null, rarity: row.Rare?.trim() || null });
    }
    if (map.size > 0) libraryCache = { map, ts: Date.now() };
    return libraryCache?.map ?? map;
  } catch {
    return libraryCache?.map ?? new Map();
  }
}

function toItem(id: string, entry?: LibraryEntry): WishlistItem {
  return {
    id,
    name: entry?.name ?? null,
    rarity: entry?.rarity ?? null,
    // Icon đi qua proxy của site để không phụ thuộc GitHub lúc render.
    icon: iconUrl(id),
  };
}

/** Gắn tên + icon cho một mớ ID (giữ nguyên thứ tự truyền vào). */
export async function decorateItems(ids: string[]): Promise<WishlistItem[]> {
  const map = await library();
  return ids.map((id) => toItem(id, map.get(id)));
}

/**
 * Tìm vật phẩm để thêm vào wishlist. Gõ số ra đúng ID đó, gõ chữ thì lọc theo
 * tên trong kho.
 */
export async function searchItems(query: string, limit = 60): Promise<WishlistItem[]> {
  const map = await library();
  const q = query.trim().toLowerCase();
  if (!q) return [];

  if (/^\d+$/.test(q)) {
    const exact = map.get(q);
    const out: WishlistItem[] = [toItem(q, exact)];
    for (const [id, entry] of map) {
      if (out.length >= limit) break;
      if (id !== q && id.startsWith(q)) out.push(toItem(id, entry));
    }
    return out;
  }

  const out: WishlistItem[] = [];
  for (const [id, entry] of map) {
    if (out.length >= limit) break;
    if (entry.name && entry.name.toLowerCase().includes(q)) out.push(toItem(id, entry));
  }
  return out;
}

export { WISHLIST_CAPACITY };
