// Quản lý "dự án / phần sắp ra" trong admin.
// - Chỉ super_admin được thêm/sửa/xóa; admin & role thấp hơn CHỈ XEM.
// - Tiến độ TỰ TÍNH: đối chiếu "code" (route đã tồn tại chưa) với "web"
//   (route đang bị khóa coming-soon/maintenance hay đã mở cho người dùng).
// File này chỉ giữ kiểu + hàm thuần (dùng được cả client & server).

import type { FeatureLock } from "@/lib/constants/feature-locks";

export const SETTINGS_KEY_PROJECTS = "admin.projects";

export type ProjectPriority = "low" | "normal" | "high";

export type Project = {
  id: string;
  name: string;
  description?: string;
  /** Route đích, vd "/player-compare" — dùng để tự tính tiến độ. */
  path?: string;
  /** Nhóm hiển thị, vd "Công cụ", "Cộng đồng". */
  category?: string;
  /** Dự kiến ra mắt, vd "20/08/2026". */
  targetDate?: string;
  priority?: ProjectPriority;
  /** Ghi đè tiến độ thủ công (0-100) — chỉ dùng khi KHÔNG đặt path. */
  manualProgress?: number;
};

export type ProjectStatusKey =
  | "planning" // Lên kế hoạch — chưa có code
  | "in_progress" // Đang phát triển
  | "finishing" // Đang hoàn thiện
  | "locked" // Tạm khóa
  | "live"; // Đã ra mắt

export type ProjectStatusMeta = { label: string; color: string; progress: number };

// color: "text-x bg-x/10 border-x/20" — dùng cho badge.
export const PROJECT_STATUS_META: Record<ProjectStatusKey, ProjectStatusMeta> = {
  planning: { label: "Lên kế hoạch", color: "text-slate-500 bg-slate-500/10 border-slate-500/20", progress: 10 },
  in_progress: { label: "Đang phát triển", color: "text-amber-500 bg-amber-500/10 border-amber-500/20", progress: 40 },
  finishing: { label: "Đang hoàn thiện", color: "text-blue-500 bg-blue-500/10 border-blue-500/20", progress: 75 },
  locked: { label: "Tạm khóa", color: "text-rose-500 bg-rose-500/10 border-rose-500/20", progress: 60 },
  live: { label: "Đã ra mắt", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", progress: 100 },
};

export const PROJECT_PRIORITY_META: Record<ProjectPriority, { label: string; color: string }> = {
  low: { label: "Thấp", color: "text-muted-foreground bg-muted" },
  normal: { label: "Bình thường", color: "text-sky-500 bg-sky-500/10" },
  high: { label: "Cao", color: "text-rose-500 bg-rose-500/10" },
};

export type ResolvedProject = Project & {
  status: ProjectStatusKey;
  statusLabel: string;
  progress: number;
  /** "auto" = suy ra từ code+web; "manual" = dùng manualProgress. */
  source: "auto" | "manual";
};

const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function statusFromProgress(pct: number): ProjectStatusKey {
  if (pct >= 100) return "live";
  if (pct >= 60) return "finishing";
  if (pct >= 20) return "in_progress";
  return "planning";
}

/**
 * Tự tính trạng thái + tiến độ từ 2 tín hiệu:
 *  - routeExists: route đã có trong codebase (registry) chưa → tín hiệu "code".
 *  - lock: route đang bị khóa gì (nếu có) → tín hiệu "web".
 * Nếu dự án KHÔNG đặt path thì rơi về manualProgress.
 */
export function resolveProject(
  project: Project,
  routeExists: boolean,
  lock: FeatureLock | null,
): ResolvedProject {
  const path = project.path?.trim();

  if (!path) {
    const pct = clampPct(project.manualProgress ?? 0);
    const status = statusFromProgress(pct);
    return { ...project, status, statusLabel: PROJECT_STATUS_META[status].label, progress: pct, source: "manual" };
  }

  let status: ProjectStatusKey;
  if (!routeExists) {
    status = "planning";
  } else if (lock?.status === "coming-soon") {
    status = "in_progress";
  } else if (lock?.status === "maintenance") {
    status = "finishing";
  } else if (lock?.status === "locked") {
    status = "locked";
  } else {
    status = "live"; // có code + không khóa → người dùng vào được = đã ra mắt
  }

  const meta = PROJECT_STATUS_META[status];
  return { ...project, status, statusLabel: meta.label, progress: meta.progress, source: "auto" };
}

const uid = () => Math.random().toString(36).slice(2, 10);

// Parse + làm sạch giá trị đọc từ settings (JSON string) → danh sách dự án hợp lệ.
export function parseProjects(raw: string | null | undefined): Project[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const out: Project[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name.trim().slice(0, 120) : "";
    if (!name) continue;
    const path = typeof o.path === "string" && o.path.trim().startsWith("/") ? o.path.trim().slice(0, 120) : undefined;
    const priority: ProjectPriority | undefined =
      o.priority === "low" || o.priority === "normal" || o.priority === "high" ? o.priority : undefined;
    const manual = typeof o.manualProgress === "number" ? clampPct(o.manualProgress) : undefined;
    out.push({
      id: typeof o.id === "string" && o.id ? o.id.slice(0, 32) : uid(),
      name,
      description: typeof o.description === "string" ? o.description.slice(0, 500) : undefined,
      path,
      category: typeof o.category === "string" ? o.category.trim().slice(0, 60) : undefined,
      targetDate: typeof o.targetDate === "string" ? o.targetDate.trim().slice(0, 40) : undefined,
      priority,
      manualProgress: manual,
    });
    if (out.length >= 200) break;
  }
  return out;
}

export function serializeProjects(projects: Project[]): string {
  return JSON.stringify(
    projects.map((p) => ({
      id: p.id,
      name: p.name,
      ...(p.description ? { description: p.description } : {}),
      ...(p.path ? { path: p.path } : {}),
      ...(p.category ? { category: p.category } : {}),
      ...(p.targetDate ? { targetDate: p.targetDate } : {}),
      ...(p.priority ? { priority: p.priority } : {}),
      ...(typeof p.manualProgress === "number" ? { manualProgress: p.manualProgress } : {}),
    })),
  );
}
