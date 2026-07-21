import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag, ExternalLink, Hammer } from "lucide-react";

export const metadata: Metadata = {
  title: "Quản Lý Cửa Hàng Prime",
  description: "Quản lý gói thành viên Prime, ưu đãi và quyền lợi.",
};

export default function AdminPrimePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-amber-400/10 dark:text-amber-400">
            <ShoppingBag className="size-5" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-black uppercase tracking-tight text-foreground">Cửa Hàng Prime</h1>
            <p className="text-xs text-muted-foreground">Quản lý gói thành viên, ưu đãi & quyền lợi Prime.</p>
          </div>
        </div>
        <Link
          href="/cua-hang-prime"
          target="_blank"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          <ExternalLink className="size-3.5" /> Xem trang công khai
        </Link>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground/60">
          <Hammer className="size-7" />
        </div>
        <div className="space-y-1">
          <p className="font-heading text-sm font-bold uppercase tracking-wide text-foreground">Đang phát triển</p>
          <p className="mx-auto max-w-md text-xs text-muted-foreground">
            Khung quản lý Cửa hàng Prime đã sẵn sàng. Sắp có: thêm/sửa/xóa gói Prime, giá kim cương,
            quyền lợi, bật/tắt hiển thị và sắp xếp thứ tự.
          </p>
        </div>
      </div>
    </div>
  );
}
