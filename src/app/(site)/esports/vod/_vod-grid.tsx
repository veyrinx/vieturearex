"use client";

import { useState } from "react";
import { Play, Eye, X } from "lucide-react";
import { buildEmbedUrl, extractYouTubeId } from "@/lib/utils/stream-utils";
import type { StreamItem } from "@/lib/types/content";

function VodPlayer({ vod, onClose }: { vod: StreamItem; onClose: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
        <iframe
          src={buildEmbedUrl(vod.youtube_url)}
          title={vod.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
      <div className="flex items-start justify-between gap-3 p-4">
        <div>
          <p className="font-semibold text-sm">{vod.title}</p>
          <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary dark:text-amber-400">
            {vod.category}
          </span>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
          <X size={16} className="text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

type Props = { vods: StreamItem[] };

export function VodGrid({ vods }: Props) {
  const [selected, setSelected] = useState<StreamItem | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const categories = ["all", ...Array.from(new Set(vods.map((v) => v.category)))];

  const filtered = vods.filter((v) => {
    const matchSearch = !search || v.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "all" || v.category === category;
    return matchSearch && matchCat;
  });

  if (vods.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
        Chưa có VOD nào.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Player */}
      {selected && <VodPlayer vod={selected} onClose={() => setSelected(null)} />}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Tìm video..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 rounded-xl border border-border bg-background px-3 text-sm flex-1 min-w-[200px]"
        />
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase transition-colors ${
                category === c
                  ? "bg-primary/10 text-primary dark:bg-amber-400/10 dark:text-amber-400"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {c === "all" ? "Tất cả" : c}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((vod) => {
          const ytId = extractYouTubeId(vod.youtube_url);
          const thumb = vod.thumbnail_url || (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : "");
          const isActive = selected?.id === vod.id;

          return (
            <button
              key={vod.id}
              type="button"
              onClick={() => setSelected(isActive ? null : vod)}
              className={`group text-left rounded-2xl border border-border bg-card overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 ${isActive ? "ring-2 ring-primary dark:ring-amber-400" : ""}`}
            >
              <div className="relative aspect-video overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumb} alt={vod.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="size-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <Play size={20} className="text-white ml-1" fill="white" />
                  </div>
                </div>
              </div>
              <div className="p-3 space-y-1">
                <p className="text-sm font-semibold line-clamp-2 leading-snug">{vod.title}</p>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary dark:text-amber-400">
                    {vod.category}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(vod.scheduled_at).toLocaleDateString("vi-VN")}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">Không tìm thấy video phù hợp.</p>
      )}
    </div>
  );
}
