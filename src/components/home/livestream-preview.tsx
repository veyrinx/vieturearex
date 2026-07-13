"use client";

import Link from "next/link";
import { Radio, ArrowRight, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/common/reveal";
import { SectionHeading } from "@/components/common/section-heading";
import { cn } from "@/lib/utils";
import type { StreamItem } from "@/lib/types/content";

type LivestreamPreviewProps = {
  streams: StreamItem[];
};

export function LivestreamPreview({ streams }: LivestreamPreviewProps) {
  const liveStreams = streams.filter((s) => s.status === "live");
  const upcomingStreams = streams.filter((s) => s.status === "upcoming");
  const visible = [...liveStreams, ...upcomingStreams].slice(0, 4);

  if (visible.length === 0) return null;

  const featured = visible[0];
  const rest = visible.slice(1);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <SectionHeading
          eyebrow="Trực tiếp"
          icon={Radio}
          title="PHÁT TRỰC TIẾP"
          description="Các kênh đang live và sắp phát trong cộng đồng"
        />
        <Button asChild size="sm" variant="outline" className="shrink-0 rounded-xl">
          <Link href="/esports">
            Xem tất cả
            <ArrowRight className="ml-1.5 size-3.5" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr,1fr]">
        {/* Featured stream */}
        <Reveal>
          <Link
            href="/esports"
            className="group relative flex flex-col overflow-hidden rounded-[16px] border border-border bg-card transition-all hover:border-[#FF0000]/50 hover:shadow-[0_0_32px_rgba(255,0,0,0.12)] dark:hover:shadow-[0_0_32px_rgba(255,0,0,0.18)]"
          >
            <div className="relative aspect-video w-full overflow-hidden bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={featured.thumbnail_url}
                alt={featured.title}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              {featured.status === "live" && (
                <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-lg bg-[#FF0000] px-3 py-1.5 shadow-[0_0_16px_rgba(255,0,0,0.6)]">
                  <Radio className="size-3 animate-pulse text-white" />
                  <span className="text-xs font-black uppercase tracking-[0.1em] text-white">ĐANG LIVE</span>
                </div>
              )}

              {featured.status === "upcoming" && (
                <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 shadow-[0_0_12px_rgba(16,185,129,0.5)]">
                  <span className="size-2 animate-pulse rounded-full bg-white" />
                  <span className="text-xs font-black uppercase tracking-[0.1em] text-white">SẮP PHÁT</span>
                </div>
              )}

              <div className="absolute bottom-3 left-3 right-3">
                <h3 className="font-heading text-base font-bold uppercase text-white drop-shadow-lg line-clamp-2 md:text-xl">
                  {featured.title}
                </h3>
              </div>
            </div>

            <div className="flex items-center justify-between p-3">
              <span className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                {featured.category || "CỘNG ĐỒNG"}
              </span>
              <Button size="sm" className="h-7 rounded-lg px-3 text-xs">
                <Eye className="mr-1.5 size-3" />
                XEM NGAY
              </Button>
            </div>
          </Link>
        </Reveal>

        {/* Side list */}
        {rest.length > 0 && (
          <div className="flex flex-col gap-3">
            {rest.map((stream, i) => (
              <Reveal key={stream.id} delay={i * 0.08}>
                <Link
                  href="/esports"
                  className={cn(
                    "group flex gap-3 overflow-hidden rounded-[12px] border bg-card p-3 transition-all hover:shadow-md",
                    stream.status === "live"
                      ? "border-border hover:border-[#FF0000]/50 hover:shadow-[0_0_16px_rgba(255,0,0,0.08)]"
                      : "border-border hover:border-emerald-500/40",
                  )}
                >
                  <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-[8px] bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={stream.thumbnail_url}
                      alt={stream.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    {stream.status === "live" && (
                      <div className="absolute left-1 top-1 flex items-center gap-1 rounded-md bg-[#FF0000] px-1.5 py-0.5 shadow-[0_0_8px_rgba(255,0,0,0.5)]">
                        <Radio className="size-2.5 animate-pulse text-white" />
                        <span className="text-[10px] font-black text-white">LIVE</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-center gap-1 min-w-0">
                    <h4 className="font-heading text-sm font-bold uppercase tracking-[0.04em] text-foreground line-clamp-2 group-hover:text-primary dark:group-hover:text-amber-400">
                      {stream.title}
                    </h4>
                    <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                      {stream.category || "CỘNG ĐỒNG"}
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}

            <Reveal delay={rest.length * 0.08}>
              <Button asChild variant="outline" className="w-full rounded-xl">
                <Link href="/esports">
                  Xem tất cả stream
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </Reveal>
          </div>
        )}
      </div>
    </section>
  );
}
