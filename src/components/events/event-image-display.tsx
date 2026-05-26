"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  src: string | null | undefined;
  alt: string;
};

export function EventImageDisplay({ src, alt }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const hasImage = !!src && !errored;

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-border bg-muted"
      style={{ aspectRatio: "16/9" }}
    >
      {/* Skeleton shimmer — always visible until image loads */}
      {(!loaded || !hasImage) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          {/* shimmer overlay */}
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%]" />
          <div className="relative z-10 flex flex-col items-center gap-2 text-muted-foreground/50">
            <ImageIcon className="size-10" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em]">
              {hasImage ? "Đang tải ảnh…" : "Ảnh đang được cập nhật"}
            </span>
          </div>
        </div>
      )}

      {/* Actual image */}
      {hasImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
      )}
    </div>
  );
}
