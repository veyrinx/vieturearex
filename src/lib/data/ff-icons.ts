// Nguồn icon Free Fire đầy đủ (~33k) từ repo ShahGCreator/icon.
// Ảnh phục vụ qua raw.githubusercontent; danh sách ID lấy từ GitHub tree API (cache).

// Nguồn gốc ảnh trên GitHub (dùng bởi route proxy)
export const ICON_UPSTREAM = "https://raw.githubusercontent.com/ShahGCreator/icon/main/PNG/";

// Link ảnh phục vụ NGƯỜI DÙNG đi qua domain của site (proxy + cache edge)
export const ICON_CDN = "/api/ff-icon/";

export const iconUrl = (id: string) => `${ICON_CDN}${id}.png`;

export function isValidIconId(id: string): boolean {
  return /^[A-Za-z0-9_-]{1,64}$/.test(id);
}

type GhTreeEntry = { path: string; type: string };
type GhTree = { tree?: GhTreeEntry[]; truncated?: boolean };

const TREE_API = "https://api.github.com/repos/ShahGCreator/icon/git/trees/main?recursive=1";
const TTL = 60 * 60 * 1000; // 1 giờ

let cache: { ids: string[]; ts: number } | null = null;

/** Toàn bộ ID icon trong repo (cache 1h, fallback về cache cũ nếu GitHub lỗi). */
export async function getAllIconIds(): Promise<string[]> {
  if (cache && Date.now() - cache.ts < TTL) return cache.ids;
  try {
    const res = await fetch(TREE_API, {
      headers: { "User-Agent": "arex-network", Accept: "application/vnd.github+json" },
      // Response ~10MB > giới hạn 2MB của Next data cache → tự lo bằng cache in-memory ở trên.
      cache: "no-store",
    });
    if (!res.ok) return cache?.ids ?? [];
    const data = (await res.json()) as GhTree;
    const ids = (data.tree ?? [])
      .filter((t) => t.type === "blob" && t.path.startsWith("PNG/") && t.path.endsWith(".png"))
      .map((t) => t.path.slice(4, -4)); // bỏ "PNG/" và ".png"
    if (ids.length) cache = { ids, ts: Date.now() };
    return cache?.ids ?? ids;
  } catch {
    return cache?.ids ?? [];
  }
}
