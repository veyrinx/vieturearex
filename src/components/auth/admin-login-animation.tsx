"use client";

import { useEffect, useState } from "react";
import Lottie from "lottie-react";
import lockAnimation from "@/assets/lottie/admin/lock.json";
import loadingAnimation from "@/assets/lottie/admin/loading.json";
import checkAnimation from "@/assets/lottie/admin/check.json";
import wrongAnimation from "@/assets/lottie/admin/wrong.json";

export type AdminLoginAnimationState = "idle" | "loading" | "success" | "error";
type AdminLoginResolvedState = Exclude<AdminLoginAnimationState, "idle" | "loading">;

type AdminLoginAnimationProps = {
  state: AdminLoginAnimationState;
  attemptKey: number;
  onResultComplete?: (state: AdminLoginResolvedState) => void;
};

export function AdminLoginAnimation({ state, attemptKey, onResultComplete }: AdminLoginAnimationProps) {
  const [visibleState, setVisibleState] = useState<AdminLoginAnimationState>("idle");
  const [loopCount, setLoopCount] = useState(0);
  const [queuedResult, setQueuedResult] = useState<AdminLoginResolvedState | null>(null);
  const [playKey, setPlayKey] = useState(0);

  useEffect(() => {
    if (state === "idle") {
      setVisibleState("idle");
      setLoopCount(0);
      setQueuedResult(null);
      setPlayKey((current) => current + 1);
      return;
    }

    if (state === "loading") {
      setVisibleState("loading");
      setLoopCount(0);
      setQueuedResult(null);
      setPlayKey((current) => current + 1);
      return;
    }

    setQueuedResult(state);
  }, [state, attemptKey]);

  useEffect(() => {
    if (visibleState === "loading" && queuedResult && loopCount >= 2) {
      setVisibleState(queuedResult);
      setPlayKey((current) => current + 1);
    }
  }, [loopCount, queuedResult, visibleState]);

  const animationData =
    visibleState === "success"
      ? checkAnimation
      : visibleState === "error"
        ? wrongAnimation
        : visibleState === "loading"
          ? loadingAnimation
          : lockAnimation;

  return (
    <div className="mb-2">
      <Lottie
        key={playKey}
        animationData={animationData}
        loop={visibleState === "idle" || visibleState === "loading"}
        autoplay
        onComplete={() => {
          if (visibleState === "success" || visibleState === "error") {
            onResultComplete?.(visibleState);
          }
        }}
        onLoopComplete={() => {
          if (visibleState !== "loading") {
            return;
          }

          setLoopCount((current) => current + 1);
        }}
        className="mx-auto h-32 w-32"
      />
    </div>
  );
}
