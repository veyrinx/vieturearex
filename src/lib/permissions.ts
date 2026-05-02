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

/** Built-in role hierarchy levels. Custom roles in settings can use any level. */
export const BUILTIN_ROLE_LEVELS: Record<RoleKey, number> = {
  super_admin: 200,
  it: 150,
  admin: 100,
  manager: 60,
  support: 40,
  user: 20,
};

export type CustomRole = {
  key: string;
  label: string;
  /** Higher = more powerful. May exceed 200 (above super_admin) if needed. */
  level: number;
  /** Capability keys this role has. */
  capabilities: string[];
  /** Optional UI accent: red, orange, amber, blue, violet, pink, etc. */
  color?: string;
};

export type ResolvedRole = {
  key: string;
  label: string;
  level: number;
  capabilities: string[];
  color?: string;
  isBuiltin: boolean;
};

export function parseCustomRoles(raw?: string | null): CustomRole[] {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((r: unknown): r is Partial<CustomRole> =>
        typeof r === "object" && r !== null
        && typeof (r as { key?: unknown }).key === "string"
        && typeof (r as { label?: unknown }).label === "string",
      )
      .map((r) => ({
        key: r.key!.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 32),
        label: r.label!.slice(0, 40),
        level: typeof r.level === "number" ? Math.max(0, Math.min(1000, r.level)) : 50,
        capabilities: Array.isArray(r.capabilities)
          ? r.capabilities.filter((c): c is string => typeof c === "string")
          : [],
        color: typeof r.color === "string" ? r.color.slice(0, 20) : undefined,
      }))
      // Built-in keys cannot be overridden as custom roles (avoids confusion)
      .filter((r) => !(ROLE_KEYS as readonly string[]).includes(r.key));
  } catch { return []; }
}

/**
 * Merge built-in roles with custom roles defined in settings + apply
 * the role_capabilities matrix override on top.
 */
export function getResolvedRoles(
  customRolesRaw?: string | null,
  capabilityMatrixRaw?: string | null,
): ResolvedRole[] {
  const custom = parseCustomRoles(customRolesRaw);
  const matrix = parseRoleCapabilities(capabilityMatrixRaw);

  const builtins: ResolvedRole[] = ROLE_KEYS.map((key) => ({
    key,
    label: ROLE_LABELS[key],
    level: BUILTIN_ROLE_LEVELS[key],
    capabilities: matrix[key] ?? DEFAULT_ROLE_CAPABILITIES[key] ?? [],
    isBuiltin: true,
  }));

  const customResolved: ResolvedRole[] = custom.map((r) => ({
    ...r,
    capabilities: matrix[r.key] ?? r.capabilities,
    isBuiltin: false,
  }));

  return [...builtins, ...customResolved].sort((a, b) => b.level - a.level);
}

/** Look up the level for a role key against the merged list. */
export function getRoleLevel(
  role: string | null | undefined,
  resolved: ResolvedRole[],
): number {
  if (!role) return 0;
  const found = resolved.find((r) => r.key === role);
  return found?.level ?? 0;
}

