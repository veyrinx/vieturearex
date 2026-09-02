import { Skeleton } from "@/components/ui/skeleton";

/**
 * Khung chờ dùng chung cho `loading.tsx` của các trang nặng dữ liệu.
 *
 * Trước đây không route nào có `loading.tsx`, nên trang nào chờ Supabase là cả
 * màn hình đứng im ở trang cũ cho tới khi server trả xong — không có lấy một
 * dấu hiệu là site đang chạy. Có file này thì Next stream phần vỏ ra trước.
 *
 * Cố ý vẽ thô theo bố cục chung (khối tiêu đề + lưới thẻ) chứ không cố khớp
 * từng trang: khớp quá thì đổi trang là khung chờ lệch, mà lệch còn khó chịu
 * hơn là chờ.
 */
export function PageSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="mx-auto max-w-6xl space-y-8 py-8 md:py-12">
      <div className="space-y-3 rounded-3xl border border-border bg-card p-7 md:p-10">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-9 w-3/5 max-w-md" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <Skeleton className="aspect-video w-full rounded-xl" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
