import "server-only";
import { sendUserTelegramNotification, vnNow } from "./telegram-notify";
import { formatVietnamDateTime } from "@/lib/utils/vietnam-time";

// ── Sự kiện mới ───────────────────────────────────────────────────────────────

interface EventInfo {
  id: string;
  title: string;
  description?: string | null;
  start_date: string;
  end_date?: string | null;
  status: string;
  link?: string | null;
  server_region?: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  active:   "🔴 Đang diễn ra",
  upcoming: "🟢 Sắp diễn ra",
  expired:  "⚫ Đã kết thúc",
};

export function notifyUserNewEvent(event: EventInfo, siteUrl: string) {
  const dateRow = event.end_date && event.end_date !== event.start_date
    ? `${formatVietnamDateTime(event.start_date)} → ${formatVietnamDateTime(event.end_date)}`
    : formatVietnamDateTime(event.start_date);

  const payload = {
    title: "🎮 SỰ KIỆN MỚI!",
    subtitle: `Đăng lúc ${vnNow()} (ICT)`,
    sections: [
      {
        rows: [
          { label: "📌 Tên", value: event.title, bold: true },
          { label: "🗓 Thời gian", value: dateRow },
          { label: "Trạng thái", value: STATUS_LABEL[event.status] ?? event.status },
          ...(event.server_region ? [{ label: "🌐 Server", value: event.server_region }] : []),
          ...(event.description ? [{ label: "📋 Mô tả", value: event.description.slice(0, 200) + (event.description.length > 200 ? "…" : "") }] : []),
        ],
      },
    ],
    actions: [
      { label: "👉 Xem chi tiết", url: `${siteUrl}/events/${event.id}` },
      ...(event.link ? [{ label: "🔗 Tham gia ngay", url: event.link }] : []),
    ],
    footer: `✨ ${new URL(siteUrl).hostname}`,
  };

  return sendUserTelegramNotification(payload).catch(() => null);
}

// ── Bài viết mới ─────────────────────────────────────────────────────────────

interface ArticleInfo {
  slug: string;
  title: string;
  excerpt?: string | null;
  category?: string | null;
}

export function notifyUserNewArticle(article: ArticleInfo, siteUrl: string) {
  const payload = {
    title: "📰 BÀI VIẾT MỚI!",
    subtitle: `Đăng lúc ${vnNow()} (ICT)`,
    sections: [
      {
        rows: [
          ...(article.category ? [{ label: "🏷 Chuyên mục", value: article.category }] : []),
          { label: "📌 Tiêu đề", value: article.title, bold: true },
          ...(article.excerpt ? [{ label: "💬 Tóm tắt", value: article.excerpt.slice(0, 250) + (article.excerpt.length > 250 ? "…" : "") }] : []),
        ],
      },
    ],
    actions: [
      { label: "👉 Đọc ngay", url: `${siteUrl}/news/${article.slug}` },
    ],
    footer: `✨ ${new URL(siteUrl).hostname}`,
  };

  return sendUserTelegramNotification(payload).catch(() => null);
}

// ── Giải đấu bắt đầu ─────────────────────────────────────────────────────────

interface TournamentInfo {
  id: string;
  name: string;
  slug: string;
  mode: string;
  prize_pool?: string | null;
  start_at?: string | null;
}

export function notifyUserTournamentStart(tournament: TournamentInfo, siteUrl: string) {
  const payload = {
    title: "🏆 GIẢI ĐẤU BẮT ĐẦU!",
    subtitle: `Thông báo lúc ${vnNow()} (ICT)`,
    sections: [{
      rows: [
        { label: "🏆 Tên", value: tournament.name, bold: true },
        { label: "🎮 Thể thức", value: tournament.mode.toUpperCase() },
        ...(tournament.prize_pool ? [{ label: "💰 Giải thưởng", value: tournament.prize_pool }] : []),
        ...(tournament.start_at ? [{ label: "🗓 Thời gian", value: formatVietnamDateTime(tournament.start_at) }] : []),
      ],
    }],
    actions: [{ label: "👉 Xem giải đấu", url: `${siteUrl}/tournaments/${tournament.slug}` }],
    footer: `🏆 ${new URL(siteUrl).hostname}`,
  };
  return sendUserTelegramNotification(payload).catch(() => null);
}

// ── Kết quả trận đấu ─────────────────────────────────────────────────────────

interface MatchResultInfo {
  round: string;
  round_num: number;
  team_a_name: string;
  team_b_name: string;
  winner_name: string;
  tournament_slug: string;
}

export function notifyUserMatchResult(match: MatchResultInfo, siteUrl: string) {
  const payload = {
    title: "⚔️ KẾT QUẢ TRẬN ĐẤU",
    subtitle: vnNow(),
    sections: [{
      rows: [
        { label: "🥊 Trận", value: `${match.team_a_name} vs ${match.team_b_name}`, bold: true },
        { label: "🏅 Vòng", value: `${match.round} #${match.round_num}` },
        { label: "🏆 Thắng", value: match.winner_name, status: "ok" as const },
      ],
    }],
    actions: [{ label: "👉 Xem giải đấu", url: `${siteUrl}/tournaments/${match.tournament_slug}` }],
    footer: `🏆 ${new URL(siteUrl).hostname}`,
  };
  return sendUserTelegramNotification(payload).catch(() => null);
}

// ── Free Fire version mới ─────────────────────────────────────────────────────

export function notifyUserFFVersion(
  version: string,
  accessibleLinks: string[],
  siteUrl: string,
) {
  const linkRows = accessibleLinks.slice(0, 3).map((url, i) => ({
    label: `Link ${i + 1}`,
    value: url,
    mono: true,
    status: "ok" as const,
  }));

  const payload = {
    title: "🎮 FREE FIRE CẬP NHẬT!",
    subtitle: `Phiên bản mới phát hiện lúc ${vnNow()} (ICT)`,
    sections: [
      {
        rows: [
          { label: "📦 Phiên bản", value: version, mono: true, bold: true },
          { label: "🌐 Nguồn", value: "Google Play Store (VN)" },
        ],
      },
      ...(linkRows.length > 0
        ? [{
            icon: "📥",
            heading: `Link tải trực tiếp (${linkRows.length} link)`,
            rows: linkRows,
          }]
        : [{
            rows: [{ label: "📥 Link tải", value: "Đang cập nhật — theo dõi để nhận thông báo khi có link trực tiếp", status: "info" as const }],
          }]
      ),
    ],
    actions: [
      { label: "▶️ Tải trên Google Play", url: "https://play.google.com/store/apps/details?id=com.dts.freefireth&hl=vi" },
      { label: "🌐 Xem trên web", url: siteUrl },
    ],
    footer: `🎮 ${new URL(siteUrl).hostname}`,
  };

  return sendUserTelegramNotification(payload).catch(() => null);
}
