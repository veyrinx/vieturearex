"use client";

import { motion, useInView } from "framer-motion";
import { ReactNode, useRef } from "react";

type RevealProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
  once?: boolean;
  distance?: number;
  duration?: number;
  scale?: number;
  margin?: string;
};

export function Reveal({
  children,
  delay = 0,
  className,
  once = false,
  distance = 30,
  duration = 0.45,
  scale = 0.985,
  margin = "-60px",
}: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once, margin: margin as never });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: distance, scale, filter: "blur(8px)" }}
      animate={
        inView
          ? { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
          : { opacity: 0, y: distance, scale, filter: "blur(8px)" }
      }
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
