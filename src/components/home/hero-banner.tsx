"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Icon } from "@/components/common/icon";
import { HeroCountdown } from "@/components/home/hero-countdown";
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
      initial: { opacity: 0, scale: 1.05, filter: "blur(8px)" },
      animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
      exit: { opacity: 0, scale: 1.02, filter: "blur(3px)" },
    };
  }
  if (effect === "drift") {
    return {
      initial: { opacity: 0, x: 20, scale: 1.03 },
      animate: { opacity: 1, x: 0, scale: 1 },
      exit: { opacity: 0, x: -20, scale: 1.01 },
    };
  }
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  };
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
  const reduceMotion = useReducedMotion();

  // Parallax theo con trỏ — biên độ nhỏ, chỉ đủ gợi chiều sâu chứ không kéo ảnh trôi.
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 45, damping: 24 });
  const springY = useSpring(mouseY, { stiffness: 45, damping: 24 });
  const parallaxX = useTransform(springX, [-0.5, 0.5], [12, -12]);
  const parallaxY = useTransform(springY, [-0.5, 0.5], [9, -9]);

  // Chỉ bật parallax cho con trỏ chính xác (chuột). Trên cảm ứng nó không bao
  // giờ chạy nhưng vẫn bắt sự kiện và vẫn giữ ảnh hero ở scale 1.05 — tức là
  // trả giá cho một hiệu ứng không ai thấy, đúng trên nhóm máy yếu nhất.
  const [pointerFine, setPointerFine] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    const sync = () => setPointerFine(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const parallaxOn = pointerFine && !reduceMotion;

  // Kích thước/vị trí hero đo một lần rồi giữ lại; chỉ bỏ nhớ khi cuộn hoặc đổi
  // kích thước cửa sổ, vì đó là hai thứ duy nhất làm nó lệch.
  const rectRef = useRef<DOMRect | null>(null);
  useEffect(() => {
    const invalidate = () => { rectRef.current = null; };
    window.addEventListener("scroll", invalidate, { passive: true });
    window.addEventListener("resize", invalidate);
    return () => {
      window.removeEventListener("scroll", invalidate);
      window.removeEventListener("resize", invalidate);
    };
  }, []);

  const handleParallax = useCallback(
    (e: ReactMouseEvent<HTMLElement>) => {
      if (!parallaxOn) return;
      // getBoundingClientRect trong mousemove buộc trình duyệt tính lại layout ở
      // mỗi lần con trỏ nhích. Kích thước hero chỉ đổi khi resize, nên đo một
      // lần rồi dùng lại là đủ.
      const rect = rectRef.current ?? e.currentTarget.getBoundingClientRect();
      rectRef.current = rect;
      mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
      mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
    },
    [parallaxOn, mouseX, mouseY],
  );

  // Tàn lửa bay lên — vị trí/nhịp cố định theo index để tránh lệch hydrate.
  const embers = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        left: (i * 67 + 5) % 100,
        size: 2 + (i % 2),
        duration: 8 + (i % 5),
        delay: (i % 7) * 1.1,
        drift: ((i % 5) - 2) * 20,
        rise: 320 + (i % 4) * 80,
      })),
    [],
  );

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
  const transitionSecs = reduceMotion ? 0.35 : transitionMs / 1000;
  const hasMultiple = allImages.length > 1;
  // Khi người dùng bật giảm chuyển động thì mọi hiệu ứng chuyển cảnh rút về fade.
  const variants = reduceMotion ? getSliderVariants("fade") : getSliderVariants(transitionEffect);

  // Từ đầu tiên là dòng nhấn thương hiệu, phần còn lại xuống dòng và tự ngắt —
  // an toàn với mọi độ dài tiêu đề admin đặt, không phụ thuộc vị trí từ.
  const titleWords = (heroTitle?.trim() || "AREX COMMUNITY HUB").split(/\s+/);
  const leadWord = titleWords[0];
  const restWords = titleWords.slice(1).join(" ");

  const stats = [
    { icon: "local_fire_department", label: "Sự kiện",  value: activeEventCount },
    { icon: "newspaper",             label: "Bài viết", value: publishedNewsCount },
    { icon: "image",                 label: "Ảnh",      value: galleryCount },
  ];

  return (
    <section
      // Full-bleed thật sự: trước đây hero chỉ dùng -mx-4/-mx-6 nên dừng ở mép
      // container max-w-7xl, trong khi dải ticker ngay dưới lại tràn hết màn —
      // hai mép lệch nhau trông như lỗi. Nay cả hai cùng chạm mép viewport.
      className="relative left-1/2 -mt-6 flex w-screen -translate-x-1/2 min-h-[clamp(560px,86svh,900px)] items-end overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => { setIsPaused(false); mouseX.set(0); mouseY.set(0); }}
      onMouseMove={handleParallax}
    >
      {/* ── Lớp nền ── */}
      <div className="absolute inset-0 bg-slate-950">
        {/* Gradient nền dự phòng khi chưa có ảnh */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_60%_-10%,hsl(var(--primary-on-dark)/0.22),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_10%_110%,hsl(var(--brand-2)/0.16),transparent)]" />

        {/* Ảnh slider — lớp bọc parallax, scale để không hở mép khi dịch */}
        <motion.div
          className="absolute inset-0"
          style={parallaxOn ? { x: parallaxX, y: parallaxY, scale: 1.05 } : undefined}
        >
          <AnimatePresence mode="sync" initial={false}>
            {currentImage && (
              <motion.div
                key={currentImage}
                initial={variants.initial}
                animate={variants.animate}
                exit={variants.exit}
                transition={{ duration: transitionSecs, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0"
              >
                {/* Real <img> (not a CSS background) so it's a proper, high-priority LCP
                    element that pairs with the <link rel="preload"> on the homepage.
                    Raw img (not next/image) because hero URLs are admin-set and may point
                    to hosts outside next.config's allowlist. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentImage}
                  alt=""
                  aria-hidden
                  fetchPriority="high"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 size-full object-cover"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Scrim đọc chữ — một lớp dọc lo tương phản chung, một lớp ngang siết
            riêng nửa trái nơi đặt nội dung. Gọn hơn 4 lớp gradient cũ và không
            làm đục ảnh ở nửa phải. */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/40 to-black/10" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(100deg, rgba(0,0,0,0.86) 0%, rgba(0,0,0,0.66) 28%, rgba(0,0,0,0.28) 52%, transparent 72%)",
          }}
        />

        {/* Quầng sáng nền — trước đây là khối `blur-[120px]` bị framer-motion
            phóng to/thu nhỏ vô hạn, tức là dựng lại một lớp mờ 520×420 ở mỗi
            khung hình suốt thời gian mở trang. Nay gradient tự mềm sẵn (không
            cần filter) và chỉ "thở" bằng opacity qua keyframes CSS. */}
        <div
          className="ambient-orb orb-breathe absolute bottom-0 left-0 h-[420px] w-[520px]"
          style={{ ["--orb" as string]: "hsl(var(--primary-on-dark)/0.22)" }}
        />
        <div
          className="ambient-orb orb-breathe orb-breathe--slow absolute right-[10%] top-[18%] h-[300px] w-[300px]"
          style={{ ["--orb" as string]: "hsl(var(--brand-2)/0.16)" }}
        />

        {/* Vệt sáng quét ngang — thưa và mờ; keyframes CSS tự tắt khi người dùng
            bật giảm chuyển động (quy tắc chung trong globals.css). */}
        <div
          className="hero-sweep absolute top-[36%] h-px w-48"
          style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary-on-dark)/0.7), rgba(255,255,255,0.6), transparent)" }}
        />

        {/* Vân scanline */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: "linear-gradient(transparent 50%, rgba(0,0,0,1) 50%)",
            backgroundSize: "100% 4px",
          }}
        />

        {/* Vignette mép trên — để navbar nổi trên ảnh sáng */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/45 to-transparent" />

        {/* Tàn lửa bay lên — thắp không khí Free Fire.
            Mỗi hạt từng là một vòng lặp framer-motion riêng, tức 14 vòng chạy
            trên luồng chính vĩnh viễn. Nay là 14 animation CSS thuần, chạy trên
            compositor nên không cướp khung hình của thao tác cuộn. */}
        {!reduceMotion && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {embers.map((p, i) => (
              <span
                key={i}
                className="ember absolute rounded-full"
                style={
                  {
                    left: `${p.left}%`,
                    bottom: -12,
                    width: p.size,
                    height: p.size,
                    background: "radial-gradient(circle, hsl(var(--primary-on-dark)) 0%, transparent 70%)",
                    boxShadow: "0 0 5px hsl(var(--primary-on-dark)/0.6)",
                    "--drift": `${p.drift}px`,
                    "--rise": `${p.rise}px`,
                    "--dur": `${p.duration}s`,
                    "--delay": `${p.delay}s`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Nội dung ── */}
      {/* Cùng max-w-7xl + px-4/px-6 với <main> để mép chữ hero thẳng hàng với
          mọi section bên dưới. */}
      <div className="relative z-10 w-full pb-16 pt-24 md:pb-20 md:pt-32">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="max-w-[46rem] space-y-6">

            {/* Nhãn trạng thái */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-300">
                Đang hoạt động
              </span>
              <span className="h-px w-8 bg-white/25" />
              <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/60">
                Free Fire Vietnam
              </span>
            </motion.div>

            {/* Tiêu đề — hai bậc, một hệ thống: dòng dẫn trắng, dòng nhấn màu
                thương hiệu. Không dùng text-stroke vì rất khó đọc trên nền ảnh. */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              // Chặn dưới 2.25rem chứ không phải 2.75rem: tiêu đề do admin đặt,
              // một từ dài (vd "COMMUNITY") ở 44px đã sát mép màn 360px, chỉ cần
              // dài hơn chút là tràn. `break-words` là lưới an toàn cuối cùng.
              className="font-heading font-black uppercase leading-[0.88] tracking-tight text-balance break-words"
              style={{ fontSize: "clamp(2.25rem, 8.5vw, 6rem)" }}
            >
              <span
                className="block text-white"
                style={{ textShadow: "0 2px 24px rgba(0,0,0,0.55)" }}
              >
                {leadWord}
              </span>
              {restWords && (
                <span
                  className="block text-primary-on-dark"
                  style={{ textShadow: "0 0 32px hsl(var(--primary-on-dark)/0.45), 0 2px 22px rgba(0,0,0,0.65)" }}
                >
                  {restWords}
                </span>
              )}
            </motion.h1>

            {/* Gạch nhấn dưới tiêu đề */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.22 }}
              className="origin-left h-px w-40"
              style={{ background: "linear-gradient(90deg, hsl(var(--primary-on-dark)), transparent)" }}
            />

            {/* Mô tả */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.26 }}
              className="max-w-lg text-sm leading-relaxed text-white/75 md:text-base"
            >
              Theo dõi sự kiện, cập nhật tin tức Esports và kết nối cộng đồng Free Fire Việt Nam.
            </motion.p>

            {/* Chỉ số nhanh + đếm ngược — cùng một hàng, cùng một ngôn ngữ thị giác */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.32 }}
              className="flex flex-wrap items-center gap-2"
            >
              {stats.map(({ icon, label, value }) => (
                <div
                  key={label}
                  // Không backdrop-blur: các thẻ này nằm đè lên lớp ảnh có
                  // parallax, nên mỗi lần ảnh nhích là trình duyệt phải lấy mẫu
                  // và làm mờ lại vùng phía sau. Nền đặc hơn một chút cho cùng
                  // độ tương phản mà không tốn gì.
                  className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.14] px-3.5 py-1.5"
                >
                  <Icon name={icon} size={14} className="shrink-0 text-primary-on-dark" />
                  <span className="font-heading text-sm font-black tabular-nums text-white">{value}</span>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-white/55">{label}</span>
                </div>
              ))}
            </motion.div>

            {/* Đồng hồ tự lo state của nó — hero không re-render theo mỗi giây. */}
            {nextEventDate && <HeroCountdown target={nextEventDate} />}

            {/* Nút hành động */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.42 }}
              className="flex flex-row flex-wrap gap-3 pt-1"
            >
              <Button
                asChild
                size="lg"
                className="h-11 rounded-xl px-6"
                style={{ boxShadow: "0 4px 24px hsl(var(--primary)/0.45)" }}
              >
                <Link href="/calendar">
                  XEM LỊCH SỰ KIỆN
                  <Icon name="calendar_month" size={16} className="ml-2" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-11 rounded-xl border-white/25 bg-white/[0.14] px-5 text-white hover:bg-white/25 hover:text-white hover:border-white/40"
              >
                <Link href="/news">
                  TIN TỨC
                  <Icon name="arrow_forward" size={16} className="ml-2" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── Điều khiển slider ── */}
      {hasMultiple && (
        <>
          {/* Vùng chạm và chấm hiển thị tách làm hai lớp: chấm vẫn nhỏ như thiết
              kế, còn <button> được nới ra ~44px — mức tối thiểu để ngón tay bấm
              trúng. Trên mobile đây là cách duy nhất đổi ảnh vì hai mũi tên
              trái/phải chỉ hiện từ md trở lên. */}
          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 md:bottom-4">
            {allImages.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Ảnh ${i + 1}`}
                aria-current={i === index}
                // min-w-9 chứ không phải w cố định: chấm đang chọn rộng 28px,
                // khung hẹp hơn thì nó tràn ra ngoài vùng chạm.
                className="group flex h-11 min-w-9 items-center justify-center px-1"
              >
                <span
                  className={[
                    "block rounded-full transition-all duration-300",
                    i === index
                      ? "h-1.5 w-7 bg-white shadow-[0_0_10px_rgba(255,255,255,0.6)]"
                      : "size-1.5 bg-white/35 group-hover:bg-white/65",
                  ].join(" ")}
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={prev}
            aria-label="Ảnh trước"
            className="absolute left-3 top-1/2 z-20 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white transition-colors hover:border-white/40 hover:bg-black/70 md:left-5 md:flex"
          >
            <Icon name="chevron_left" size={18} />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Ảnh tiếp theo"
            className="absolute right-3 top-1/2 z-20 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white transition-colors hover:border-white/40 hover:bg-black/70 md:right-5 md:flex"
          >
            <Icon name="chevron_right" size={18} />
          </button>
        </>
      )}

      {/* Hoà mép dưới vào nền trang */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
