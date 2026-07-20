import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import type { FfResponse } from "@/lib/server/ff-api";

/**
 * BXH nick khủng tự động — chỉ tài khoản VN.
 * Mỗi lần tra cứu 1 nick VN, tự chấm điểm từ dữ liệu THẬT và upsert vào bảng
 * ff_auto_scores (cần chạy migration-ff-auto-scores.sql trước).
 */

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Điểm "độ khủng" từ dữ liệu thật (level, likes, exp, rank BR). */
export function computeKhungScore(a: {
  level?: unknown;
  likes?: unknown;
  exp?: unknown;
  brRankPoint?: unknown;
}): number {
  const level = toNum(a.level);
  const likes = toNum(a.likes);
  const exp = toNum(a.exp);
  const rank = toNum(a.brRankPoint);
  return Math.round(level * 3 + likes / 20 + exp / 2000 + rank / 20);
}

/** Có phải region Việt Nam không (API trả "VN"). */
function isVn(region: unknown): boolean {
  return typeof region === "string" && region.trim().toUpperCase() === "VN";
}

/**
 * Ghi nhận 1 nick VN vào BXH tự động. An toàn: nuốt mọi lỗi (vd bảng chưa tạo)
 * để KHÔNG ảnh hưởng luồng tra cứu.
 */
export async function recordVnAccount(ffId: string, res: FfResponse | null): Promise<void> {
  try {
    const a = res?.result?.AccountInfo as Record<string, unknown> | undefined;
    if (!a || !isVn(a.AccountRegion)) return; // chỉ VN

    const db = createAdminSupabaseClient();
    if (!db) return;

    const score = computeKhungScore({
      level: a.AccountLevel,
      likes: a.AccountLikes,
      exp: a.AccountEXP,
      brRankPoint: a.BrRankPoint,
    });

    // Tăng lookups bằng cách đọc giá trị hiện tại (best-effort).
    const { data: existing } = (await untypedFrom(db, "ff_auto_scores")
      .select("lookups")
      .eq("ff_id", ffId)
      .maybeSingle()) as { data: { lookups: number | null } | null };

    await untypedFrom(db, "ff_auto_scores").upsert(
      {
        ff_id: ffId,
        nickname: (a.AccountName as string) ?? null,
        region: "VN",
        level: toNum(a.AccountLevel),
        likes: toNum(a.AccountLikes),
        exp: toNum(a.AccountEXP),
        br_rank_point: toNum(a.BrRankPoint),
        score,
        lookups: (existing?.lookups ?? 0) + 1,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "ff_id" },
    );
  } catch {
    // im lặng — không chặn tra cứu
  }
}
