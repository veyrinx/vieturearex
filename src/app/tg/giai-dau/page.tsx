import { siteConfig } from "@/lib/constants/site";
import { getTmsTournaments } from "@/lib/tms/data";
import type { TmsTournamentStatus } from "@/lib/tms/types";
import { Mi } from "../_components/mi";

const STATUS: Record<TmsTournamentStatus, { label: string; color: string }> = {
  draft: { label: "Nháp", color: "#8b8b8b" },
  registering: { label: "Đang mở đăng ký", color: "#10b981" },
  ongoing: { label: "Đang diễn ra", color: "#f59e0b" },
  finished: { label: "Đã kết thúc", color: "#8b8b8b" },
  cancelled: { label: "Đã hủy", color: "#ef4444" },
};

const SERVER_LABEL: Record<string, string> = { vn: "VN", sg: "SG", global: "Global" };

function fmtDate(s: string | null): string {
  if (!s) return "";
  const d = new Date(s);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}

export default async function TgTournamentsPage() {
  const tournaments = await getTmsTournaments().catch(() => []);

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <Mi name="emoji_events" size={22} fill={1} color="#f59e0b" />
        <h1 className="text-base font-bold">Giải đấu</h1>
      </div>

      {tournaments.length === 0 ? (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #1c1c1f)" }}
        >
          <p className="text-sm" style={{ color: "var(--tg-theme-hint-color, #8b8b8b)" }}>
            Chưa có giải đấu nào. Theo dõi để không bỏ lỡ nhé!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {tournaments.map((t) => {
            const st = STATUS[t.status] ?? STATUS.finished;
            return (
              <a
                key={t.id}
                href={`${siteConfig.url}/tournaments/${t.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl p-3.5 transition-transform active:scale-[0.98]"
                style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #1c1c1f)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-bold">{t.name}</p>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ backgroundColor: `${st.color}22`, color: st.color }}
                  >
                    {st.label}
                  </span>
                </div>

                <div
                  className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]"
                  style={{ color: "var(--tg-theme-hint-color, #8b8b8b)" }}
                >
                  <span className="inline-flex items-center gap-1">
                    <Mi name="groups" size={13} /> {t.mode} · {t.team_size} người
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Mi name="public" size={13} /> {SERVER_LABEL[t.server] ?? t.server}
                  </span>
                  {(t.start_at || t.end_at) && (
                    <span className="inline-flex items-center gap-1">
                      <Mi name="calendar_month" size={13} />
                      {fmtDate(t.start_at)}{t.end_at ? ` – ${fmtDate(t.end_at)}` : ""}
                    </span>
                  )}
                </div>

                {t.prize_pool && (
                  <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: "#f59e0b" }}>
                    <Mi name="paid" size={13} fill={1} /> {t.prize_pool}
                  </p>
                )}
              </a>
            );
          })}
        </div>
      )}

      <a
        href={`${siteConfig.url}/tournaments`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold"
        style={{
          backgroundColor: "var(--tg-theme-button-color, #f97316)",
          color: "var(--tg-theme-button-text-color, #fff)",
        }}
      >
        <Mi name="open_in_new" size={16} /> Xem tất cả trên web
      </a>
    </div>
  );
}
