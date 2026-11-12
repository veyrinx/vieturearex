import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { enforceAdminApiAuth, enforceRateLimit } from "@/lib/server/api-guard";
import { ICON_BUCKET, ICON_UPSTREAMS, storageIconUrl } from "@/lib/data/ff-icons";
import { isValidItemId } from "@/lib/constants/ff-items-import";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Tải icon từ GitHub về Supabase Storage.
 *
 * Ba chỗ sửa so với bản cũ:
 *
 *  1. Lô 20 ID mỗi lượt gọi. Kho có hơn ba vạn ảnh → hơn 1.700 lượt gọi HTTP
 *     từ trình duyệt, chưa kể trần tốc độ 30 lượt/phút chặn ngay ở lô thứ 31.
 *     Nâng lên 200.
 *  2. Mỗi ID hỏi Storage một lượt `list()` chỉ để xem ảnh có sẵn chưa. `list()`
 *     là truy vấn có xác thực vào API Storage; đổi sang HEAD lên URL công khai
 *     — cùng một câu hỏi nhưng đi qua CDN, và nằm chung hàng đợi giới hạn đồng
 *     thời với phần tải ảnh.
 *  3. `Promise.all` bắn cả lô đi cùng lúc: 200 lượt tải song song thì
 *     raw.githubusercontent cắt kết nối, mà lỗi đó lại bị đếm thành "ảnh
 *     không tồn tại". Giới hạn số việc chạy đồng thời.
 */

const BATCH_MAX = 200;
/** Số ảnh tải cùng lúc. Cao hơn nữa là GitHub bắt đầu ngắt giữa chừng. */
const CONCURRENCY = 8;

type SyncResult = { id: string; ok: boolean; url?: string; error?: string; skipped?: boolean };

/** Chạy `worker` trên cả danh sách nhưng không quá `limit` việc cùng lúc. */
async function mapLimit<T, R>(list: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(list.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, list.length) }, async () => {
    for (;;) {
      const i = cursor++;
      if (i >= list.length) return;
      out[i] = await worker(list[i]);
    }
  });
  await Promise.all(runners);
  return out;
}

// POST { ids: string[], overwrite?: boolean } — tải ảnh từ GitHub, đẩy lên Storage.
export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { name: "ff-items-sync", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const denied = await enforceAdminApiAuth({ minimumRole: "admin" });
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as { ids?: string[]; overwrite?: boolean } | null;
  const ids = Array.from(
    new Set((body?.ids ?? []).map((x) => String(x).trim()).filter(isValidItemId)),
  ).slice(0, BATCH_MAX);
  const overwrite = !!body?.overwrite;

  if (ids.length === 0) {
    return NextResponse.json({ error: "Cần ít nhất 1 ID" }, { status: 400 });
  }

  const db = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: "Supabase unavailable" }, { status: 503 });

  const { data: buckets } = await db.storage.listBuckets();
  if (!buckets?.some((b) => b.name === ICON_BUCKET)) {
    await db.storage.createBucket(ICON_BUCKET, { public: true });
  }

  /** Ảnh đã nằm trong bucket chưa — hỏi qua URL công khai, khỏi tốn một truy vấn API. */
  const alreadyStored = async (id: string): Promise<boolean> => {
    const url = storageIconUrl(id);
    if (!url) return false;
    try {
      const res = await fetch(url, { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(8_000) });
      return res.ok;
    } catch {
      return false;
    }
  };

  const results = await mapLimit<string, SyncResult>(ids, CONCURRENCY, async (id) => {
    const objectPath = `${id}.png`;
    try {
      if (!overwrite && (await alreadyStored(id))) {
        const { data: pub } = db.storage.from(ICON_BUCKET).getPublicUrl(objectPath);
        return { id, ok: true, url: pub.publicUrl, skipped: true };
      }

      // KingofGames02 trước (đồ mới ra), rồi ShahGCreator.
      let png: ArrayBuffer | null = null;
      let lastStatus = 0;
      for (const upstream of ICON_UPSTREAMS) {
        const cdnRes = await fetch(`${upstream}${encodeURIComponent(id)}.png`, {
          cache: "no-store",
          signal: AbortSignal.timeout(15_000),
        }).catch(() => null);
        if (cdnRes?.ok) {
          png = await cdnRes.arrayBuffer();
          break;
        }
        lastStatus = cdnRes?.status ?? 0;
      }
      if (!png) return { id, ok: false, error: `CDN ${lastStatus || "lỗi mạng"}` };

      const uint8 = new Uint8Array(png);
      const { error: uploadErr } = await db.storage.from(ICON_BUCKET).upload(objectPath, uint8, {
        contentType: "image/png",
        upsert: true,
      });
      if (uploadErr) return { id, ok: false, error: uploadErr.message };

      const { data: pub } = db.storage.from(ICON_BUCKET).getPublicUrl(objectPath);
      return { id, ok: true, url: pub.publicUrl };
    } catch (err) {
      return { id, ok: false, error: String(err).slice(0, 120) };
    }
  });

  return NextResponse.json({
    results,
    summary: {
      total: ids.length,
      success: results.filter((r) => r.ok).length,
      skipped: results.filter((r) => r.skipped).length,
      failed: results.filter((r) => !r.ok).length,
    },
  });
}
