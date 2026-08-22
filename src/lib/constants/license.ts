// Giấy phép bản quyền (license key) cấp cho đối tác dùng sản phẩm Arex.
//
// File này CHỈ chứa hàm thuần + nhãn hiển thị nên dùng được cả hai phía:
//   • server — sinh mã, xác thực (src/lib/server/licenses.ts)
//   • client — kiểm tra hình dạng mã trước khi gửi, vẽ badge (admin panel)
//
// Việc đọc/ghi cơ sở dữ liệu nằm ở src/lib/server/licenses.ts.

// ── Hình dạng mã ─────────────────────────────────────────────────────────────

/**
 * Crockford base32: bỏ I, L, O, U để không ai đọc nhầm 1/l, 0/O khi chép tay
 * hoặc đọc qua điện thoại — mã bản quyền hay bị truyền miệng đúng kiểu đó.
 */
export const LICENSE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export const LICENSE_PREFIX = "AREX";
/** 3 nhóm 5 ký tự ngẫu nhiên. */
const PAYLOAD_LEN = 15;
/** 1 nhóm 4 ký tự kiểm tra ở cuối. */
const CHECKSUM_LEN = 4;

/**
 * Ký tự kiểm tra để loại mã bịa/gõ sai NGAY tại client, khỏi tốn một vòng hỏi
 * cơ sở dữ liệu. Không phải chữ ký — nó không chứng minh mã có thật, chỉ chứng
 * minh mã không phải gõ bừa.
 */
export function licenseChecksum(payload: string): string {
  let hash = 0x811c9dc5; // FNV-1a 32-bit
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  let out = "";
  for (let i = 0; i < CHECKSUM_LEN; i++) {
    out += LICENSE_ALPHABET[hash % 32];
    hash = Math.floor(hash / 32);
  }
  return out;
}

/**
 * Gom mọi cách người ta chép mã (thiếu gạch, thừa khoảng trắng, chữ thường,
 * gõ O thay 0) về đúng một dạng chuẩn `AREX-XXXXX-XXXXX-XXXXX-CCCC`.
 * Trả "" nếu độ dài không đúng.
 */
export function normalizeLicenseKey(raw: string): string {
  const cleaned = (raw ?? "")
    .toUpperCase()
    .replace(/[IL]/g, "1")
    .replace(/O/g, "0")
    .replace(/U/g, "V")
    .replace(/[^0-9A-Z]/g, "");
  const body = cleaned.startsWith(LICENSE_PREFIX) ? cleaned.slice(LICENSE_PREFIX.length) : cleaned;
  if (body.length !== PAYLOAD_LEN + CHECKSUM_LEN) return "";
  if ([...body].some((c) => !LICENSE_ALPHABET.includes(c))) return "";
  return formatLicenseKey(body);
}

/** 19 ký tự thân mã → dạng có gạch nối để đọc/chép. */
export function formatLicenseKey(body: string): string {
  return [
    LICENSE_PREFIX,
    body.slice(0, 5),
    body.slice(5, 10),
    body.slice(10, 15),
    body.slice(15),
  ].join("-");
}

/** Đúng hình dạng VÀ đúng ký tự kiểm tra. Không nói gì về việc mã có tồn tại. */
export function isLicenseKeyShapeValid(raw: string): boolean {
  const key = normalizeLicenseKey(raw);
  if (!key) return false;
  const body = key.replace(/-/g, "").slice(LICENSE_PREFIX.length);
  return licenseChecksum(body.slice(0, PAYLOAD_LEN)) === body.slice(PAYLOAD_LEN);
}

/** Bản che để hiện trong danh sách/nhật ký: `AREX-7K2QP-•••••-•••••-4M1X`. */
export function maskLicenseKey(key: string): string {
  const parts = (key ?? "").split("-");
  if (parts.length !== 5) return "••••";
  return [parts[0], parts[1], "•••••", "•••••", parts[4]].join("-");
}

// ── Nhãn hiển thị ────────────────────────────────────────────────────────────

export const LICENSE_PRODUCTS = ["website", "mobile_app", "hub", "api", "other"] as const;
export type LicenseProduct = (typeof LICENSE_PRODUCTS)[number];

export const LICENSE_PRODUCT_LABEL: Record<LicenseProduct, string> = {
  website: "Website",
  mobile_app: "App di động",
  hub: "Arex Hub",
  api: "API / dữ liệu",
  other: "Khác",
};

export const LICENSE_PLANS = ["trial", "standard", "pro", "lifetime"] as const;
export type LicensePlan = (typeof LICENSE_PLANS)[number];

export const LICENSE_PLAN_LABEL: Record<LicensePlan, string> = {
  trial: "Dùng thử",
  standard: "Tiêu chuẩn",
  pro: "Nâng cao",
  lifetime: "Trọn đời",
};

/** Trạng thái lưu trong cột `status`. "expired" là trạng thái SUY RA, không lưu. */
export const LICENSE_STATUSES = ["active", "suspended", "revoked"] as const;
export type LicenseStatus = (typeof LICENSE_STATUSES)[number];

