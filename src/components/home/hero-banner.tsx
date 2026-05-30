"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight, CalendarClock, ChevronLeft, ChevronRight,
  Flame, Newspaper, ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HeroSliderEffect } from "@/lib/utils/site-settings";

type HeroBannerProps = {
  desktopBackgroundUrls?: string[];
  mobileBackgroundUrls?: string[];
  heroTitle?: string;
  activeEventCount?: number;
  publishedNewsCount?: number;
  galleryCount?: number;
  sliderIntervalMs?: number;
  transitionMs?: number;
  transitionEffect?: HeroSliderEffect;
  nextEventDate?: string | null;
};

function getSliderVariants(effect: HeroSliderEffect) {
  if (effect === "cinematic") {
    return {
      initial: { opacity: 0, scale: 1.06, filter: "blur(10px)" },
      animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
      exit: { opacity: 0, scale: 1.02, filter: "blur(4px)" },
    };
  }
  if (effect === "drift") {
    return {
      initial: { opacity: 0, x: 24, scale: 1.04 },
      animate: { opacity: 1, x: 0, scale: 1 },
      exit: { opacity: 0, x: -24, scale: 1.01 },
    };
  }
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  };
}

type CountdownUnit = { value: number; label: string };

function useCountdown(targetDate: string | null | undefined) {
  const [units, setUnits] = useState<CountdownUnit[]>([]);
  useEffect(() => {
    if (!targetDate) return;
    const calc = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setUnits([]); return; }
      const d = Math.floor(diff / 86_400_000);
      const h = Math.floor((diff % 86_400_000) / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setUnits([
        { value: d, label: "ngày" },
        { value: h, label: "giờ" },
        { value: m, label: "phút" },
        { value: s, label: "giây" },
      ]);
    };
    calc();
    const timer = window.setInterval(calc, 1000);
    return () => window.clearInterval(timer);
  }, [targetDate]);
  return units;
}

