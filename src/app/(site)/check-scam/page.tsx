import type { Metadata } from "next";
import { ShieldAlert, Search, ShieldCheck } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { CheckScamTool } from "@/components/tools/check-scam-tool";

export const metadata: Metadata = {
  title: "Check Scam — Kiểm Tra Tố Cáo Lừa Đảo",
  description:
    "Công cụ Check Scam đối soát thông tin lừa đảo. Kiểm tra Số tài khoản ngân hàng, Họ tên, SĐT, Facebook ID trên hệ thống cảnh báo Checkscam.",
  alternates: { canonical: `${siteConfig.url}/check-scam` },
  openGraph: {
    title: "Check Scam — Kiểm Tra Lừa Đảo | Arex",
    description:
      "Kiểm tra và đối soát thông tin tố cáo lừa đảo (STK, SĐT, Họ và Tên, ID) giúp bạn giao dịch an toàn online.",
    url: `${siteConfig.url}/check-scam`,
    type: "website",
  },
};

export default function CheckScamPage() {
  return (
    <div className="mx-auto max-w-4xl py-8 md:py-12 space-y-8">
      {/* Header Banner - Theme Pink / Rose Red */}
      <div className="relative overflow-hidden rounded-3xl border border-rose-500/30 bg-card p-7 md:p-10 shadow-lg">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-rose-500/10 via-transparent to-pink-500/5 dark:from-rose-500/20" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-500/60 to-transparent" />
        <div className="relative space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-600 dark:text-rose-400">
            Cảnh Báo Giao Dịch · Arex
          </p>
          <h1 className="font-heading text-3xl font-black uppercase tracking-tight text-foreground md:text-4xl">
            Check Scam <span className="text-rose-600 dark:text-rose-500">Kiểm Tra Lừa Đảo</span>
          </h1>
          <p className="max-w-xl text-sm font-medium leading-relaxed text-muted-foreground">
            Đối soát danh sách tài khoản, số điện thoại, tên chủ tài khoản và ID từng bị tố cáo lừa đảo online để giúp bạn mua bán an toàn hơn.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            {[
              { icon: ShieldAlert, text: "Cảnh báo STK & SĐT" },
              { icon: Search, text: "Tra cứu dữ liệu Checkscam" },
              { icon: ShieldCheck, text: "Bảo vệ giao dịch online" },
            ].map(({ icon: Icon, text }) => (
              <span
                key={text}
                className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-50 dark:bg-rose-950/60 px-3.5 py-1.5 text-[11px] font-bold text-rose-800 dark:text-rose-300 shadow-sm"
              >
                <Icon className="size-3.5 text-rose-600 dark:text-rose-400" />
                {text}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tool Component */}
      <CheckScamTool />
    </div>
  );
}
