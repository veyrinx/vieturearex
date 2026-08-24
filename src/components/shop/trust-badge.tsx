import Link from "next/link";
import { AlertTriangle, ShieldCheck, ShieldQuestion } from "lucide-react";
import type { SellerTrust } from "@/lib/server/scam-registry";

/**
 * Nhãn uy tín người bán hiện cho người mua.
 *
 * Chỉ `import type` từ scam-registry (module server-only) nên file này vẫn là
 * component thuần hiển thị — dữ liệu do trang server truyền xuống.
 *
 * Nguyên tắc chữ nghĩa: cảnh báo nói rõ NGUỒN ("tranh chấp đã xử hoàn tiền
 * người mua") chứ không phán người bán là kẻ lừa đảo. Cảnh báo là dữ kiện để
 * người mua tự cân nhắc, không phải bản án.
 */

export function TrustBadge({
  trust,
  uidFlagged = false,
}: {
  trust: SellerTrust | null;
  /** UID game của chính tin này từng dính tranh chấp. */
  uidFlagged?: boolean;
}) {
  if (!trust) return null;

  const sellerFlagged = trust.scamFlags > 0;

  // Có cảnh báo thì cảnh báo đè lên mọi thứ khác — kể cả người bán nhiều đơn.
  if (sellerFlagged || uidFlagged) {
    return (
      <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3">
        <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-rose-600 dark:text-rose-400">
          <AlertTriangle className="size-3.5 shrink-0" /> Cần thận trọng
        </p>
        <ul className="mt-1.5 space-y-1 text-[11px] leading-relaxed text-rose-700 dark:text-rose-300">
          {sellerFlagged && (
            <li>
              Người bán có {trust.scamFlags} cảnh báo còn hiệu lực, sinh từ tranh chấp đã được xử
              hoàn tiền người mua.
            </li>
          )}
          {uidFlagged && (
            <li>
              Chính acc trong tin này từng nằm trong một tranh chấp đã xử — acc có thể đã đổi chủ
              nhiều lần.
            </li>
          )}
          <li>
            Chỉ giao dịch qua trung gian Arex. Chuyển khoản thẳng là mất quyền được hoàn tiền.
          </li>
        </ul>
        <Link
          href="/check-scam"
          className="mt-2 inline-flex items-center text-[11px] font-bold text-rose-600 underline underline-offset-2 dark:text-rose-400"
        >
          Tra hồ sơ rủi ro →
        </Link>
      </div>
    );
  }

  if (trust.level === "trusted") {
    return (
      <p className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
        <ShieldCheck className="size-3.5 shrink-0" />
        Người bán uy tín · {trust.ordersDone} đơn thành công
        {trust.ratingAvg != null && ` · ${trust.ratingAvg}★`}
      </p>
    );
  }

  if (trust.level === "new") {
    return (
      <p className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
        <ShieldQuestion className="size-3.5 shrink-0" />
        Người bán mới, chưa có lịch sử giao dịch — nên đi qua trung gian Arex.
      </p>
    );
  }

  // level "ok": đủ đơn để không còn là người lạ, chưa đủ để gắn nhãn uy tín.
  return null;
}
