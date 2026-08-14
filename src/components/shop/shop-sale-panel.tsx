"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, TicketPercent, X } from "lucide-react";
import { toast } from "sonner";
import {
  MAX_DISCOUNT_PERCENT,
  MIN_DISCOUNT_PERCENT,
  formatVnd,
  priceAfterPercent,
} from "@/lib/constants/shop";
import { cn } from "@/lib/utils";

/** Mốc hạn bấm nhanh. 0 = không hẹn ngày kết thúc. */
const DAY_PRESETS = [0, 3, 7, 14, 30];

/**
 * Giảm giá cả gian hàng một lượt.
 *
 * Mức giảm được ghi thành giá cụ thể cho từng tin đang bán, nên sau khi chạy
 * đợt giảm chủ shop vẫn chỉnh riêng từng tin được — không có "hệ số toàn shop"
 * nào đè lên phía sau.
 */
export function ShopSalePanel({
  sellerId,
  activeCount,
  onSaleCount,
  samplePrice,
}: {
  sellerId: string;
  activeCount: number;
  onSaleCount: number;
  /** Giá một tin bất kỳ đang bán — chỉ để xem thử mức giảm ra con số nào. */
  samplePrice: number | null;
}) {
  const router = useRouter();
  const [percent, setPercent] = useState(10);
  const [days, setDays] = useState(0);
  const [busy, setBusy] = useState<null | "apply" | "clear">(null);

  const run = async (body: Record<string, unknown>, kind: "apply" | "clear") => {
    setBusy(kind);
    try {
      const res = await fetch(`/api/shop/sellers/${sellerId}/sale`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string; updated?: number };
      if (!res.ok) {
        toast.error(data.error ?? "Không chạy được đợt giảm.");
        return;
      }
      toast.success(
        kind === "clear"
          ? "Đã tắt giảm giá toàn shop."
          : `Đã giảm ${percent}% cho ${data.updated ?? 0} tin đang bán.`,
      );
      router.refresh();
    } catch {
      toast.error("Lỗi mạng, thử lại.");
    } finally {
      setBusy(null);
    }
  };

  const confirmApply = () => {
    const when = days > 0 ? `trong ${days} ngày` : "cho tới khi bạn tắt";
    if (!window.confirm(`Giảm ${percent}% cho toàn bộ ${activeCount} tin đang bán, ${when}?`)) return;
    void run({ percent, days }, "apply");
  };

  return (
    <div className="space-y-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-foreground">
          <TicketPercent className="size-4 text-red-500" /> Giảm giá toàn gian hàng
        </p>
        <span className="text-[11px] text-muted-foreground">
          {activeCount} tin đang bán · {onSaleCount} tin đang giảm
        </span>
      </div>

      {activeCount === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          Chưa có tin nào đang bán để giảm giá. Đăng tin và chờ duyệt trước đã.
        </p>
      ) : (
        <>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">
              Mức giảm: <b className="text-red-500">{percent}%</b>
            </span>
            <input
              type="range"
              min={MIN_DISCOUNT_PERCENT}
              max={MAX_DISCOUNT_PERCENT}
              value={percent}
              onChange={(e) => setPercent(Number(e.target.value))}
              className="w-full accent-red-500"
            />
          </label>

          <div className="flex flex-wrap gap-1.5">
            {DAY_PRESETS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                  days === d
                    ? "border-red-500/50 bg-red-500/10 text-red-500"
                    : "border-border text-muted-foreground hover:border-red-500/40",
                )}
              >
                {d === 0 ? "Không hạn" : `${d} ngày`}
              </button>
            ))}
          </div>

          {samplePrice != null && (
            <p className="rounded-xl border border-border bg-background p-2.5 text-[11px] text-muted-foreground">
              Ví dụ: tin đang bán <b className="text-foreground">{formatVnd(samplePrice)}</b> sẽ còn{" "}
              <b className="text-red-500">{formatVnd(priceAfterPercent(samplePrice, percent))}</b>.
              Giá gốc được giữ nguyên để hết đợt là tin tự về giá cũ.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={confirmApply}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-500 px-3.5 py-2 text-xs font-black uppercase text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {busy === "apply" ? <Loader2 className="size-3.5 animate-spin" /> : <TicketPercent className="size-3.5" />}
              Áp dụng cho {activeCount} tin
            </button>
            {onSaleCount > 0 && (
              <button
                onClick={() => void run({ clear: true }, "clear")}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-xs font-bold text-muted-foreground transition hover:border-red-500/40 hover:text-red-500 disabled:opacity-60"
              >
                {busy === "clear" ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
                Tắt giảm giá toàn shop
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
