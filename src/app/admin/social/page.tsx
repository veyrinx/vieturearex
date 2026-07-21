import type { Metadata } from "next";
import { Share2, Hammer } from "lucide-react";

export const metadata: Metadata = {
  title: "Quản Lý Mạng Xã Hội",
  description: "Quản lý nội dung nhúng từ TikTok, YouTube và các kênh mạng xã hội.",
};

export default function AdminSocialPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-amber-400/10 dark:text-amber-400">
          <Share2 className="size-5" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-black uppercase tracking-tight text-foreground">Mạng Xã Hội</h1>
          <p className="text-xs text-muted-foreground">Quản lý video/nội dung nhúng: TikTok, YouTube, kênh KOL.</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground/60">
          <Hammer className="size-7" />
        </div>
        <div className="space-y-1">
          <p className="font-heading text-sm font-bold uppercase tracking-wide text-foreground">Đang phát triển</p>
          <p className="mx-auto max-w-md text-xs text-muted-foreground">
            Khung quản lý mạng xã hội đã sẵn sàng. Sắp có: thêm link/video TikTok &amp; YouTube, kênh KOL,
            bật/tắt hiển thị và sắp xếp để hiển thị trên trang chủ/khu cộng đồng.
          </p>
        </div>
      </div>
    </div>
  );
}
