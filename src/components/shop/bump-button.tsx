"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpFromLine, Loader2 } from "lucide-react";
import { toast } from "sonner";

const COOLDOWN_MS = 24 * 3_600_000;

/**
 * Đẩy tin lên đầu danh sách "mới nhất".
 *
 * Nút tự khoá khi chưa đủ 24 giờ kể từ lần đẩy trước — server vẫn kiểm tra
 * lại, đây chỉ là để người bán khỏi bấm vào rồi ăn lỗi.
 */
export function BumpButton({ id, bumpedAt }: { id: string; bumpedAt: string | null }) {
  const router = useRouter();
  const [sending, setSending] = useState(false);

  const last = bumpedAt ? Date.parse(bumpedAt) : 0;
  const waitMs = COOLDOWN_MS - (Date.now() - last);
  const ready = waitMs <= 0;

  const bump = async () => {
    setSending(true);
    try {
      const res = await fetch(`/api/shop/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bump" }),
      });
      const d = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(d.error ?? "Không đẩy được tin.");
        return;
      }
      toast.success("Đã đẩy tin lên đầu chợ.");
      router.refresh();
    } catch {
      toast.error("Lỗi mạng, thử lại.");
    } finally {
      setSending(false);
    }
  };

  return (
    <button
      onClick={() => void bump()}
      disabled={sending || !ready}
      title={ready ? "Đưa tin lên đầu danh sách" : "Mỗi tin chỉ đẩy 1 lần/ngày"}
      className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-border py-1 text-[10px] font-bold text-muted-foreground transition hover:border-primary/40 hover:text-primary disabled:opacity-50"
    >
      {sending ? <Loader2 className="size-3 animate-spin" /> : <ArrowUpFromLine className="size-3" />}
      {ready ? "Đẩy tin" : `Đẩy lại sau ${Math.ceil(waitMs / 3_600_000)}h`}
    </button>
  );
}
