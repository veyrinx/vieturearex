"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, ExternalLink, Radio } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { StreamItem } from "@/lib/types/content";
import { buildEmbedUrl, buildWatchUrl } from "@/lib/utils/stream-utils";
import { StreamPlayer } from "@/components/esports/stream-player";

type StreamModalProps = {
  stream: StreamItem | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

export function StreamModal({ stream, open, onOpenChange }: StreamModalProps) {
  const [notifSubscribed, setNotifSubscribed] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    if (!stream || stream.status !== "upcoming") return;
    if (!("serviceWorker" in navigator) || !VAPID_PUBLIC_KEY) return;
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setNotifSubscribed(!!sub);
    }).catch(() => null);
  }, [stream]);

  const toggleNotif = async () => {
    if (!("serviceWorker" in navigator) || !VAPID_PUBLIC_KEY) {
      alert("Trình duyệt không hỗ trợ thông báo.");
      return;
    }
    setNotifLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      if (notifSubscribed) {
        const sub = await reg.pushManager.getSubscription();
        await sub?.unsubscribe();
        setNotifSubscribed(false);
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub),
        });
        setNotifSubscribed(true);
      }
    } finally {
      setNotifLoading(false);
    }
  };

  if (!stream) return null;

  const isLive = stream.status === "live";
  const isEnded = stream.status === "ended";
  const embedUrl = buildEmbedUrl(stream.youtube_url);
  const watchUrl = buildWatchUrl(stream.youtube_url);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-hidden border border-border bg-card p-0 text-foreground sm:max-w-3xl">
        <div className="max-h-[92vh] overflow-y-auto">
          <div className="px-5 pb-3 pt-4">
            <DialogHeader>
              <DialogTitle className="font-heading text-lg font-bold uppercase leading-snug tracking-[0.04em] text-foreground line-clamp-2 pr-8">
                {stream.title}
              </DialogTitle>
            </DialogHeader>
          </div>

          {/* Video embed hoặc thumbnail */}
          <div className="px-5">
            <div className="overflow-hidden rounded-[10px] bg-black">
              {isLive || isEnded ? (
                <StreamPlayer embedUrl={embedUrl} title={stream.title} isLive={isLive} />
              ) : (
                <div className="relative aspect-video w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={stream.thumbnail_url}
                    alt={stream.title}
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <span className="rounded-xl bg-black/60 px-4 py-2 text-sm font-bold uppercase tracking-widest text-white">
                      SẮP PHÁT TRỰC TIẾP
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 px-5 pb-4 pt-3">
            <div className="flex gap-2">
              {isLive && (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] bg-[#FF0000] px-3 py-1 text-xs font-bold uppercase text-white">
                  <Radio className="size-3 animate-pulse" />
                  TRỰC TIẾP
                </span>
              )}
              <Button asChild className="h-9 flex-1 rounded-[10px]">
                <a href={watchUrl} target="_blank" rel="noreferrer">
                  {isLive ? "XEM TRỰC TIẾP" : isEnded ? "XEM LẠI VIDEO" : "XEM TRỰC TIẾP"}
                  <ExternalLink className="ml-2 size-4" />
                </a>
              </Button>

              {/* Chuông thông báo chỉ khi sắp phát */}
              {stream.status === "upcoming" && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-[10px]"
                  onClick={toggleNotif}
                  disabled={notifLoading}
                  title={notifSubscribed ? "Tắt thông báo" : "Nhận thông báo khi phát trực tiếp"}
                >
                  {notifSubscribed
                    ? <Bell className="size-4 text-primary" />
                    : <BellOff className="size-4 text-muted-foreground" />
                  }
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
