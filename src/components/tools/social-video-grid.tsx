"use client";

import { useEffect, useState } from "react";
import { Play, X, ExternalLink } from "lucide-react";
import { getEmbedUrl, type SocialVideo } from "@/lib/constants/social";

export function SocialVideoGrid({ videos }: { videos: SocialVideo[] }) {
  const [active, setActive] = useState<SocialVideo | null>(null);
  const embed = active ? getEmbedUrl(active) : null;

  // Esc để đóng + khóa cuộn nền khi modal mở.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setActive(null); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [active]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {videos.map((v) => {
          const canEmbed = getEmbedUrl(v) !== null;
          const common = "group relative flex aspect-[9/16] items-end overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-muted/40 to-muted/10";
          const inner = (
            <>
              {v.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.thumbnail} alt={v.title} loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="size-8 text-muted-foreground/30" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-transform group-hover:scale-110">
                {canEmbed ? <Play className="size-4" /> : <ExternalLink className="size-4" />}
              </div>
              {v.title && (
                <p className="relative z-10 line-clamp-2 p-2.5 text-left text-xs font-semibold text-white drop-shadow">{v.title}</p>
              )}
            </>
          );

          // Nhúng được → mở modal; không thì mở tab ngoài như trước.
          return canEmbed ? (
            <button key={v.id} onClick={() => setActive(v)} className={common} aria-label={`Xem ${v.title || "video"}`}>
              {inner}
            </button>
          ) : (
            <a key={v.id} href={v.url} target="_blank" rel="noopener noreferrer" className={common}>
              {inner}
            </a>
          );
        })}
      </div>

      {active && embed && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.title || "Video"}
          onClick={() => setActive(null)}
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
        >
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-[420px]">
            <button
              onClick={() => setActive(null)}
              aria-label="Đóng"
              className="absolute -top-10 right-0 flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="size-5" />
            </button>

            <div className="overflow-hidden rounded-2xl bg-black shadow-2xl">
              <iframe
                key={active.id}
                src={embed}
                title={active.title || "Video"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className={active.platform === "youtube" ? "aspect-video w-full" : "aspect-[9/16] w-full"}
              />
            </div>

            <a
              href={active.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex w-fit items-center gap-1.5 text-xs font-semibold text-white/70 transition-colors hover:text-white"
            >
              <ExternalLink className="size-3.5" /> Mở trên {active.platform === "youtube" ? "YouTube" : "TikTok"}
            </a>
          </div>
        </div>
      )}
    </>
  );
}
