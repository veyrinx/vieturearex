import "server-only";
import { getSettings } from "@/lib/data/content-service";
import { getFeatureLocks } from "@/lib/server/feature-locks";
import { findFeatureLock } from "@/lib/constants/feature-locks";
import { TOOLS } from "@/lib/constants/tools";
import { adminNavFlat } from "@/lib/constants/admin-nav";
import {
  parseProjects,
  resolveProject,
  SETTINGS_KEY_PROJECTS,
  type Project,
  type ResolvedProject,
} from "@/lib/constants/projects";

// ── "Code signal": tập route mà web thực sự đã có ──────────────────────────
// Suy ra tự động từ nguồn dữ liệu sẵn có (TOOLS + điều hướng admin) + vài route
// lõi. Thêm 1 công cụ vào TOOLS là dự án tương ứng tự nhảy tiến độ.
const CORE_ROUTES = [
  "/",
  "/cong-cu",
  "/tin-tuc",
  "/su-kien",
  "/esports",
  "/thu-vien",
  "/wiki",
  "/vu-khi",
  "/nhan-vat",
  "/tournaments",
  "/dien-dan",
  "/bang-xep-hang",
  "/lich-noi-dung",
  "/tra-cuu-nick",
  "/so-sanh-nick",
  "/bxh-nick-vn",
  "/bxh-nick",
  "/dinh-gia-nick",
  "/quiz",
  "/cua-hang-prime",
  "/tiktok",
];

function buildKnownRoutes(): Set<string> {
  const set = new Set<string>();
  for (const t of TOOLS) set.add(t.href);
  for (const item of adminNavFlat) set.add(item.href);
  for (const r of CORE_ROUTES) set.add(r);
  return set;
}

const KNOWN_ROUTES = buildKnownRoutes();

/** Route có tồn tại trong codebase không (khớp chính xác hoặc là route con). */
export function routeExists(path: string | undefined): boolean {
  if (!path) return false;
  const p = path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
  if (KNOWN_ROUTES.has(p)) return true;
  // route con của 1 route đã biết (vd /wiki/xxx)
  for (const known of KNOWN_ROUTES) {
    if (known.length > 1 && p.startsWith(known + "/")) return true;
  }
  return false;
}

/** Đọc danh sách dự án thô từ settings. */
export async function getProjects(): Promise<Project[]> {
  try {
    const settings = await getSettings();
    const row = settings.find((s) => s.key === SETTINGS_KEY_PROJECTS);
    return parseProjects(row?.value ?? null);
  } catch {
    return [];
  }
}

/** Danh sách dự án đã gắn trạng thái + tiến độ tự tính (code ⇄ web). */
export async function getResolvedProjects(): Promise<ResolvedProject[]> {
  const [projects, locks] = await Promise.all([getProjects(), getFeatureLocks()]);
  return projects.map((p) =>
    resolveProject(p, routeExists(p.path), p.path ? findFeatureLock(p.path, locks) : null),
  );
}
