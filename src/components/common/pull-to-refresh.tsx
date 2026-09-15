"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { callPlugin, isNativeApp } from "@/lib/native/bridge";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
  threshold?: number;
  maxPull?: number;
}

export function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
  threshold = 80,
  maxPull = 140,
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [shouldRefresh, setShouldRefresh] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isScrolling = useRef(false);
  const animationFrame = useRef<number | null>(null);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing) return;
      const container = containerRef.current;
      if (!container) return;

      if (container.scrollTop === 0) {
        isScrolling.current = true;
        startY.current = e.touches[0].clientY;
      }
    },
    [disabled, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isScrolling.current || disabled || isRefreshing) return;

      currentY.current = e.touches[0].clientY;
      const delta = currentY.current - startY.current;

      if (delta > 0) {
        e.preventDefault();
        const distance = Math.min(delta * 0.5, maxPull);
        setPullDistance(distance);
        setIsPulling(true);

        if (distance >= threshold && !shouldRefresh) {
          setShouldRefresh(true);
          callPlugin("Haptics", "impact", { style: "MEDIUM" });
        }
      }
    },
    [disabled, isRefreshing, maxPull, threshold, shouldRefresh]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isScrolling.current || disabled || isRefreshing) return;

    isScrolling.current = false;

    if (shouldRefresh) {
      setIsRefreshing(true);
      setIsPulling(false);
      callPlugin("Haptics", "impact", { style: "HEAVY" });

      try {
        await onRefresh();
      } catch (error) {
        console.error("Pull to refresh failed:", error);
      } finally {
        setIsRefreshing(false);
        setShouldRefresh(false);
        setPullDistance(0);
      }
    } else {
      setIsPulling(false);
      setPullDistance(0);
    }
  }, [disabled, isRefreshing, onRefresh, shouldRefresh]);

  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 360;
  const opacity = Math.min(progress, 1);

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto touch-none", "h-full")}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{
        overscrollBehaviorY: "none",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <AnimatePresence mode="wait">
        {isPulling && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: pullDistance, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-0 left-0 right-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 50, height: pullDistance }}
          >
            <div
              className="flex flex-col items-center gap-2 text-muted-foreground"
              style={{ transform: `translateY(${pullDistance * 0.5}px)` }}
            >
              <motion.div
                animate={{ rotate: isRefreshing ? 360 : rotation }}
                transition={{
                  duration: isRefreshing ? 1 : 0,
                  repeat: isRefreshing ? Infinity : 0,
                  ease: "linear",
                }}
                style={{ willChange: "transform" }}
              >
                <PlatformIcon
                  ios="refresh"
                  android="refresh"
                  size={28}
                  className={cn(
                    "transition-all duration-200",
                    isRefreshing && "text-primary dark:text-amber-400",
                  )}
                />
              </motion.div>
              <span className="text-xs font-medium uppercase tracking-wide">
                {isRefreshing
                  ? "Đang tải lại..."
                  : shouldRefresh
                  ? "Thả để tải lại"
                  : "Kéo xuống để tải lại"}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-full">{children}</div>
    </div>
  );
}

interface NativePullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
}

export function NativePullToRefresh({
  onRefresh,
  children,
  disabled = false,
}: NativePullToRefreshProps) {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(isNativeApp());
  }, []);

  if (isNative) {
    return (
      <div className="h-full">
        {children}
      </div>
    );
  }

  return <PullToRefresh onRefresh={onRefresh} disabled={disabled}>{children}</PullToRefresh>;
}