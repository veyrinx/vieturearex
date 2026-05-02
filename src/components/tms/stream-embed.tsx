"use client";

import { useState } from "react";
import { Radio, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

function getEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    // YouTube watch or live
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      let vid = u.searchParams.get("v");
      if (!vid && u.hostname === "youtu.be") vid = u.pathname.slice(1);
      if (!vid) {
        // youtube.com/live/VIDEO_ID
        const parts = u.pathname.split("/");
        const liveIdx = parts.indexOf("live");
        if (liveIdx !== -1) vid = parts[liveIdx + 1];
      }
      if (vid) return `https://www.youtube.com/embed/${vid}?autoplay=1&mute=1`;
    }
    // Facebook live (just show link, fb embeds require app ID)
    if (u.hostname.includes("facebook.com") || u.hostname.includes("fb.watch")) return null;
    // Twitch
    if (u.hostname.includes("twitch.tv")) {
      const channel = u.pathname.split("/").filter(Boolean)[0];
      if (channel) return `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}&muted=true`;
    }
  } catch { /* ignore */ }
  return null;
}

export function StreamEmbed({ url }: { url: string }) {
  const [open, setOpen] = useState(true);
  const embedUrl = getEmbedUrl(url);

  return (
    <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-bold text-amber-400"
      >
        <span className="size-2 rounded-full bg-red-500 animate-pulse shrink-0" />
        <Radio className="size-4" />
        <span className="flex-1 text-left">TRỰC TIẾP</span>
        <a
          href={url} target="_blank" rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground mr-2"
        >
          <ExternalLink className="size-3" /> Mở tab mới
        </a>
        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>

      {open && (
        embedUrl ? (
          <div className="aspect-video w-full">
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title="Livestream"
            />
          </div>
        ) : (
          <div className="px-4 pb-4">
            <a
              href={url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-sm font-semibold text-amber-400 hover:bg-amber-400/20 transition-colors"
            >
              <ExternalLink className="size-4" /> Xem trực tiếp tại đây
            </a>
          </div>
        )
      )}
    </div>
  );
}
