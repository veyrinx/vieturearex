import { getStreams } from "@/lib/server/stream-service";
import { siteConfig } from "@/lib/constants/site";
import type { StreamItem } from "@/lib/types/content";

function StreamCard({ item }: { item: StreamItem }) {
  const isLive = item.status === "live";
  const isUpcoming = item.status === "upcoming";
  const dateStr = new Date(item.scheduled_at).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "short",
  });

  const youtubeId = (() => {
    try {
      const u = new URL(item.youtube_url);
      return u.searchParams.get("v") ?? u.pathname.split("/").pop() ?? "";
    } catch { return ""; }
  })();

  return (
    <a
      href={item.youtube_url}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-2xl overflow-hidden active:opacity-70 transition-opacity block"
      style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #111)" }}
    >
      {/* Thumbnail */}
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.thumbnail_url || (youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : "")}
          alt={item.title}
          className="w-full aspect-video object-cover"
        />
        {isLive && (
          <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
            <span className="size-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </span>
        )}
        {isUpcoming && (
          <span className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">
            SẮP CHIẾU
          </span>
        )}
      </div>
      <div className="p-3 space-y-1">
        <p className="text-sm font-semibold line-clamp-2 leading-snug">{item.title}</p>
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: "rgba(249,115,22,0.15)", color: "#f97316" }}
          >
            {item.category}
          </span>
          <span className="text-[10px]" style={{ color: "var(--tg-theme-hint-color, #888)" }}>
            {dateStr}
          </span>
        </div>
      </div>
    </a>
  );
}

export default async function TgStreamPage() {
  const streams = await getStreams();
  const live = streams.filter((s) => s.status === "live");
  const upcoming = streams.filter((s) => s.status === "upcoming");
  const ended = streams.filter((s) => s.status === "ended").slice(0, 5);

  return (
    <div className="flex flex-col gap-4 p-4 pb-6">
      <h1 className="font-bold text-base">Livestream</h1>

      {live.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: "#ef4444" }}>
            <span className="size-2 rounded-full bg-red-500 animate-pulse" />
            Đang phát trực tiếp
          </p>
          {live.map((s) => <StreamCard key={s.id} item={s} />)}
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs font-bold" style={{ color: "var(--tg-theme-hint-color, #888)" }}>
            Sắp chiếu
          </p>
          {upcoming.map((s) => <StreamCard key={s.id} item={s} />)}
        </section>
      )}

      {live.length === 0 && upcoming.length === 0 && ended.length === 0 && (
        <p className="text-center text-sm py-10" style={{ color: "var(--tg-theme-hint-color, #888)" }}>
          Chưa có stream nào.
        </p>
      )}

      {ended.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs font-bold" style={{ color: "var(--tg-theme-hint-color, #888)" }}>
            Đã phát
          </p>
          {ended.map((s) => <StreamCard key={s.id} item={s} />)}
        </section>
      )}

      <a
        href={`${siteConfig.url}/esports`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-center text-xs py-3 rounded-xl"
        style={{ color: "var(--tg-theme-link-color, #f97316)" }}
      >
        Xem thêm trên web →
      </a>
    </div>
  );
}