export const CAPABILITIES = [
  // Events
  { key: "events.create",      group: "Sự kiện",    label: "Tạo sự kiện" },
  { key: "events.edit",        group: "Sự kiện",    label: "Chỉnh sửa sự kiện" },
  { key: "events.delete",      group: "Sự kiện",    label: "Xóa sự kiện" },
  { key: "events.publish",     group: "Sự kiện",    label: "Đăng / ẩn sự kiện" },
  // News
  { key: "news.create",        group: "Tin tức",    label: "Viết bài" },
  { key: "news.edit",          group: "Tin tức",    label: "Sửa bài" },
  { key: "news.delete",        group: "Tin tức",    label: "Xóa bài" },
  { key: "news.publish",       group: "Tin tức",    label: "Đăng / ẩn bài" },
  // Comments
  { key: "comments.moderate",  group: "Bình luận",  label: "Duyệt / xóa bình luận" },
  // Gallery
  { key: "gallery.upload",     group: "Gallery",    label: "Upload ảnh gallery" },
  { key: "gallery.approve",    group: "Gallery",    label: "Duyệt ảnh chờ duyệt" },
  { key: "gallery.delete",     group: "Gallery",    label: "Xóa ảnh gallery" },
  // Esports
  { key: "esports.create",     group: "Esports",    label: "Thêm stream / tin esports" },
  { key: "esports.edit",       group: "Esports",    label: "Sửa stream / tin esports" },
  { key: "esports.delete",     group: "Esports",    label: "Xóa stream / tin esports" },
  // TMS
  { key: "tms.create",         group: "Giải đấu",   label: "Tạo giải đấu" },
  { key: "tms.manage",         group: "Giải đấu",   label: "Quản lý giải đấu / đội" },
  { key: "tms.scores",         group: "Giải đấu",   label: "Cập nhật / duyệt kết quả" },
  // Ratings
  { key: "ratings.manage",     group: "Đánh giá",   label: "Quản lý đánh giá / phản hồi" },
  // Team / Recruitment
  { key: "team.approve_it",    group: "Tuyển dụng", label: "Duyệt vòng IT" },
  { key: "team.approve_admin", group: "Tuyển dụng", label: "Duyệt cuối (Admin)" },
  { key: "team.invite",        group: "Tuyển dụng", label: "Tạo / thu hồi link mời" },
  // Users
  { key: "users.view",         group: "Người dùng", label: "Xem danh sách thành viên" },
  { key: "users.edit",         group: "Người dùng", label: "Sửa user / đổi role" },
  { key: "users.ban",          group: "Người dùng", label: "Khoá / mở khoá tài khoản" },
  { key: "users.delete",       group: "Người dùng", label: "Xoá tài khoản" },
  // Analytics
  { key: "analytics.view",     group: "Thống kê",   label: "Xem thống kê & lượt xem" },
  // System
  { key: "settings.edit",      group: "Hệ thống",   label: "Sửa cấu hình site" },
  { key: "permissions.edit",   group: "Hệ thống",   label: "Sửa ma trận phân quyền" },
  { key: "logs.view",          group: "Hệ thống",   label: "Xem activity log" },
  { key: "sql.run",            group: "Hệ thống",   label: "Chạy SQL editor" },
] as const;

export type CapabilityKey = (typeof CAPABILITIES)[number]["key"];

/** Default matrix used when the setting is empty/invalid. */
export const DEFAULT_ROLE_CAPABILITIES: Record<RoleKey, CapabilityKey[]> = {
  super_admin: CAPABILITIES.map((c) => c.key),
  admin: [
    "events.create", "events.edit", "events.delete", "events.publish",
    "news.create", "news.edit", "news.delete", "news.publish",
    "comments.moderate",
    "gallery.upload", "gallery.approve", "gallery.delete",
    "esports.create", "esports.edit", "esports.delete",
    "tms.create", "tms.manage", "tms.scores",
    "ratings.manage",
    "team.approve_it", "team.approve_admin", "team.invite",
    "users.view", "users.edit", "users.ban",
    "analytics.view",
    "settings.edit", "logs.view",
  ],
  it: [
    "events.create", "events.edit", "events.publish",
    "news.create", "news.edit", "news.publish",
    "gallery.upload", "gallery.approve",
    "esports.create", "esports.edit",
    "tms.create", "tms.manage", "tms.scores",
    "team.approve_it", "team.invite",
    "users.view",
    "analytics.view",
    "logs.view",
  ],
  manager: [
    "events.create", "events.edit", "events.publish",
    "news.create", "news.edit", "news.publish",
    "comments.moderate",
    "gallery.upload", "gallery.approve",
    "esports.create", "esports.edit",
    "tms.manage", "tms.scores",
    "ratings.manage",
    "users.view",
    "analytics.view",
  ],
  support: [
    "comments.moderate",
    "ratings.manage",
    "users.view",
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

/**
 * Capability check that also recognises custom roles whose level >= super_admin
 * (i.e. roles created above super_admin) as always-on. Use this on the server
 * when you have access to the resolved role list.
 */
export function hasCapabilityWithRoles(
  role: string | null | undefined,
  capability: CapabilityKey,
  matrix: RoleCapabilityMap,
  resolved: ResolvedRole[],
): boolean {
  if (!role) return false;
  if (role === "super_admin") return true;
  const meta = resolved.find((r) => r.key === role);
  if (meta && meta.level >= BUILTIN_ROLE_LEVELS.super_admin) return true;
  const caps = matrix[role];
  return Array.isArray(caps) && caps.includes(capability);
}
