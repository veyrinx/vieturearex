"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Wrench, Clock, ArrowRight, Facebook, Youtube } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";

function useCountdown(targetIso: string | null) {
  const [diff, setDiff] = useState(0);
  useEffect(() => {
    if (!targetIso) return;
    const target = new Date(targetIso).getTime();
    const tick = () => setDiff(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);
  const s = Math.floor(diff / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    done: diff === 0 && !targetIso,
  };
}

function CountBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative flex size-16 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 sm:size-20">
        <span className="font-heading text-2xl font-black text-amber-400 sm:text-3xl tabular-nums">
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
    </div>
  );
}

export default function MaintenancePage() {
  const [message, setMessage] = useState("Website đang được bảo trì. Vui lòng quay lại sau.");
  const [endTime, setEndTime] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/maintenance-info")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.message) setMessage(d.message as string);
        if (d?.endTime) setEndTime(d.endTime as string);
      })
      .catch(() => {});
  }, []);

  const cd = useCountdown(endTime);
  const hasCountdown = Boolean(endTime) && !cd.done;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-amber-500/5 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-primary/5 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "28px 28px" }}
        />
      </div>

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center gap-8 text-center">

        {/* Logo */}
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl bg-amber-500/20 blur-2xl" />
          <Image
            src={siteConfig.favicon}
            alt={siteConfig.shortName}
            width={72}
            height={72}
            className="relative rounded-2xl shadow-[0_20px_60px_rgba(247,147,26,0.25)]"
            unoptimized
          />
        </div>

        {/* Icon + title */}
        <div className="space-y-4">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
            <Wrench className="size-8 text-amber-400" strokeWidth={1.5} />
          </div>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-amber-500">
              <span className="size-1.5 animate-pulse rounded-full bg-amber-400" />
              Đang bảo trì
            </div>
            <h1 className="font-heading text-3xl font-black uppercase tracking-[0.06em] text-foreground sm:text-4xl">
              Sẽ Sớm Trở Lại
            </h1>
            <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
              {message}
            </p>
          </div>
        </div>

        {/* Countdown */}
        {hasCountdown && (
          <div className="w-full space-y-3 rounded-2xl border border-border bg-card/50 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <Clock className="size-3.5" /> Dự kiến hoàn thành
            </div>
            <div className="flex items-end justify-center gap-3">
              {cd.days > 0 && <CountBlock value={cd.days} label="Ngày" />}
              <CountBlock value={cd.hours} label="Giờ" />
              <CountBlock value={cd.minutes} label="Phút" />
              <CountBlock value={cd.seconds} label="Giây" />
            </div>
            {endTime && (
              <p className="text-xs text-muted-foreground">
                {new Date(endTime).toLocaleString("vi-VN", {
                  weekday: "long", day: "2-digit", month: "2-digit",
                  year: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </p>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="flex w-full items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Theo dõi chúng tôi</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Social links */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <a href={siteConfig.links.facebook} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:text-foreground hover:shadow-md">
            <Facebook className="size-4" /> Facebook
          </a>
          <a href={siteConfig.links.youtube} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-red-500/30 hover:text-foreground hover:shadow-md">
            <Youtube className="size-4" /> YouTube
          </a>
          <a href={siteConfig.links.community} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/5 px-4 py-2.5 text-sm font-semibold text-amber-500 transition-all hover:-translate-y-0.5 hover:shadow-md">
            Cộng đồng <ArrowRight className="size-3.5" />
          </a>
        </div>

        <p className="text-xs text-muted-foreground/50">
          © {new Date().getFullYear()} {siteConfig.name}
        </p>
      </div>
    </div>
  );
}
