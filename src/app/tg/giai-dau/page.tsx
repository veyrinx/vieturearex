import { siteConfig } from "@/lib/constants/site";
import { Trophy, ExternalLink } from "lucide-react";

export default function TgTournamentsPage() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="font-bold text-base">Giải đấu</h1>
      <div
        className="rounded-2xl p-6 flex flex-col items-center gap-4 text-center"
        style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #111)" }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: "#f59e0b22" }}
        >
          <Trophy size={32} style={{ color: "#f59e0b" }} />
        </div>
        <div>
          <p className="font-bold text-base">Bracket & Kết quả</p>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--tg-theme-hint-color, #888)" }}
          >
            Xem lịch thi đấu, kết quả và bracket giải đấu Free Fire đầy đủ trên trang web.
          </p>
        </div>
        <a
          href={`${siteConfig.url}/tournaments`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm w-full justify-center"
          style={{
            backgroundColor: "var(--tg-theme-button-color, #f97316)",
            color: "var(--tg-theme-button-text-color, #fff)",
          }}
        >
          <ExternalLink size={16} />
          Mở trên web
        </a>
      </div>
    </div>
  );
}
