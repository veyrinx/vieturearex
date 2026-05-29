"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, ChevronRight, Headset } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const KEY = "cskh-bar-v1";
const BAR_H = 40;

export function AnnouncementBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(KEY) === "1";
    if (!dismissed) {
      setVisible(true);
      document.documentElement.style.setProperty("--banner-h", `${BAR_H}px`);
    }
  }, []);

  const dismiss = () => {
    document.documentElement.style.setProperty("--banner-h", "0px");
    localStorage.setItem(KEY, "1");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="announce-bar"
          initial={{ height: BAR_H }}
          exit={{ height: 0 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          className="fixed inset-x-0 top-0 z-[65] overflow-hidden"
        >
          <div className="relative flex h-10 items-center justify-center bg-[#060606] px-12 dark:bg-[#060606]">
            {/* Subtle gradient accent line at bottom */}
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <Link
              href="/contact"
              className="group flex items-center gap-2 text-[11px] font-medium tracking-wide text-white/70 transition-all duration-200 hover:text-white"
            >
              <Headset className="size-3.5 shrink-0 text-white/50 transition-colors group-hover:text-white/80" />
              <span>Cần hỗ trợ?</span>
              <span className="hidden text-white/50 sm:inline">·</span>
              <span className="hidden text-white/70 transition-colors group-hover:text-white sm:inline">
                Liên hệ đội ngũ CSKH
              </span>
              <ChevronRight className="size-3 text-white/40 transition-all group-hover:translate-x-0.5 group-hover:text-white/70" />
            </Link>

            <button
              type="button"
              onClick={dismiss}
              aria-label="Đóng thông báo"
              className="absolute right-3 top-1/2 -translate-y-1/2 flex size-6 items-center justify-center rounded-full text-white/30 transition-all hover:bg-white/8 hover:text-white/70"
            >
              <X className="size-3" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
