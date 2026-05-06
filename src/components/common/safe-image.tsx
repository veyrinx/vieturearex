"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";

interface TeamLogoProps {
  src: string | null | undefined;
  tag: string;
  className?: string;
  fallbackClass?: string;
}

export function TeamLogo({ src, tag, className = "size-8 rounded-lg", fallbackClass }: TeamLogoProps) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`${className} ${fallbackClass ?? "bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground"}`}>
        {tag.slice(0, 2)}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={tag}
      className={`${className} object-cover`}
      onError={() => setFailed(true)}
    />
  );
}

interface TournamentBannerProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
}

export function TournamentBanner({ src, alt, className = "w-full h-full object-cover" }: TournamentBannerProps) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-amber-500/20 to-primary/10 flex items-center justify-center">
        <Trophy className="size-10 text-amber-400/40" />
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}