export function HeroBanner({
  desktopBackgroundUrls = [],
  mobileBackgroundUrls = [],
  heroTitle,
  activeEventCount = 0,
  publishedNewsCount = 0,
  galleryCount = 0,
  sliderIntervalMs = 5000,
  transitionMs = 900,
  transitionEffect = "fade",
  nextEventDate,
}: HeroBannerProps) {
  const desktopImages = useMemo(
    () => desktopBackgroundUrls.filter(Boolean).slice(0, 5),
    [desktopBackgroundUrls],
  );
  const allImages = useMemo(
    () => (desktopImages.length > 0 ? desktopImages : mobileBackgroundUrls.filter(Boolean).slice(0, 5)),
    [desktopImages, mobileBackgroundUrls],
  );

  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const countdown = useCountdown(nextEventDate);

  const goTo = useCallback(
    (i: number) => setIndex(((i % allImages.length) + allImages.length) % allImages.length),
    [allImages.length],
  );
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);
  const next = useCallback(() => goTo(index + 1), [goTo, index]);

  useEffect(() => {
    if (allImages.length <= 1 || isPaused) return;
    const interval = Math.max(sliderIntervalMs, transitionMs + 1200);
    const t = window.setInterval(() => setIndex((c) => (c + 1) % allImages.length), interval);
    return () => window.clearInterval(t);
  }, [allImages.length, sliderIntervalMs, transitionMs, isPaused]);

  const currentImage = allImages[index];
  const transitionSecs = transitionMs / 1000;
  const hasMultiple = allImages.length > 1;
  const variants = getSliderVariants(transitionEffect);

  const titleWords = heroTitle?.trim().split(/\s+/) ?? [];
  const line1 = titleWords.slice(0, 1).join(" ") || "AREX";
  const line2 = titleWords.slice(1, 3).join(" ") || "COMMUNITY";
  const line3 = titleWords.slice(3).join(" ") || "HUB";

  const stats = [
    { icon: Flame,     label: "Sự kiện",   value: activeEventCount,  color: "text-orange-400" },
    { icon: Newspaper, label: "Bài viết",  value: publishedNewsCount, color: "text-primary dark:text-amber-400" },
    { icon: ImageIcon, label: "Ảnh",        value: galleryCount,       color: "text-emerald-400" },
  ];

  return (
    <section
      className="-mx-4 -mt-6 md:-mx-6 relative flex min-h-[78vh] md:min-h-[84vh] items-end overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ── Background layer ── */}
      <div className="absolute inset-0 bg-slate-950">
        {/* Fallback gradient — visible when no images loaded */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_60%_-10%,rgba(0,82,255,0.22),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_60%_-10%,rgba(247,147,26,0.20),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_10%_110%,rgba(77,124,255,0.18),transparent)] dark:bg-[radial-gradient(ellipse_50%_40%_at_10%_110%,rgba(255,178,30,0.12),transparent)]" />

        {/* Slider images */}
        <AnimatePresence mode="sync" initial={false}>
          {currentImage && (
            <motion.div
              key={currentImage}
              initial={variants.initial}
              animate={variants.animate}
              exit={variants.exit}
              transition={{ duration: transitionSecs, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${currentImage})` }}
            />
          )}
        </AnimatePresence>

        {/* Gradient overlays for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />

        {/* Subtle scanline texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "linear-gradient(transparent 50%, rgba(0,0,0,1) 50%)",
            backgroundSize: "100% 4px",
          }}
        />
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 w-full px-4 pb-12 pt-24 md:px-8 md:pb-16 md:pt-32 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-[640px] space-y-5 md:space-y-6">

            {/* Live badge + eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-400">Đang hoạt động</span>
              <span className="h-px w-8 bg-white/20" />
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/50">Free Fire Vietnam</span>
            </motion.div>

            {/* Main heading */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="font-heading font-black uppercase leading-[0.85] tracking-tight"
              style={{ fontSize: "clamp(3rem, 11vw, 7.5rem)" }}
            >
              <span className="block text-primary dark:text-amber-400">{line1}</span>
              <span
                className="block text-transparent"
                style={{ WebkitTextStroke: "2px rgba(255,255,255,0.22)" }}
              >
                {line2}
              </span>
              <span className="block text-white">{line3}</span>
            </motion.h1>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="max-w-md text-sm leading-relaxed text-white/55 md:text-base"
            >
              Theo dõi sự kiện, cập nhật tin tức Esports và kết nối cộng đồng Free Fire Việt Nam.
            </motion.p>

            {/* Stats pills */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.28 }}
              className="flex flex-wrap gap-2"
            >
              {stats.map(({ icon: Icon, label, value, color }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3.5 py-1.5 backdrop-blur-md"
                >
                  <Icon className={`size-3.5 shrink-0 ${color}`} />
                  <span className={`font-heading text-sm font-black tabular-nums ${color}`}>{value}</span>
                  <span className="text-[10px] font-medium text-white/45">{label}</span>
                </div>
              ))}
            </motion.div>

            {/* Countdown */}
            {countdown.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.32 }}
                className="flex flex-wrap items-center gap-3"
              >
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
                  ⏱ Sự kiện tiếp theo
                </span>
                <div className="flex gap-1.5">
                  {countdown.map((unit) => (
                    <div
                      key={unit.label}
                      className="flex min-w-[40px] flex-col items-center rounded-xl border border-primary/30 bg-primary/15 px-2 py-1.5 backdrop-blur-sm dark:border-amber-400/30 dark:bg-amber-400/10"
                    >
                      <span className="font-heading text-base font-black leading-none tabular-nums text-primary dark:text-amber-400 md:text-xl">
                        {String(unit.value).padStart(2, "0")}
                      </span>
                      <span className="text-[8px] font-bold uppercase tracking-wide text-white/35">
                        {unit.label}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.38 }}
              className="flex flex-row flex-wrap gap-3"
            >
              <Button
                asChild
                size="lg"
                className="h-11 rounded-xl px-6 shadow-[0_4px_24px_hsl(var(--primary)/0.45)]"
              >
                <Link href="/calendar">
                  XEM LỊCH SỰ KIỆN
                  <CalendarClock className="ml-2 size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-11 rounded-xl border-white/18 bg-white/8 px-5 text-white backdrop-blur-sm hover:bg-white/15 hover:text-white hover:border-white/30"
              >
                <Link href="/news">
                  TIN TỨC
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── Slider controls ── */}
      {hasMultiple && (
        <>
          {/* Dot indicators */}
          <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-1.5 md:bottom-6">
            {allImages.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Ảnh ${i + 1}`}
                className={[
                  "rounded-full transition-all duration-300",
                  i === index ? "h-2 w-6 bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "size-2 bg-white/30 hover:bg-white/60",
                ].join(" ")}
              />
            ))}
          </div>

          {/* Arrow buttons */}
          <button
            type="button"
            onClick={prev}
            aria-label="Ảnh trước"
            className="absolute left-3 top-1/2 z-20 -translate-y-1/2 flex size-9 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50 md:left-5 md:size-10"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Ảnh tiếp theo"
            className="absolute right-3 top-1/2 z-20 -translate-y-1/2 flex size-9 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50 md:right-5 md:size-10"
          >
            <ChevronRight className="size-4" />
          </button>
        </>
      )}

      {/* Bottom fade into page */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
