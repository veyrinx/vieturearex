"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CalendarClock, ChevronLeft, ChevronRight, Flame, Newspaper, ImageIcon } from "lucide-react";
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
      initial: { opacity: 0, scale: 1.08, filter: "blur(12px)" },
      animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
      exit: { opacity: 0, scale: 1.02, filter: "blur(6px)" },
    };
  }
  if (effect === "drift") {
    return {
      initial: { opacity: 0, x: 16, scale: 1.04 },
      animate: { opacity: 1, x: 0, scale: 1 },
      exit: { opacity: 0, x: -16, scale: 1.01 },
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
  const desktopImages = useMemo(() => desktopBackgroundUrls.filter(Boolean).slice(0, 3), [desktopBackgroundUrls]);
  const allImages = useMemo(
    () => (desktopImages.length > 0 ? desktopImages : mobileBackgroundUrls.filter(Boolean).slice(0, 3)),
    [desktopImages, mobileBackgroundUrls],
  );

  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const countdown = useCountdown(nextEventDate);

  const goTo = useCallback((i: number) => {
    setIndex(((i % allImages.length) + allImages.length) % allImages.length);
  }, [allImages.length]);

  const prev = useCallback(() => goTo(index - 1), [goTo, index]);
  const next = useCallback(() => goTo(index + 1), [goTo, index]);

  useEffect(() => {
    if (allImages.length <= 1 || isPaused) return;
    const safeInterval = Math.max(sliderIntervalMs, transitionMs + 1200);
    const timer = window.setInterval(() => {
      setIndex((cur) => (cur + 1) % allImages.length);
    }, safeInterval);
    return () => window.clearInterval(timer);
  }, [allImages.length, sliderIntervalMs, transitionMs, isPaused]);

  const currentImage = allImages[index];
  const transitionSeconds = transitionMs / 1000;
  const hasMultiple = allImages.length > 1;
  const variants = getSliderVariants(transitionEffect);

  const stats = [
    { icon: Flame, label: "Sự kiện active", value: activeEventCount, color: "text-orange-500 dark:text-orange-400" },
    { icon: Newspaper, label: "Bài viết", value: publishedNewsCount, color: "text-primary dark:text-amber-400" },
    { icon: ImageIcon, label: "Ảnh cộng đồng", value: galleryCount, color: "text-emerald-600 dark:text-emerald-400" },
  ];

  return (
    <section className="relative -mt-6 overflow-hidden pt-10 pb-4">
      {/* Background: subtle grid mesh */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.055]"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      {/* Color orbs */}
      <div className="pointer-events-none absolute -right-32 top-0 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px] dark:bg-amber-400/10" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-80 w-80 rounded-full bg-primary/6 blur-[90px] dark:bg-amber-400/6" />

      <div className="relative grid gap-10 lg:grid-cols-[1fr,440px] lg:gap-12 xl:grid-cols-[1fr,480px]">

        {/* ─── Left: Typography + CTAs ─── */}
        <div className="flex flex-col justify-center gap-7">

          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex items-center gap-3"
          >
            <span className="h-px w-10 bg-primary dark:bg-amber-400" />
            <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary dark:text-amber-400">
              Free Fire Vietnam
            </span>
          </motion.div>

          {/* Main heading */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="font-heading text-[clamp(3rem,8vw,6rem)] font-black uppercase leading-[0.88]">
              <span className="block text-foreground">
                {heroTitle
                  ? heroTitle.split(" ").slice(0, 2).join(" ")
                  : "AREX"}
              </span>
              <span className="block text-foreground/18 dark:text-white/12">COMMUNITY</span>
              <span className="block text-foreground">HUB</span>
            </h1>
          </motion.div>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.22 }}
            className="max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base"
          >
            Theo dõi sự kiện theo dòng thời gian, cập nhật tin tức theo chuyên mục và kết nối cộng đồng Free Fire Việt Nam.
          </motion.p>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap gap-6"
          >
            {stats.map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl border border-border bg-card">
                  <Icon className={`size-4 ${color}`} />
                </div>
                <div>
                  <p className={`font-heading text-2xl font-black leading-none tabular-nums ${color}`}>
                    {value}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    {label}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Countdown */}
          {countdown.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="space-y-2"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                ⏱ Sự kiện tiếp theo
              </p>
              <div className="flex gap-2">
                {countdown.map((unit) => (
                  <div
                    key={unit.label}
                    className="flex min-w-[52px] flex-col items-center rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 dark:border-amber-400/20 dark:bg-amber-400/5"
                  >
                    <span className="font-heading text-2xl font-black tabular-nums text-primary dark:text-amber-400">
                      {String(unit.value).padStart(2, "0")}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                      {unit.label}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap gap-3"
          >
            <Button asChild size="lg" className="h-11 rounded-xl px-6">
              <Link href="/calendar">
                XEM LỊCH SỰ KIỆN
                <CalendarClock className="ml-2 size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="h-11 rounded-xl px-5 text-muted-foreground hover:text-foreground">
              <Link href="/news">
                TIN TỨC
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </motion.div>
        </div>

        {/* ─── Right: Image frame ─── */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative hidden lg:flex flex-col gap-3"
        >
          {/* Main image card */}
          <div
            className="group relative overflow-hidden rounded-[20px] border border-border bg-muted shadow-2xl"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Aspect ratio wrapper */}
            <div className="relative aspect-[4/3] w-full overflow-hidden">
              <AnimatePresence mode="sync" initial={false}>
                {currentImage ? (
                  <motion.div
                    key={currentImage}
                    initial={variants.initial}
                    animate={variants.animate}
                    exit={variants.exit}
                    transition={{ duration: transitionSeconds, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${currentImage})` }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-muted" />
                )}
              </AnimatePresence>
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

              {/* Dot nav */}
              {hasMultiple && (
                <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
                  {allImages.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => goTo(i)}
                      aria-label={`Ảnh ${i + 1}`}
                      className={[
                        "rounded-full transition-all duration-300",
                        i === index ? "h-2 w-5 bg-white shadow" : "size-2 bg-white/50 hover:bg-white/80",
                      ].join(" ")}
                    />
                  ))}
                </div>
              )}

              {/* Arrow nav */}
              {hasMultiple && (
                <>
                  <button
                    type="button"
                    onClick={prev}
                    className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100 hover:bg-black/50"
                    aria-label="Ảnh trước"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100 hover:bg-black/50"
                    aria-label="Ảnh tiếp theo"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </>
              )}
            </div>

            {/* Image card footer */}
            <div className="flex items-center justify-between border-t border-border bg-card px-4 py-2.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Arex Community Hub
              </span>
              <div className="flex items-center gap-1.5">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-600 dark:text-emerald-400">
                  Đang hoạt động
                </span>
              </div>
            </div>
          </div>

          {/* Quick links row */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/events"
              className="group flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition hover:border-primary/40 hover:bg-primary/5 dark:hover:border-amber-400/40 dark:hover:bg-amber-400/5"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/15">
                <Flame className="size-4 text-orange-500 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-foreground">Sự kiện</p>
                <p className="text-[10px] text-muted-foreground">{activeEventCount} đang diễn ra</p>
              </div>
              <ArrowRight className="ml-auto size-3.5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary dark:group-hover:text-amber-400" />
            </Link>
            <Link
              href="/news"
              className="group flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition hover:border-primary/40 hover:bg-primary/5 dark:hover:border-amber-400/40 dark:hover:bg-amber-400/5"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                <Newspaper className="size-4 text-primary dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-foreground">Tin tức</p>
                <p className="text-[10px] text-muted-foreground">{publishedNewsCount} bài viết</p>
              </div>
              <ArrowRight className="ml-auto size-3.5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary dark:group-hover:text-amber-400" />
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Mobile: Image below text */}
      <div className="mt-8 lg:hidden">
        <div
          className="relative overflow-hidden rounded-[16px] border border-border bg-muted"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="relative aspect-[16/9] w-full overflow-hidden">
            <AnimatePresence mode="sync" initial={false}>
              {currentImage ? (
                <motion.div
                  key={currentImage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8 }}
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${currentImage})` }}
                />
              ) : (
                <div className="absolute inset-0 bg-muted" />
              )}
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            {hasMultiple && (
              <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
                {allImages.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`Ảnh ${i + 1}`}
                    className={[
                      "rounded-full transition-all duration-300",
                      i === index ? "h-1.5 w-4 bg-white" : "size-1.5 bg-white/50",
                    ].join(" ")}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
