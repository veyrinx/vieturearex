/**
 * Chặn IP — kiểu dữ liệu và hàm thuần dùng chung.
 *
 * Trước đây trang /admin/security có nút "Chặn IP", có cả danh sách chặn tự
 * động, nhưng KHÔNG dòng nào đọc danh sách đó ra để chặn: `isBlockedInMemory`
 * không có nơi gọi, còn `security.blocked_ips` chỉ được ghi vào rồi hiện lên
 * bảng. Bấm chặn xong kẻ spam vẫn vào bình thường.
 *
 * File này là bộ luật duy nhất, để middleware (nơi thật sự chặn), API admin và
 * giao diện đọc chung một cách hiểu — lệch nhau một chỗ là chặn nhầm người
 * hoặc lại chặn hụt.
 *
 * Hàm phải thuần: middleware chạy ở runtime không có Node đầy đủ.
 */

export const SETTINGS_KEY_BLOCKED_IPS = "security.blocked_ips";
export const SETTINGS_KEY_IP_WHITELIST = "security.admin_ip_whitelist";

/** Hạn mặc định cho một lệnh chặn tự động. */
export const AUTO_BLOCK_DURATION_MS = 60 * 60 * 1000;

/** Giữ lại tối đa chừng này bản ghi để dòng settings không phình vô hạn. */
export const MAX_BLOCK_ENTRIES = 200;

export type BlockedIp = {
  ip: string;
  blockedAt: number;
  reason: string;
  /**
   * Mốc hết hạn (ms). `null` = chặn vĩnh viễn cho tới khi admin mở.
   *
   * Bản ghi cũ không có trường này — coi như chặn tự động 1 giờ, đúng bằng cái
   * mà bảng admin vẫn hiển thị từ trước.
   */
  expiresAt?: number | null;
  /** Ai/cái gì ra lệnh chặn: tên admin, hoặc tên chốt tự động. */
  by?: string;
};

const isIpish = (v: unknown): v is string =>
  typeof v === "string" && v.length >= 3 && v.length <= 64 && v !== "unknown";

/** Đọc dòng settings; hỏng thì trả mảng rỗng — không bao giờ ném lỗi. */
export function parseBlockedIps(raw: string | null | undefined): BlockedIp[] {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list
      .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
      .filter((e) => isIpish(e.ip))
      // Bỏ hẳn các lệnh chặn tự động do ăn 429 (chốt cũ, đã gỡ): chúng khoá
      // nhầm người thật. Bản ghi cũ còn nằm trong settings thì coi như không có.
      .filter((e) => e.by !== "auto:rate-limit")
      .map((e) => ({
        ip: String(e.ip).trim().toLowerCase(),
        blockedAt: Number(e.blockedAt) || 0,
        reason: typeof e.reason === "string" ? e.reason : "",
        expiresAt:
          e.expiresAt === null
            ? null
            : Number.isFinite(Number(e.expiresAt))
              ? Number(e.expiresAt)
              : (Number(e.blockedAt) || 0) + AUTO_BLOCK_DURATION_MS,
        by: typeof e.by === "string" ? e.by : undefined,
      }));
  } catch {
    return [];
  }
}

export function parseIpWhitelist(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.filter(isIpish).map((ip) => ip.trim().toLowerCase());
  } catch {
    return [];
  }
}

export const isBlockExpired = (entry: BlockedIp, now = Date.now()): boolean =>
  entry.expiresAt != null && entry.expiresAt <= now;

/** Bản ghi còn hiệu lực, mới nhất trước. */
export function activeBlocks(list: BlockedIp[], now = Date.now()): BlockedIp[] {
  return list.filter((e) => !isBlockExpired(e, now)).sort((a, b) => b.blockedAt - a.blockedAt);
}

/**
 * IP này có đang bị chặn không. Danh sách trắng luôn thắng: người trực có thể
 * tự chặn chính mình bằng một lần bấm nhầm, mà mở lại thì phải vào được admin.
 */
export function findIpBlock(
  ip: string,
  list: BlockedIp[],
  whitelist: string[] = [],
  now = Date.now(),
): BlockedIp | null {
  if (!isIpish(ip)) return null;
  const needle = ip.trim().toLowerCase();
  if (whitelist.includes(needle)) return null;
  return list.find((e) => e.ip === needle && !isBlockExpired(e, now)) ?? null;
}

/**
 * Thêm/thay một lệnh chặn rồi dọn bản ghi hết hạn. Trả mảng mới, không sửa
 * mảng đầu vào.
 */
export function upsertBlock(list: BlockedIp[], entry: BlockedIp, now = Date.now()): BlockedIp[] {
  const kept = list.filter((e) => e.ip !== entry.ip && !isBlockExpired(e, now));
  const next = [...kept, entry].sort((a, b) => a.blockedAt - b.blockedAt);
  return next.slice(-MAX_BLOCK_ENTRIES);
}

export const removeBlock = (list: BlockedIp[], ip: string): BlockedIp[] =>
  list.filter((e) => e.ip !== ip.trim().toLowerCase());
