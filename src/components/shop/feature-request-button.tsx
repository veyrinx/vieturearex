"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

/**
 * Xin đẩy tin lên dải nổi bật.
 *
 * Khác <BumpButton>: đẩy tin là quyền của người bán, bấm là xong; còn nổi bật
 * phải qua admin duyệt. Nút này chỉ đưa tin vào hàng chờ, nên sau khi bấm nó
 * đổi sang trạng thái chờ thay vì biến mất — người bán cần thấy yêu cầu của
 * mình vẫn còn đó, không phải bấm hụt.
 */
export function FeatureRequestButton({
  id,
  featuredUntil,
  requestedAt,
}: {
  id: string;
  featuredUntil: string | null;
  requestedAt: string | null;
}) {
  const router = useRouter();
  const [sending, setSending] = useState(false);

  const featured = !!featuredUntil && Date.parse(featuredUntil) > Date.now();
  const pending = !!requestedAt;

  const request = async () => {
    setSending(true);
    try {
      const res = await fetch(`/api/shop/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "feature_request" }),
      });
      const d = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(d.error ?? "Không gửi được yêu cầu.");
        return;
      }
      toast.success("Đã gửi yêu cầu — admin sẽ duyệt.");
      router.refresh();
    } catch {
      toast.error("Lỗi mạng, thử lại.");
    } finally {
      setSending(false);
    }
  };

  if (featured) {
    const days = Math.max(1, Math.ceil((Date.parse(featuredUntil) - Date.now()) / 86_400_000));
    return (
      <span className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 py-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
        <Sparkles className="size-3" /> Nổi bật · còn {days} ngày
      </span>
    );
  }

  return (
    <button
      onClick={() => void request()}
      disabled={sending || pending}
      title={pending ? "Admin chưa duyệt yêu cầu trước" : "Xin ghim tin ở dải nổi bật đầu chợ"}
      className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-border py-1 text-[10px] font-bold text-muted-foreground transition hover:border-amber-500/40 hover:text-amber-600 disabled:opacity-50 dark:hover:text-amber-400"
    >
      {sending ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
      {pending ? "Đang chờ duyệt" : "Xin nổi bật"}
    </button>
  );
}
