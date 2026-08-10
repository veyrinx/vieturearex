"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { isNativeApp } from "@/lib/native/bridge";

// Publisher id from the AdSense loader script in the root layout.
const DEFAULT_CLIENT = "ca-pub-6400047965945515";

// Ngưỡng mobile trùng breakpoint `md` của Tailwind để công tắc trong admin khớp
// với những gì layout coi là mobile.
const MOBILE_QUERY = "(max-width: 767.98px)";

type AdSenseProps = {
  /** data-ad-slot from your AdSense account. Ad won't render without it. */
  slot?: string | null;
  /** data-ad-client (ca-pub-…). Defaults to the site publisher id. */
  client?: string | null;
  format?: string;
  responsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
  /** Công tắc trong Cài đặt → Quảng cáo. Mặc định bật để không đổi hành vi cũ. */
  showOnMobile?: boolean;
  showOnDesktop?: boolean;
  /** Bọc trong khung nét đứt kèm nhãn "Quảng cáo" (dùng cho các ô trong nội dung). */
  framed?: boolean;
  frameClassName?: string;
};

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * A single Google AdSense unit. Renders nothing unless a slot id is provided
 * (so unconfigured slots stay invisible instead of showing an empty box).
 * The AdSense loader script itself lives in the root layout.
 *
 * Quyết định hiện/ẩn làm sau khi mount, không phải lúc SSR: cùng một trang được
 * cache dùng chung cho mọi thiết bị, nên chỉ client mới biết đang là mobile hay
 * desktop. Nhờ vậy `adsbygoogle.push` không bao giờ chạy ở thiết bị đã tắt —
 * quan trọng vì đẩy một unit rồi giấu bằng CSS là cách dễ dính lượt hiển thị
 * không hợp lệ với AdSense.
 */
export function AdSense({
  slot,
  client = DEFAULT_CLIENT,
  format = "auto",
  responsive = true,
  className,
  style,
  showOnMobile = true,
  showOnDesktop = true,
  framed = false,
  frameClassName,
}: AdSenseProps) {
  const pushed = useRef(false);
  // null = chưa biết (chưa mount). Chỉ render khi đã chốt là true.
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    // Chính sách AdSense cấm quảng cáo trong WebView của app native → không render.
    if (isNativeApp()) {
      setVisible(false);
      return;
    }
    const mq = window.matchMedia(MOBILE_QUERY);
    const sync = () => setVisible(mq.matches ? showOnMobile : showOnDesktop);
    sync();
    // Xoay ngang máy tính bảng có thể vượt ngưỡng — theo dõi để khỏi kẹt trạng thái cũ.
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [showOnMobile, showOnDesktop]);

  useEffect(() => {
    if (!slot || pushed.current || visible !== true) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch { /* AdSense not ready / blocked — ignore */ }
  }, [slot, visible]);

  if (!slot || visible !== true) return null;

  const unit = (
    <ins
      className={cn("adsbygoogle block", className)}
      style={{ display: "block", ...style }}
      data-ad-client={client || DEFAULT_CLIENT}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive ? "true" : "false"}
    />
  );

  if (!framed) return unit;

  // Khung nằm trong cùng component với unit để khi tắt quảng cáo ở một thiết bị
  // thì không còn cái hộp rỗng kèm chữ "Quảng cáo" trơ lại giữa trang.
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-dashed border-border/60 bg-card/40 p-2", frameClassName)}>
      <p className="mb-1 text-center text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">
        Quảng cáo
      </p>
      {unit}
    </div>
  );
}
