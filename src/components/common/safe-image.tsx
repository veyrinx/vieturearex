"use client";

import { useState } from "react";
import Image from "next/image";
import { Trophy } from "lucide-react";

interface TeamLogoProps {
  src: string | null | undefined;
  tag: string;
  className?: string;
  fallbackClass?: string;
  size?: number;
}

export function TeamLogo({ src, tag, className = "size-8 rounded-lg", fallbackClass, size = 32 }: TeamLogoProps) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`${className} ${fallbackClass ?? "bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground"}`}>
        {tag.slice(0, 2)}
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={tag}
      width={size}
      height={size}
      className={`${className} object-cover`}
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}

interface TournamentBannerProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fill?: boolean;
}

export function TournamentBanner({ src, alt, className = "w-full h-full object-cover", fill = true }: TournamentBannerProps) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-amber-500/20 to-primary/10 flex items-center justify-center">
        <Trophy className="size-10 text-amber-400/40" />
      </div>
    );
  }
  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={className}
        unoptimized
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={800}
      height={400}
      className={className}
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}
