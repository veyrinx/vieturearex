"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HeroSliderEffect } from "@/lib/utils/site-settings";

type HeroBannerProps = {
  desktopBackgroundUrls?: string[];
  mobileBackgroundUrls?: string[];
  heroTitle?: string;
  activeEventCount?: number;
  publishedNewsCount?: number;
  sliderIntervalMs?: number;
  transitionMs?: number;
  transitionEffect?: HeroSliderEffect;
};

type SliderLayerProps = {
  imageUrl: string;
  effect: HeroSliderEffect;
  durationSeconds: number;
  desktopOnly?: boolean;
  mobileOnly?: boolean;
};

function getSliderVariants(effect: HeroSliderEffect) {
  if (effect === "cinematic") {
    return {
      initial: { opacity: 0, scale: 1.12, filter: "blur(18px)" },
      animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
      exit: { opacity: 0, scale: 1.03, filter: "blur(10px)" },
    };
  }

  if (effect === "drift") {
    return {
      initial: { opacity: 0, x: 24, scale: 1.04 },
      animate: { opacity: 1, x: 0, scale: 1 },
      exit: { opacity: 0, x: -24, scale: 1.02 },
    };
  }

  if (effect === "zoom") {
    return {
      initial: { opacity: 0, scale: 1.08 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 1.03 },
    };
  }

  if (effect === "slide") {
    return {
      initial: { opacity: 0, x: 36 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -36 },
    };
  }

  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  };
}

function SliderLayer({
  imageUrl,
  effect,
  durationSeconds,
  desktopOnly,
  mobileOnly,
}: SliderLayerProps) {
  const variants = getSliderVariants(effect);

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={{ duration: durationSeconds, ease: [0.22, 1, 0.36, 1] }}
      className={[
        "absolute inset-0 bg-cover bg-center bg-no-repeat",
        desktopOnly ? "hidden md:block" : "",
        mobileOnly ? "md:hidden" : "",
      ].join(" ")}
      style={{
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center center",
      }}
    />
  );
}

export function HeroBanner({
  desktopBackgroundUrls = [],
  mobileBackgroundUrls = [],
  heroTitle,
  activeEventCount = 0,
  publishedNewsCount = 0,
  sliderIntervalMs = 5000,
  transitionMs = 1000,
  transitionEffect = "fade",
}: HeroBannerProps) {
  const desktopImages = useMemo(() => desktopBackgroundUrls.filter(Boolean).slice(0, 3), [desktopBackgroundUrls]);
  const mobileImages = useMemo(
    () => (mobileBackgroundUrls.length > 0 ? mobileBackgroundUrls : desktopBackgroundUrls).filter(Boolean).slice(0, 3),
    [desktopBackgroundUrls, mobileBackgroundUrls],
  );
  const [desktopIndex, setDesktopIndex] = useState(0);
  const [mobileIndex, setMobileIndex] = useState(0);

  useEffect(() => {
    if (desktopImages.length <= 1) {
      return;
    }

    const safeInterval = Math.max(sliderIntervalMs, transitionMs + 1200);
    const timer = window.setInterval(() => {
      setDesktopIndex((current) => (current + 1) % desktopImages.length);
    }, safeInterval);

    return () => window.clearInterval(timer);
  }, [desktopImages.length, sliderIntervalMs, transitionMs]);

  useEffect(() => {
    if (mobileImages.length <= 1) {
      return;
    }

    const safeInterval = Math.max(sliderIntervalMs, transitionMs + 1200);
    const timer = window.setInterval(() => {
      setMobileIndex((current) => (current + 1) % mobileImages.length);
    }, safeInterval);

    return () => window.clearInterval(timer);
  }, [mobileImages.length, sliderIntervalMs, transitionMs]);

  const currentDesktopImage = desktopImages.length > 0 ? desktopImages[desktopIndex] : undefined;
  const currentMobileImage = mobileImages.length > 0 ? mobileImages[mobileIndex] : currentDesktopImage;
  const transitionSeconds = transitionMs / 1000;

  return (
    <div className="space-y-8">
      <section className="relative left-1/2 right-1/2 h-[100dvh] min-h-[620px] w-screen -translate-x-1/2 overflow-hidden bg-slate-950">
        <AnimatePresence initial={false} mode="sync">
          {currentDesktopImage ? (
            <SliderLayer
              key={`desktop-${currentDesktopImage}`}
              imageUrl={currentDesktopImage}
              effect={transitionEffect}
              durationSeconds={transitionSeconds}
              desktopOnly
            />
          ) : null}
        </AnimatePresence>

        <AnimatePresence initial={false} mode="sync">
          {currentMobileImage ? (
            <SliderLayer
              key={`mobile-${currentMobileImage}`}
              imageUrl={currentMobileImage}
              effect={transitionEffect}
              durationSeconds={transitionSeconds}
              mobileOnly
            />
          ) : null}
        </AnimatePresence>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background via-background/56 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 backdrop-blur-[6px] [mask-image:linear-gradient(to_top,black,transparent)]" />
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.35fr,0.95fr]">
          <div className="glass-card rounded-[28px] p-6 md:p-8">
            <div className="space-y-5">
              <span className="inline-flex rounded-md border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Arex
              </span>

              <h1 className="font-heading text-4xl font-extrabold uppercase leading-[0.95] text-foreground md:text-5xl lg:text-7xl">
                {heroTitle || "NƠI TIMELINE SỰ KIỆN, TIN NÓNG VÀ GALLERY CỘNG ĐỒNG HỘI TỤ"}
              </h1>

              <p className="max-w-2xl text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground md:text-base">
                THEO DÕI SỰ KIỆN THEO DÒNG THỜI GIAN, CẬP NHẬT TIN TỨC THEO CHUYÊN MỤC VÀ QUẢN TRỊ
                NỘI DUNG TẬP TRUNG VỚI TRẢI NGHIỆM HIỆN ĐẠI, MƯỢT MÀ.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button asChild size="lg" className="h-12 rounded-xl">
                  <Link href="/calendar">
                    XEM LỊCH SỰ KIỆN
                    <CalendarClock className="ml-2 size-4" />
                  </Link>
                </Button>

                <Button asChild size="lg" variant="outline" className="h-12 rounded-xl">
                  <Link href="/events">
                    KHÁM PHÁ SỰ KIỆN
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="glass-card grid gap-3 rounded-[24px] p-4 md:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary dark:text-amber-300">
              TỔNG QUAN TRỰC TIẾP
            </p>

            <div className="grid gap-3">
              <div className="theme-control-surface flex items-center justify-between rounded-xl px-4 py-3">
                <span className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  SỰ KIỆN ĐANG DIỄN RA
                </span>
                <strong className="font-heading text-2xl text-primary dark:text-amber-300">{activeEventCount}</strong>
              </div>

              <div className="theme-control-surface flex items-center justify-between rounded-xl px-4 py-3">
                <span className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  BÀI VIẾT ĐÃ ĐĂNG
                </span>
                <strong className="font-heading text-2xl text-primary dark:text-amber-300">{publishedNewsCount}</strong>
              </div>

              <div className="theme-control-surface flex items-center justify-between rounded-xl px-4 py-3">
                <span className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  HỆ THỐNG SẴN SÀNG
                </span>
                <strong className="inline-flex items-center gap-2 font-heading text-2xl text-emerald-600 dark:text-emerald-400">
                  <span className="relative flex size-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/75 dark:bg-emerald-400/75" />
                    <span className="relative inline-flex size-3 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                  </span>
                  24/7
                </strong>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
