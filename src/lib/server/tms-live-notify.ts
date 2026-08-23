import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { untypedFrom } from "@/lib/supabase/untyped";
import { sendUserTelegramNotification, vnNow } from "@/lib/server/telegram-notify";
import { SITE_URL } from "@/lib/constants/site";

/**
 * Báo Telegram khi một vòng đấu kết thúc.
 *
 * Gọi sau mỗi lần nhập kết quả trận. Chỉ bắn khi trận vừa nhập là trận CUỐI
 * còn dang dở của vòng đó — nếu không thì mỗi trận một tin, kênh cộng đồng
 * thành bãi spam trong ngày thi đấu.
 *
 * Nuốt mọi lỗi: nhập kết quả không được hỏng vì Telegram.
 */
export async function notifyRoundCompleted(tournamentId: string, matchId: string): Promise<boolean> {
  try {
    const db = createAdminSupabaseClient();
    if (!db) return false;

    const { data: match } = (await untypedFrom(db, "tms_matches")
      .select("round, round_num")
      .eq("id", matchId)
      .maybeSingle()) as { data: { round: string; round_num: number } | null };
    if (!match) return false;

    // Còn trận nào của vòng này chưa đá xong thì chưa phải lúc báo.
    const { count: pending } = (await untypedFrom(db, "tms_matches")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", tournamentId)
      .eq("round_num", match.round_num)
      .in("status", ["pending", "playing"])) as { count: number | null };
    if ((pending ?? 0) > 0) return false;

    const { data: tournament } = (await untypedFrom(db, "tms_tournaments")
      .select("name, slug")
      .eq("id", tournamentId)
      .maybeSingle()) as { data: { name: string; slug: string } | null };
    if (!tournament) return false;

    // Chỉ nhúng team_a/team_b (hai khoá ngoại đã dùng ở lib/tms/data.ts). Đội
    // thắng suy ra từ winner_id thay vì nhúng thêm một quan hệ nữa — bớt một
    // tên ràng buộc phải đoán đúng.
    const { data: results } = (await untypedFrom(db, "tms_matches")
      .select(
        "winner_id, team_a_id, team_b_id, team_a:tms_teams!tms_matches_team_a_id_fkey(name), team_b:tms_teams!tms_matches_team_b_id_fkey(name)",
      )
      .eq("tournament_id", tournamentId)
      .eq("round_num", match.round_num)
      .eq("status", "done")) as {
      data:
        | {
            winner_id: string | null;
            team_a_id: string;
            team_b_id: string;
            team_a: { name: string } | null;
            team_b: { name: string } | null;
          }[]
        | null;
    };

    const rows = (results ?? []).slice(0, 10).map((r) => {
      const winner =
        r.winner_id === r.team_a_id ? r.team_a?.name : r.winner_id === r.team_b_id ? r.team_b?.name : null;
      return {
        label: `${r.team_a?.name ?? "?"} vs ${r.team_b?.name ?? "?"}`,
        value: winner ? `🏆 ${winner}` : "—",
      };
    });

    await sendUserTelegramNotification({
      title: `🏁 XONG ${match.round.toUpperCase()}`,
      subtitle: `${tournament.name} · ${vnNow()} (ICT)`,
      sections: rows.length > 0 ? [{ rows }] : [],
      actions: [
        { label: "📺 Xem trực tiếp", url: `${SITE_URL}/tournaments/${tournament.slug}/live` },
        { label: "📊 Bảng xếp hạng", url: `${SITE_URL}/tournaments/${tournament.slug}/leaderboard` },
      ],
      footer: `✨ ${new URL(SITE_URL).hostname}`,
    });

    return true;
  } catch {
    return false;
  }
}
