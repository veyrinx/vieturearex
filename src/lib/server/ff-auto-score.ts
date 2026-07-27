import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import type { FfResponse } from "@/lib/server/ff-api";
import { sendTelegramNotification, vnNow } from "@/lib/server/telegram-notify";
import { siteConfig } from "@/lib/constants/site";

/** Chỉ báo khi lọt vào top này của BXH nick khủng VN. */
const RANKUP_TOP_N = 10;

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

    // Đọc giá trị hiện tại để tăng lookups + biết điểm cũ (best-effort).
    const { data: existing } = (await untypedFrom(db, "ff_auto_scores")
      .select("lookups, score")
      .eq("ff_id", ffId)
      .maybeSingle()) as { data: { lookups: number | null; score: number | null } | null };

    const prevScore = existing?.score ?? null;

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

    // Điểm chỉ đổi khi chỉ số thật của nick tăng → không spam mỗi lần tra lại.
    if (prevScore === null || score > prevScore) {
      void notifyRankUp(ffId, (a.AccountName as string) ?? null, score, prevScore).catch(() => null);
    }
  } catch {
    // im lặng — không chặn tra cứu
  }
}

/**
 * Bắn thông báo Telegram khi 1 nick vừa lọt / leo vào Top N BXH nick khủng VN.
 * Best-effort, tự nuốt lỗi — không ảnh hưởng luồng tra cứu.
 */
async function notifyRankUp(
  ffId: string,
  nickname: string | null,
  score: number,
  prevScore: number | null,
): Promise<void> {
  const db = createAdminSupabaseClient();
  if (!db) return;

  // Hạng mới = số nick VN điểm cao hơn + 1 (không tính chính nó).
  const { count } = (await untypedFrom(db, "ff_auto_scores")
    .select("ff_id", { count: "exact", head: true })
    .eq("region", "VN")
    .gt("score", score)) as { count: number | null };

  const rank = (count ?? 0) + 1;
  if (rank > RANKUP_TOP_N) return;

  await sendTelegramNotification({
    title: "🚀 LÊN HẠNG BXH NICK KHỦNG VN",
    subtitle: vnNow(),
    sections: [{
      icon: "🏆",
      heading: `Top ${rank}`,
      rows: [
        { label: "Nick", value: nickname || `FF ${ffId}`, bold: true },
        { label: "UID", value: ffId, mono: true },
        { label: "Điểm", value: score.toLocaleString("vi-VN"), status: "ok" },
        ...(prevScore !== null ? [{ label: "Trước đó", value: prevScore.toLocaleString("vi-VN") }] : []),
      ],
    }],
    actions: [{ label: "Xem BXH", url: `${siteConfig.url}/top-players-vn` }],
    footer: "🏅 BXH nick khủng — Arex",
  });
}
