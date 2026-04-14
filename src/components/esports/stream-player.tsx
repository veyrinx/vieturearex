"use client";

import { useRef, useState, useCallback } from "react";

type StreamPlayerProps = {
  embedUrl: string;
  title: string;
  isLive?: boolean;
};

export function StreamPlayer({ embedUrl, title, isLive }: StreamPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);

  // Thêm low_latency cho live stream
  const optimizedUrl = isLive
    ? `${embedUrl}&low_latency=1`
    : embedUrl;

  const handleLoad = useCallback(() => {
    setReady(true);
    // Force HD quality qua postMessage sau khi load
    setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: "setPlaybackQuality", args: ["hd1080"] }),
        "https://www.youtube-nocookie.com"
      );
    }, 500);
  }, []);

  return (
    <div className="relative aspect-video w-full bg-black">
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={optimizedUrl}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
        allowFullScreen
        loading="eager"
        referrerPolicy="strict-origin-when-cross-origin"
        title={title}
        style={{ border: 0, opacity: ready ? 1 : 0, transition: "opacity 0.25s" }}
        onLoad={handleLoad}
      />
    </div>
  );
}
