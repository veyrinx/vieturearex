/**
 * In-app role/capability matrix.
 *
 * Capabilities are stable string keys checked at action sites
 * (`hasCapability(role, "events.create")`). The mapping role→capabilities
 * is owned by `settings.permissions.role_capabilities` (JSON), editable
 * from /admin/settings → tab "Phân quyền". When the setting is missing or
 * malformed, falls back to DEFAULT_ROLE_CAPABILITIES below.
 *
 * super_admin always has every capability — this is hard-coded so a bad
 * setting can't lock the project owner out.
 */

export const ROLE_KEYS = ["super_admin", "admin", "it", "manager", "support", "user"] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export const ROLE_LABELS: Record<RoleKey, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  it: "IT",
  manager: "Quản Lý",
  support: "CSKH",
  user: "Người Dùng",
};

export const CAPABILITIES = [
  // Events
  { key: "events.create",      group: "Sự kiện",   label: "Tạo sự kiện" },
  { key: "events.edit",        group: "Sự kiện",   label: "Chỉnh sửa sự kiện" },
  { key: "events.delete",      group: "Sự kiện",   label: "Xóa sự kiện" },
  // News
  { key: "news.create",        group: "Tin tức",   label: "Đăng tin" },
  { key: "news.edit",          group: "Tin tức",   label: "Sửa tin" },
  { key: "news.delete",        group: "Tin tức",   label: "Xóa tin" },
  // Comments
  { key: "comments.moderate",  group: "Bình luận", label: "Duyệt / xóa bình luận" },
  // Team
  { key: "team.approve_it",    group: "Tuyển dụng", label: "Duyệt vòng IT" },
  { key: "team.approve_admin", group: "Tuyển dụng", label: "Duyệt cuối (Admin)" },
  { key: "team.invite",        group: "Tuyển dụng", label: "Tạo / thu hồi link mời" },
  // Users
  { key: "users.edit",         group: "Người dùng", label: "Sửa user / đổi role" },
  { key: "users.ban",          group: "Người dùng", label: "Khoá / mở khoá" },
  { key: "users.delete",       group: "Người dùng", label: "Xoá user" },
  // Site
  { key: "settings.edit",      group: "Hệ thống",  label: "Sửa cấu hình site" },
  { key: "permissions.edit",   group: "Hệ thống",  label: "Sửa ma trận phân quyền" },
  { key: "logs.view",          group: "Hệ thống",  label: "Xem activity log" },
  { key: "sql.run",            group: "Hệ thống",  label: "Chạy SQL editor" },
] as const;

export type CapabilityKey = (typeof CAPABILITIES)[number]["key"];

/** Default matrix used when the setting is empty/invalid. */
export const DEFAULT_ROLE_CAPABILITIES: Record<RoleKey, CapabilityKey[]> = {
  super_admin: CAPABILITIES.map((c) => c.key),
  admin: [
    "events.create", "events.edit", "events.delete",
    "news.create", "news.edit", "news.delete",
    "comments.moderate",
    "team.approve_it", "team.approve_admin", "team.invite",
    "users.edit", "users.ban",
    "settings.edit", "logs.view",
  ],
  it: [
    "events.create", "events.edit",
    "news.create", "news.edit",
    "team.approve_it",
    "logs.view",
  ],
  manager: [
    "events.create", "events.edit",
    "news.create", "news.edit",
    "comments.moderate",
  ],
  support: [
    "comments.moderate",
  ],
  user: [],
};

export type RoleCapabilityMap = Record<string, string[]>;

export function parseRoleCapabilities(raw?: string | null): RoleCapabilityMap {
  if (!raw || !raw.trim()) return DEFAULT_ROLE_CAPABILITIES;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const out: RoleCapabilityMap = { ...DEFAULT_ROLE_CAPABILITIES };
      for (const [role, caps] of Object.entries(parsed)) {
        if (Array.isArray(caps)) out[role] = caps.filter((c) => typeof c === "string");
      }
      return out;
    }
  } catch { /* ignore */ }
  return DEFAULT_ROLE_CAPABILITIES;
}

/** super_admin is always-on; otherwise consult the matrix. */
export function hasCapability(
  role: string | null | undefined,
  capability: CapabilityKey,
  matrix: RoleCapabilityMap = DEFAULT_ROLE_CAPABILITIES,
): boolean {
  if (!role) return false;
  if (role === "super_admin") return true;
  const caps = matrix[role];
  return Array.isArray(caps) && caps.includes(capability);
}
