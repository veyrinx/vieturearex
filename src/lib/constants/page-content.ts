// Nội dung trang tĩnh do admin sửa — lưu trong settings key `site.pages` (JSON).
// Quản lý ở /admin/page-content. Hàm thuần (client + server).
//
// Cơ chế ĐÈ: để trống thì trang vẫn dùng nội dung mặc định viết sẵn trong code.
// Nhờ vậy không phải chuyển ~1400 dòng văn bản pháp lý vào DB, và nếu admin xoá
// nhầm thì trang tự quay về bản gốc thay vì trắng trơn.

export const SETTINGS_KEY_PAGES = "site.pages";

export type EditablePage = { key: string; slug: string; label: string; note?: string };

// Chỉ gồm trang nội dung THUẦN TĨNH. Cố ý KHÔNG đưa vào đây:
//   /recruitment, /community-tournaments — đọc dữ liệu động (đội, giải đấu),
//     đã có admin riêng;
//   /join — luồng tham gia giải đấu, đè lên sẽ hỏng chức năng.
export const EDITABLE_PAGES: EditablePage[] = [
  { key: "about",          slug: "/about",          label: "Về chúng tôi" },
  { key: "nap-an-toan",    slug: "/safe-topup",    label: "Nạp an toàn" },
  { key: "dang-ky-tin",    slug: "/newsletter",    label: "Đăng ký nhận tin" },
  { key: "hop-tac",        slug: "/partnership",        label: "Hợp tác & Đối tác", note: "Chỉ phần lời mời hợp tác — danh sách đối tác quản lý ở /admin/partners" },
  { key: "privacy-policy", slug: "/privacy-policy", label: "Chính sách bảo mật", note: "Văn bản pháp lý" },
  { key: "terms-of-use",   slug: "/terms-of-use",   label: "Điều khoản sử dụng", note: "Văn bản pháp lý" },
  { key: "cookie-policy",  slug: "/cookie-policy",  label: "Chính sách cookie",  note: "Văn bản pháp lý" },
];

export const PAGE_KEYS = EDITABLE_PAGES.map((p) => p.key);

export type PageContent = {
  key: string;
  /** HTML rút gọn; được làm sạch bằng sanitizeRichText trước khi render. */
  body: string;
  enabled?: boolean;
};

/** Giới hạn rộng vì trang pháp lý rất dài. */
const MAX_BODY = 80_000;

export function parsePageContents(raw: string | null | undefined): PageContent[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const out: PageContent[] = [];
  const seen = new Set<string>();
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const key = typeof o.key === "string" ? o.key.trim() : "";
    // Chỉ nhận key nằm trong danh sách cho phép, không trùng.
    if (!PAGE_KEYS.includes(key) || seen.has(key)) continue;
    const body = typeof o.body === "string" ? o.body.slice(0, MAX_BODY) : "";
    seen.add(key);
    out.push({ key, body, enabled: o.enabled !== false });
  }
  return out;
}

export function serializePageContents(items: PageContent[]): string {
  return JSON.stringify(
    items
      // Bỏ mục rỗng để trang quay về nội dung mặc định.
      .filter((i) => i.body.trim())
      .map((i) => ({
        key: i.key,
        body: i.body,
        ...(i.enabled === false ? { enabled: false } : {}),
      })),
  );
}
