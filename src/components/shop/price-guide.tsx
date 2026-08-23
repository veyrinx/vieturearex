"use client";

import { useEffect, useState } from "react";
import { Loader2, TrendingUp } from "lucide-react";
import { formatVnd, type ListingKind } from "@/lib/constants/shop";

/**
 * Khoảng giá tham chiếu cho một acc.
 *
 * Số liệu đến từ đơn ĐÃ HOÀN TẤT trong chợ Arex (shop_price_history), không
 * phải giá rao — giá rao ai cũng đặt được, giá chốt mới là giá thị trường.
 *
 * Ẩn hẳn khi chưa đủ mẫu: một khoảng giá dựng từ 2 đơn còn hại hơn không có gì.
 */

interface Stats {
  sample: number;
  basis: "similar" | "kind" | "none";
  median: number | null;
  p25: number | null;
  p75: number | null;
  min: number | null;
  max: number | null;
  avgDiscountPercent: number | null;
}

export function PriceGuide({
  kind = "account",
  gameUid,
  level,
  currentPrice,
}: {
  kind?: ListingKind;
  /** UID trong game — có thì tự tra level qua API Free Fire. */
  gameUid?: string;
  level?: number | null;
  /** Giá người bán đang gõ, để đối chiếu ngay tại chỗ. */
  currentPrice?: number;
}) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  const uid = (gameUid ?? "").replace(/\D/g, "");

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ kind });
    if (level) params.set("level", String(level));
    else if (uid.length >= 4) params.set("uid", uid);

    // Chờ người dùng gõ xong UID rồi mới hỏi: mỗi lần hỏi kèm UID là một lượt
    // gọi API Free Fire, gõ 9 chữ số sẽ thành 9 lượt nếu bắn ngay từng phím.
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/shop/price-stats?${params.toString()}`)
        .then((r) => r.json())
        .then((json: Stats) => {
          if (!cancelled) setStats(json);
        })
        .catch(() => {
          if (!cancelled) setStats(null);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [kind, level, uid]);

  if (loading && !stats) {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-2.5 text-[11px] text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> Đang tra khoảng giá thị trường…
      </p>
    );
  }

  if (!stats || stats.basis === "none" || stats.median === null) return null;

  const outOfRange =
    currentPrice && stats.p25 !== null && stats.p75 !== null
      ? currentPrice < stats.p25
        ? "thấp"
        : currentPrice > stats.p75
          ? "cao"
          : null
      : null;

  return (
    <div className="space-y-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
      <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
        <TrendingUp className="size-3" /> Giá thị trường
      </p>

      <p className="text-xs leading-relaxed text-foreground">
        {stats.basis === "similar" ? "Acc tương tự" : "Cùng loại"} bán trung bình{" "}
        <b>{formatVnd(stats.median)}</b>
        {stats.p25 !== null && stats.p75 !== null && (
          <>
            , phổ biến trong khoảng <b>{formatVnd(stats.p25)}</b> – <b>{formatVnd(stats.p75)}</b>
          </>
        )}
        .
      </p>

      {outOfRange && (
        <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
          Giá bạn đặt đang {outOfRange} hơn mặt bằng — {outOfRange === "cao" ? "tin có thể lâu bán" : "cân nhắc kẻo hớ"}.
        </p>
      )}

      <p className="text-[10px] text-muted-foreground">
        Dựa trên {stats.sample} đơn đã hoàn tất trong 12 tháng qua
        {stats.avgDiscountPercent !== null && stats.avgDiscountPercent > 0 && (
          <> · người mua thường trả thấp hơn giá rao khoảng {stats.avgDiscountPercent}%</>
        )}
        {stats.basis === "kind" && <> · chưa đủ acc cùng hạng level nên lấy chung cả loại</>}
      </p>
    </div>
  );
}
