"use client";

import { useState } from "react";
import { X, Eye, Users, ExternalLink } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { extractYouTubeId, buildEmbedUrl } from "@/lib/utils/stream-utils";
import type { StreamItem } from "@/lib/types/content";

type EnrichedStream = StreamItem & { view_count?: number; concurrent_viewers?: number };

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("vi-VN");
}

function EmbedPlayer({ stream, onClose }: { stream: EnrichedStream; onClose: () => void }) {
  const embedUrl = buildEmbedUrl(stream.youtube_url);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: "var(--tg-theme-secondary-bg-color,#111)" }}
    >
      {/* Player */}
      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
        <iframe
          src={embedUrl}
          title={stream.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
      {/* Info bar */}
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-semibold line-clamp-2 leading-snug">{stream.title}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {stream.status === "live" && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-red-500">
                <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
                LIVE
              </span>
            )}
            {stream.concurrent_viewers != null && (
              <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--tg-theme-hint-color,#888)" }}>
                <Users size={10} />
                {formatCount(stream.concurrent_viewers)} đang xem
              </span>
            )}
            {stream.view_count != null && stream.status !== "live" && (
              <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--tg-theme-hint-color,#888)" }}>
                <Eye size={10} />
                {formatCount(stream.view_count)} lượt xem
              </span>
            )}
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: "rgba(249,115,22,0.15)", color: "#f97316" }}
            >
              {stream.category}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={stream.youtube_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg"
            style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
            title="Mở YouTube"
          >
            <ExternalLink size={14} style={{ color: "var(--tg-theme-hint-color,#888)" }} />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg"
            style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
          >
            <X size={14} style={{ color: "var(--tg-theme-hint-color,#888)" }} />
          </button>
        </div>
      </div>
    </div>
  );
}

function StreamCard({
  item,
  active,
  onClick,
}: {
  item: EnrichedStream;
  active: boolean;
  onClick: () => void;
}) {
  const isLive = item.status === "live";
  const isUpcoming = item.status === "upcoming";
  const dateStr = new Date(item.scheduled_at).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "short",
  });
  const ytId = extractYouTubeId(item.youtube_url);
  const thumb = item.thumbnail_url || (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : "");

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-2xl overflow-hidden active:opacity-70 transition-opacity block"
      style={{
        backgroundColor: active
          ? "var(--tg-theme-button-color,#f97316)22"
          : "var(--tg-theme-secondary-bg-color,#111)",
        outline: active ? "2px solid var(--tg-theme-button-color,#f97316)" : "none",
      }}
    >
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumb} alt={item.title} className="w-full aspect-video object-cover" />
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
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
          <div className="size-10 rounded-full bg-white/20 flex items-center justify-center">
            <span className="ml-0.5 border-y-[7px] border-l-[12px] border-y-transparent border-l-white" />
          </div>
        </div>
      </div>
      <div className="p-3 space-y-1">
        <p className="text-sm font-semibold line-clamp-2 leading-snug">{item.title}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: "rgba(249,115,22,0.15)", color: "#f97316" }}
          >
            {item.category}
          </span>
          <span className="text-[10px]" style={{ color: "var(--tg-theme-hint-color,#888)" }}>
            {dateStr}
          </span>
          {item.concurrent_viewers != null && (
            <span className="flex items-center gap-0.5 text-[10px]" style={{ color: "#ef4444" }}>
              <Users size={9} />
              {formatCount(item.concurrent_viewers)}
            </span>
          )}
          {item.view_count != null && item.status !== "live" && (
            <span className="flex items-center gap-0.5 text-[10px]" style={{ color: "var(--tg-theme-hint-color,#888)" }}>
              <Eye size={9} />
              {formatCount(item.view_count)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function StreamClient({ streams }: { streams: EnrichedStream[] }) {
  const [selected, setSelected] = useState<EnrichedStream | null>(null);

  const live = streams.filter((s) => s.status === "live");
  const upcoming = streams.filter((s) => s.status === "upcoming");
  const ended = streams.filter((s) => s.status === "ended").slice(0, 8);

  const toggle = (item: EnrichedStream) =>
    setSelected((prev) => (prev?.id === item.id ? null : item));

  return (
    <div className="flex flex-col gap-4 p-4 pb-6">
      <h1 className="font-bold text-base">Livestream</h1>

      {/* Embedded player */}
      {selected && <EmbedPlayer stream={selected} onClose={() => setSelected(null)} />}

      {live.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: "#ef4444" }}>
            <span className="size-2 rounded-full bg-red-500 animate-pulse" />
            Đang phát trực tiếp
          </p>
          {live.map((s) => (
            <StreamCard key={s.id} item={s} active={selected?.id === s.id} onClick={() => toggle(s)} />
          ))}
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs font-bold" style={{ color: "var(--tg-theme-hint-color,#888)" }}>
            Sắp chiếu
          </p>
          {upcoming.map((s) => (
            <StreamCard key={s.id} item={s} active={selected?.id === s.id} onClick={() => toggle(s)} />
          ))}
        </section>
      )}

      {live.length === 0 && upcoming.length === 0 && ended.length === 0 && (
        <p className="text-center text-sm py-10" style={{ color: "var(--tg-theme-hint-color,#888)" }}>
          Chưa có stream nào.
        </p>
      )}

      {ended.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs font-bold" style={{ color: "var(--tg-theme-hint-color,#888)" }}>
            Đã phát
          </p>
          {ended.map((s) => (
            <StreamCard key={s.id} item={s} active={selected?.id === s.id} onClick={() => toggle(s)} />
          ))}
        </section>
      )}

      <a
        href={`${siteConfig.url}/esports`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-center text-xs py-3 rounded-xl"
        style={{ color: "var(--tg-theme-link-color,#f97316)" }}
      >
        Xem thêm trên web →
      </a>
    </div>
  );
}
