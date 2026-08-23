import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/api-guard";
import {
  getTmsTournament,
  getTmsMatches,
  getTmsTeamLeaderboard,
} from "@/lib/tms/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/tms/live/[slug]
 *
 * Ảnh chụp một giải cho trang xem trực tiếp: trận đang đá, trận sắp tới, kết
 * quả vừa xong và bảng xếp hạng đội.
 *
 * Trang gọi lại mỗi 20s (usePolling — tự dừng khi tab ẩn) nên phải nhẹ: chỉ
 * trả đúng những trường bảng live hiển thị, không kèm chi tiết từng người chơi.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const limited = enforceRateLimit(request, { name: "tms-live", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const { slug } = await params;
  const tournament = await getTmsTournament(slug).catch(() => null);
  if (!tournament) {
    return NextResponse.json({ error: "Không tìm thấy giải." }, { status: 404 });
  }

  const [matches, standings] = await Promise.all([
    getTmsMatches(tournament.id).catch(() => []),
    getTmsTeamLeaderboard(tournament.id).catch(() => []),
  ]);

  const byRound = new Map<number, typeof matches>();
  for (const m of matches) {
    const list = byRound.get(m.round_num) ?? [];
    list.push(m);
    byRound.set(m.round_num, list);
  }

  // Vòng "đang diễn ra" = vòng nhỏ nhất còn trận chưa đá xong. Suy ra từ dữ
  // liệu thay vì thêm một cột trạng thái phải nhớ cập nhật bằng tay.
  const rounds = [...byRound.keys()].sort((a, b) => a - b);
  const currentRound =
    rounds.find((r) => (byRound.get(r) ?? []).some((m) => m.status === "pending" || m.status === "playing")) ??
    rounds[rounds.length - 1] ??
    null;

  const slim = (m: (typeof matches)[number]) => ({
    id: m.id,
    round: m.round,
    round_num: m.round_num,
    status: m.status,
    scheduled_at: m.scheduled_at,
    team_a: m.team_a?.name ?? null,
    team_a_logo: m.team_a?.logo_url ?? null,
    team_b: m.team_b?.name ?? null,
    team_b_logo: m.team_b?.logo_url ?? null,
    winner_id: m.winner_id,
    team_a_id: m.team_a_id,
    team_b_id: m.team_b_id,
  });

  const playing = matches.filter((m) => m.status === "playing").map(slim);
  const upcoming = matches
    .filter((m) => m.status === "pending")
    .sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""))
    .slice(0, 8)
    .map(slim);
  // Xếp theo giờ thi đấu, thiếu thì lấy giờ tạo trận — `tms_matches` có
  // updated_at trong DB nhưng type TmsMatch không phơi ra, và giờ thi đấu mới
  // là thứ khán giả hiểu.
  const doneKey = (m: (typeof matches)[number]) => m.scheduled_at ?? m.created_at ?? "";
  const recent = matches
    .filter((m) => m.status === "done")
    .sort((a, b) => doneKey(b).localeCompare(doneKey(a)))
    .slice(0, 8)
    .map(slim);

  return NextResponse.json({
    tournament: {
      id: tournament.id,
      name: tournament.name,
      slug: tournament.slug,
      status: tournament.status,
      banner_url: tournament.banner_url,
    },
    currentRound,
    roundLabel: currentRound !== null ? byRound.get(currentRound)?.[0]?.round ?? null : null,
    playing,
    upcoming,
    recent,
    standings: standings.slice(0, 16),
    fetchedAt: new Date().toISOString(),
  });
}
