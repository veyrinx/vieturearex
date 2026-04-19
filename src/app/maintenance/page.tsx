"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Facebook, Youtube, MessageCircle, Wrench, Zap } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";

// ── Countdown hook ─────────────────────────────────────────────────────────
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
    active: !!targetIso && diff > 0,
  };
}

// ── Flip digit ──────────────────────────────────────────────────────────────
function FlipDigit({ value }: { value: string }) {
  const prev = useRef(value);
  const changed = prev.current !== value;
  useEffect(() => { prev.current = value; });

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={value}
        initial={changed ? { y: -20, opacity: 0, scale: 0.8 } : false}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="block"
      >
        {value}
      </motion.span>
    </AnimatePresence>
  );
}

function CountBlock({ value, label }: { value: number; label: string }) {
  const digits = String(value).padStart(2, "0").split("");
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        {/* Glow */}
        <div className="absolute inset-0 rounded-2xl bg-amber-400/20 blur-xl" />
        {/* Card */}
        <div className="relative flex items-center gap-0.5 overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/10 to-amber-500/5 px-3 py-3 backdrop-blur-sm sm:px-4 sm:py-4">
          {/* Top shine */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
          {digits.map((d, i) => (
            <span
              key={i}
              className="flex h-9 w-7 items-center justify-center overflow-hidden font-heading text-2xl font-black tabular-nums text-amber-300 sm:h-11 sm:w-9 sm:text-3xl"
            >
              <FlipDigit value={d} />
            </span>
          ))}
        </div>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">{label}</span>
    </div>
  );
}

// ── Particle ────────────────────────────────────────────────────────────────
function Particles() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 16 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute size-0.5 rounded-full bg-amber-400/40"
          style={{
            left: `${10 + (i * 5.5) % 80}%`,
            top: `${15 + (i * 7.3) % 70}%`,
          }}
          animate={{
            y: [0, -30 - (i % 4) * 10, 0],
            opacity: [0, 0.6, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: 3 + (i % 3),
            repeat: Infinity,
            delay: i * 0.4,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────
export default function MaintenancePage() {
  const [message, setMessage] = useState("Website đang được nâng cấp. Chúng tôi sẽ sớm trở lại với những tính năng mới!");
  const [endTime, setEndTime] = useState<string | null>(null);
  const cd = useCountdown(endTime);

  useEffect(() => {
    fetch("/api/maintenance-info")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { message?: string; endTime?: string } | null) => {
        if (d?.message) setMessage(d.message);
        if (d?.endTime) setEndTime(d.endTime);
      })
      .catch(() => {});
  }, []);

  const socials = [
    { href: siteConfig.links.facebook, icon: Facebook, label: "Facebook", color: "hover:border-blue-500/40 hover:text-blue-400" },
    { href: siteConfig.links.youtube,  icon: Youtube,  label: "YouTube",  color: "hover:border-red-500/40 hover:text-red-400" },
    { href: siteConfig.links.community, icon: MessageCircle, label: "Cộng đồng", color: "hover:border-amber-500/40 hover:text-amber-400" },
  ];

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#050508] px-4 py-12">

      {/* ── Background layers ── */}
      <div className="pointer-events-none absolute inset-0">
        {/* Primary amber glow */}
        <div className="absolute left-1/2 top-0 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-amber-500/8 blur-[140px]" />
        {/* Secondary blue accent */}
        <div className="absolute bottom-0 right-0 h-[500px] w-[500px] translate-x-1/4 translate-y-1/4 rounded-full bg-blue-600/5 blur-[120px]" />
        {/* Left accent */}
        <div className="absolute left-0 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-600/5 blur-[100px]" />
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, #f59e0b 1px, transparent 1px)", backgroundSize: "32px 32px" }}
        />
        {/* Horizontal lines */}
        <div className="absolute inset-x-0 top-1/3 h-px bg-gradient-to-r from-transparent via-amber-500/10 to-transparent" />
        <div className="absolute inset-x-0 top-2/3 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      </div>

      <Particles />

      {/* ── Content ── */}
      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-10 text-center">

        {/* Logo + status badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-5"
        >
          {/* Pulsing ring */}
          <div className="relative">
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-[28px] border-2 border-amber-400/30"
            />
            <motion.div
              animate={{ scale: [1, 1.6, 1], opacity: [0.15, 0, 0.15] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
              className="absolute inset-0 rounded-[28px] border border-amber-400/20"
            />
            <div className="relative rounded-[24px] border border-amber-500/30 bg-gradient-to-b from-amber-500/15 to-amber-500/5 p-1 shadow-[0_0_40px_rgba(245,158,11,0.2)]">
              <Image
                src={siteConfig.favicon}
                alt={siteConfig.shortName}
                width={80}
                height={80}
                className="rounded-[18px]"
                unoptimized
              />
            </div>
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/8 px-5 py-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-amber-400" />
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Đang bảo trì</span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-4"
        >
          <h1 className="font-heading text-4xl font-black uppercase leading-[1.1] tracking-[0.04em] text-white sm:text-5xl lg:text-6xl">
            Sắp Trở Lại<br />
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 bg-clip-text text-transparent">
              Mạnh Mẽ Hơn
            </span>
          </h1>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-white/50 sm:text-base">
            {message}
          </p>
        </motion.div>

        {/* Countdown */}
        <AnimatePresence>
          {cd.active && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full space-y-4"
            >
              <div className="flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/30">
                <Zap className="size-3 text-amber-400" />
                Hoàn thành sau
              </div>
              <div className="flex items-end justify-center gap-4 sm:gap-6">
                {cd.days > 0 && <CountBlock value={cd.days} label="Ngày" />}
                <CountBlock value={cd.hours} label="Giờ" />
                <div className="mb-5 flex flex-col gap-2">
                  <motion.span
                    animate={{ opacity: [1, 0.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="font-heading text-xl font-black text-amber-400/60 sm:text-2xl"
                  >:</motion.span>
                </div>
                <CountBlock value={cd.minutes} label="Phút" />
                <div className="mb-5 flex flex-col gap-2">
                  <motion.span
                    animate={{ opacity: [1, 0.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="font-heading text-xl font-black text-amber-400/60 sm:text-2xl"
                  >:</motion.span>
                </div>
                <CountBlock value={cd.seconds} label="Giây" />
              </div>
              {endTime && (
                <p className="text-xs text-white/25">
                  Dự kiến: {new Date(endTime).toLocaleString("vi-VN", {
                    weekday: "long", day: "2-digit", month: "2-digit",
                    year: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex w-full items-center gap-4"
        >
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">
            <Wrench className="size-3" />
            Theo dõi chúng tôi
          </div>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
        </motion.div>

        {/* Social links */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          {socials.map(({ href, icon: Icon, label, color }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`group flex items-center gap-2.5 rounded-2xl border border-white/8 bg-white/4 px-5 py-3 text-sm font-semibold text-white/50 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/8 hover:shadow-lg ${color}`}
            >
              <Icon className="size-4 transition-transform duration-300 group-hover:scale-110" />
              {label}
            </a>
          ))}
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-[11px] text-white/20"
        >
          © {new Date().getFullYear()} {siteConfig.name} — All rights reserved
        </motion.p>
      </div>
    </div>
  );
}
