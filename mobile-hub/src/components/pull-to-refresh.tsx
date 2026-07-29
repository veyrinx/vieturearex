import { useEffect, useRef, useState, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { haptic } from "@/lib/native";
import { cx } from "@/components/ui";

/**
 * Kéo xuống để tải lại — cử chỉ ai cũng biết trên điện thoại.
 *
 * Tự viết thay vì dùng thư viện vì chỉ cần đúng một cử chỉ, mà thêm thư viện
 * là thêm cân nặng cho bundle vốn đã to.
 *
 * Chỉ bắt cử chỉ khi trang đang ở đỉnh (`scrollY === 0`), nếu không sẽ cướp
 * mất thao tác cuộn bình thường.
 */

/** Kéo quá ngần này (px) rồi thả thì mới tải lại. */
const THRESHOLD = 72;

/** Kéo tối đa, để dải kéo không dài vô tận. */
const MAX_PULL = 110;

export function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<unknown>;
  children: ReactNode;
}) {
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  // Đã rung báo "thả ra là tải" chưa — tránh rung liên tục khi kéo qua lại.
  const buzzed = useRef(false);

  useEffect(() => {
    function onTouchStart(event: TouchEvent) {
      if (refreshing || window.scrollY > 0) return;
      startY.current = event.touches[0].clientY;
      buzzed.current = false;
    }

    function onTouchMove(event: TouchEvent) {
      if (startY.current === null) return;

      const delta = event.touches[0].clientY - startY.current;
      // Vuốt lên hoặc trang đã rời đỉnh → trả về thao tác cuộn thường.
      if (delta <= 0 || window.scrollY > 0) {
        startY.current = null;
        setDistance(0);
        return;
      }

      // Càng kéo càng nặng tay, giống cảm giác gốc của iOS.
      const pulled = Math.min(MAX_PULL, delta * 0.45);
      setDistance(pulled);

      if (pulled >= THRESHOLD && !buzzed.current) {
        buzzed.current = true;
        haptic("light");
      }
    }

    async function onTouchEnd() {
      if (startY.current === null) return;
      const pulled = distance;
      startY.current = null;

      if (pulled < THRESHOLD) {
        setDistance(0);
        return;
      }

      setRefreshing(true);
      setDistance(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setDistance(0);
      }
    }

    // `passive: true` để trình duyệt không phải chờ xem có preventDefault
    // không — cuộn giữ nguyên độ mượt.
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("touchcancel", onTouchEnd);

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [distance, refreshing, onRefresh]);

  const active = distance >= THRESHOLD || refreshing;

  return (
    <>
      <div
        aria-hidden={!active}
        className="pointer-events-none fixed inset-x-0 top-0 z-30 flex justify-center"
        style={{
          transform: `translateY(${distance}px)`,
          opacity: distance === 0 ? 0 : Math.min(1, distance / THRESHOLD),
          // Lúc đang kéo thì bám tay (không transition), lúc thả mới trượt về.
          transition: startY.current === null ? "transform .25s, opacity .25s" : "none",
        }}
      >
        <span className="mt-2 grid size-9 place-items-center rounded-full border border-ink-700 bg-ink-900 shadow-lg">
          <RefreshCw
            className={cx(
              "size-4",
              active ? "text-cyan-glow" : "text-mist-500",
              refreshing && "animate-spin",
            )}
            style={refreshing ? undefined : { transform: `rotate(${distance * 3}deg)` }}
          />
        </span>
      </div>

      <div
        style={{
          transform: `translateY(${distance * 0.5}px)`,
          transition: startY.current === null ? "transform .25s" : "none",
        }}
      >
        {children}
      </div>
    </>
  );
}
