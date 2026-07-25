"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Ảnh tải lên ImageKit có thể lưu dạng path tương đối ("/abc.jpg") → ghép endpoint.
const IK_ENDPOINT = "https://ik.imagekit.io/oyvgbkwyt";

type MediaFrameProps = {
  src?: string | null;
  alt: string;
  sizes?: string;
  frameClassName?: string;
  imageClassName?: string;
  aspectClassName?: string;
};

export function MediaFrame({
  src,
  alt,
  frameClassName,
  imageClassName,
  aspectClassName = "aspect-[16/9]",
}: MediaFrameProps) {
  const [imageError, setImageError] = useState(false);
  const normalizedSrc = src?.trim() || "";

  // Path tương đối "/..." = ảnh trên ImageKit → ghép endpoint thành URL đầy đủ.
  const resolvedSrc = normalizedSrc.startsWith("/")
    ? `${IK_ENDPOINT}${normalizedSrc}`
    : normalizedSrc;

  const showFallback = !normalizedSrc || imageError;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-none bg-transparent",
        aspectClassName,
        frameClassName,
      )}
    >
      {showFallback ? (
        <div className="absolute inset-0 border-2 border-dashed border-border flex items-center justify-center">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          <span className="relative z-10 animate-pulse text-2xl font-bold uppercase tracking-[0.05em] text-foreground/40 select-none">
            ĐANG CẬP NHẬT
          </span>
        </div>
      ) : (
        // Ảnh thường + no-referrer để CDN (Free Fire, imgur…) không chặn hotlink.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolvedSrc}
          alt={alt}
          referrerPolicy="no-referrer"
          className={cn("absolute inset-0 h-full w-full object-cover transition-opacity duration-300", imageClassName)}
          onError={() => setImageError(true)}
          loading="lazy"
          decoding="async"
        />
      )}
    </div>
  );
}
