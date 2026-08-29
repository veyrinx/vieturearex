import "server-only";
import { redirect } from "next/navigation";
import { getAuthContext, type AuthContext } from "@/lib/server/auth";
import { getSettings } from "@/lib/data/content-service";
import {
  BUILTIN_ROLE_LEVELS,
  getResolvedRoles,
  getRoleLevel,
  hasCapabilityWithRoles,
  parseRoleCapabilities,
  type CapabilityKey,
} from "@/lib/permissions";
import { adminNavGroups } from "@/lib/constants/admin-nav";
import { canAccessAdminRoute, type AdminAccessContext } from "@/lib/constants/admin-routes";

/**
 * Quyền của người đang đứng trong /admin, gom một lần cho cả layout lẫn trang.
 *
 * Sidebar, bảng "truy cập nhanh" và Ctrl-K đều lấy danh sách đường dẫn từ đây,
 * nên một quản trị viên chỉ nhìn thấy đúng những khu vực họ được cấp — thay vì
 * thấy đủ mọi mục rồi ăn chuyển hướng khi bấm vào.
 *
 * Đây là lớp HIỂN THỊ. Lớp chặn thật nằm ở `src/middleware.ts` (chặn trước khi
 * trang kịp render) và ở từng API (`enforceAdminApiAuth({ capability })`).
 */
export type AdminAccess = AdminAccessContext & {
  auth: AuthContext;
  can: (capability: CapabilityKey) => boolean;
  canRoute: (pathname: string) => boolean;
};

export async function getAdminAccess(auth?: AuthContext): Promise<AdminAccess> {
  const ctx = auth ?? (await getAuthContext());

  let customRaw: string | null = null;
  let matrixRaw: string | null = null;
  try {
    const settings = await getSettings();
    customRaw = settings.find((s) => s.key === "permissions.custom_roles")?.value ?? null;
    matrixRaw = settings.find((s) => s.key === "permissions.role_capabilities")?.value ?? null;
  } catch {
    // Không đọc được settings → rơi về ma trận mặc định trong permissions.ts.
  }

  const resolved = getResolvedRoles(customRaw, matrixRaw);
  const matrix = parseRoleCapabilities(matrixRaw);
  const level =
    getRoleLevel(ctx.role, resolved) ||
    (BUILTIN_ROLE_LEVELS as Record<string, number>)[ctx.role] ||
    0;

  const base: AdminAccessContext = { role: ctx.role, level, matrix, resolved };

  return {
    ...base,
    auth: ctx,
    can: (capability) => hasCapabilityWithRoles(ctx.role, capability, matrix, resolved),
    canRoute: (pathname) => canAccessAdminRoute(pathname, base),
  };
}

/** Đường dẫn trong menu admin mà người này được vào — truyền xuống client để lọc. */
export function allowedAdminHrefs(access: AdminAccess): string[] {
  return adminNavGroups
    .flatMap((g) => g.items.map((i) => i.href))
    .filter((href) => access.canRoute(href));
}

/**
 * Chốt cho từng trang admin nhạy cảm. Layout gọi `requireAdminAccess()` lo phần
 * "có phải người của nhà không"; hàm này lo phần "có được cấp khu vực này không".
 * Phải gọi TRONG page — layout và page render song song, chuyển hướng ở layout
 * không kịp chặn dữ liệu của page chảy ra RSC stream.
 */
export async function requireAdminCapability(capability: CapabilityKey): Promise<AdminAccess> {
  const access = await getAdminAccess();
  if (!access.auth.userId) redirect("/auth/login?next=/admin");
  if (!access.can(capability)) redirect("/admin?error=forbidden");
  return access;
}
