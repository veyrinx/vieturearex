"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// Publisher id from the AdSense loader script in the root layout.
const DEFAULT_CLIENT = "ca-pub-6400047965945515";

type AdSenseProps = {
  /** data-ad-slot from your AdSense account. Ad won't render without it. */
  slot?: string | null;
  /** data-ad-client (ca-pub-…). Defaults to the site publisher id. */
  client?: string | null;
  format?: string;
  responsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * A single Google AdSense unit. Renders nothing unless a slot id is provided
 * (so unconfigured slots stay invisible instead of showing an empty box).
 * The AdSense loader script itself lives in the root layout.
 */
export function AdSense({
  slot,
  client = DEFAULT_CLIENT,
  format = "auto",
  responsive = true,
  className,
  style,
}: AdSenseProps) {
  const pushed = useRef(false);

  useEffect(() => {
    if (!slot || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch { /* AdSense not ready / blocked — ignore */ }
  }, [slot]);

  if (!slot) return null;

  return (
    <ins
      className={cn("adsbygoogle block", className)}
      style={{ display: "block", ...style }}
      data-ad-client={client || DEFAULT_CLIENT}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive ? "true" : "false"}
    />
  );
}
