import { Metadata } from "next";
import Link from "next/link";
import { RefreshCw, WifiOff, Home } from "lucide-react";

export const metadata: Metadata = {
  title: "Không có kết nối — Arex Network",
  description: "Bạn đang ngoại tuyến. Kiểm tra kết nối Internet để tiếp tục duyệt Arex Network.",
  robots: "noindex",
};

export default function OfflinePage() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="mx-auto mb-6 w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center">
          <WifiOff className="size-12 text-primary" />
        </div>
        <h1 className="text-2xl font-bold uppercase tracking-tight mb-3">
          Không có kết nối mạng
        </h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Arex Network cần Internet để tải nội dung mới nhất. Hãy kiểm tra Wi-Fi
          hoặc dữ liệu di động rồi thử lại.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => window.location.reload()}
            className="group flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98]"
          >
            <RefreshCw className="size-5 transition-transform group-hover:rotate-90" />
            Thử lại
          </button>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3 font-semibold text-foreground transition-colors hover:bg-muted active:scale-[0.98]"
          >
            <Home className="size-5" />
            Về trang chủ
          </Link>
        </div>
        <p className="mt-6 text-xs text-muted-foreground/60">
          Nếu vấn đề vẫn tiếp diễn, vui lòng kiểm tra cài đặt mạng của thiết bị.
        </p>
      </div>
    </main>
  );
}