export type LicenseEffectiveStatus = LicenseStatus | "expired";

export const LICENSE_STATUS_LABEL: Record<LicenseEffectiveStatus, string> = {
  active: "Đang hiệu lực",
  suspended: "Tạm khoá",
  revoked: "Đã thu hồi",
  expired: "Hết hạn",
};

export const LICENSE_STATUS_TONE: Record<LicenseEffectiveStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  suspended: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  revoked: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
  expired: "bg-muted text-muted-foreground border-border",
};

/** Lý do một lần xác thực bị từ chối — dùng chung giữa API và panel. */
export const LICENSE_DENY_REASON_LABEL: Record<string, string> = {
  malformed: "Mã sai định dạng",
  not_found: "Không có mã này",
  suspended: "Mã đang tạm khoá",
  revoked: "Mã đã bị thu hồi",
  expired: "Mã đã hết hạn",
  domain_mismatch: "Tên miền không nằm trong giấy phép",
  activation_limit: "Vượt số bản cài đặt cho phép",
  product_mismatch: "Sai sản phẩm",
};

// ── Kiểu dữ liệu ─────────────────────────────────────────────────────────────

export type LicenseRecord = {
  id: string;
  key: string;
  partner_name: string;
  contact: string | null;
  product: LicenseProduct;
  plan: LicensePlan;
  domains: string[];
  features: string[];
  max_activations: number;
  status: LicenseStatus;
  issued_at: string;
  expires_at: string | null;
  contract_id: string | null;
  note: string | null;
  created_by: string | null;
  last_verified_at: string | null;
  verify_count: number;
  created_at: string;
  updated_at: string;
};

/** Bản gửi ra API quản trị: mã đã che, kèm số liệu đã tính sẵn. */
export type LicenseListItem = Omit<LicenseRecord, "key"> & {
  key_masked: string;
  effective_status: LicenseEffectiveStatus;
  days_left: number | null;
  activation_count: number;
};

export type LicenseActivation = {
  id: string;
  license_id: string;
  instance_id: string;
  domain: string | null;
  ip: string | null;
  user_agent: string | null;
  app_version: string | null;
  active: boolean;
  first_seen_at: string;
  last_seen_at: string;
  verify_count: number;
};

export type LicenseEvent = {
  id: string;
  license_id: string | null;
  event: string;
  detail: string | null;
  ip: string | null;
  actor: string | null;
  created_at: string;
};

// ── Suy luận ─────────────────────────────────────────────────────────────────

/**
 * Trạng thái THẬT của một giấy phép tại thời điểm đọc. Hết hạn được suy từ
 * `expires_at` chứ không phải một cột riêng — không có cron nào phải chạy, và
 * không bao giờ xảy ra cảnh cột status nói "đang hiệu lực" trong khi ngày hết
 * hạn đã trôi qua từ tuần trước.
 */
export function effectiveLicenseStatus(
  license: Pick<LicenseRecord, "status" | "expires_at">,
  now: Date = new Date(),
): LicenseEffectiveStatus {
  if (license.status !== "active") return license.status;
  if (license.expires_at && new Date(license.expires_at).getTime() <= now.getTime()) return "expired";
  return "active";
}

/** Số ngày còn lại (làm tròn lên). `null` = vĩnh viễn. Âm = đã quá hạn. */
export function licenseDaysLeft(
  expiresAt: string | null,
  now: Date = new Date(),
): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - now.getTime();
  if (Number.isNaN(diff)) return null;
  return Math.ceil(diff / 86_400_000);
}

/**
 * Chuẩn hoá tên miền để so khớp: bỏ giao thức, cổng, đường dẫn, `www.` và dấu
 * chấm cuối. "https://WWW.Doi-Tac.vn:443/trang" → "doi-tac.vn".
 */
export function normalizeDomain(raw: string): string {
  let host = (raw ?? "").trim().toLowerCase();
  if (!host) return "";
  host = host.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  host = host.split("/")[0].split("?")[0].split("#")[0];
  host = host.split("@").pop() ?? host;
  host = host.replace(/:\d+$/, "").replace(/\.$/, "");
  return host.startsWith("www.") ? host.slice(4) : host;
}

/**
 * Danh sách rỗng = không giới hạn tên miền. Một mục khớp cả chính nó lẫn mọi
 * tên miền con: khai "doi-tac.vn" là "app.doi-tac.vn" cũng chạy, khỏi phải khai
 * từng subdomain mỗi lần đối tác dựng thêm trang.
 */
export function domainAllowed(allowed: string[], candidate: string): boolean {
  if (!allowed || allowed.length === 0) return true;
  const host = normalizeDomain(candidate);
  if (!host) return false;
  return allowed.some((entry) => {
    const base = normalizeDomain(entry);
    if (!base) return false;
    return host === base || host.endsWith(`.${base}`);
  });
}

export function vnDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(d)
    .replace(",", "");
}
