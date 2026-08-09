import type { Metadata } from "next";
import { Phone, ShieldCheck, Globe } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { PhoneLookupTool } from "@/components/tools/phone-lookup-tool";

export const metadata: Metadata = {
  title: "Phone Lookup Việt Nam — Tra Cứu Số Điện Thoại",
  description:
    "Công cụ Phone Lookup Việt Nam. Tra cứu thông tin nhà mạng, quốc gia, loại số và tính hợp lệ của số điện thoại Việt Nam chuẩn 84.",
  alternates: { canonical: `${siteConfig.url}/phone-lookup` },
  openGraph: {
    title: "Phone Lookup Việt Nam | Arex",
    description:
      "Tra cứu thông tin nhà mạng, SĐT quốc tế, loại số và tính hợp lệ của số điện thoại Việt Nam.",
    url: `${siteConfig.url}/phone-lookup`,
    type: "website",
  },
};

export default function PhoneLookupPage() {
  return (
    <div className="mx-auto max-w-4xl py-8 md:py-12 space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-card p-7 md:p-10 shadow-lg">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/5 dark:from-cyan-500/20" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent" />
        <div className="relative space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-400">
            Công Cụ Cộng Đồng · Arex
          </p>
          <h1 className="font-heading text-3xl font-black uppercase tracking-tight text-foreground md:text-4xl">
            Phone Lookup <span className="text-cyan-600 dark:text-cyan-400">VietNam</span>
          </h1>
          <p className="max-w-xl text-sm font-medium leading-relaxed text-muted-foreground">
            Tra cứu thông tin nhà mạng, định dạng quốc tế, loại số và tình trạng xác thực của các số điện thoại Việt Nam.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            {[
              { icon: Phone, text: "Chấp nhận đầu số 84" },
              { icon: Globe, text: "Tra cứu quốc tế" },
              { icon: ShieldCheck, text: "Hiển thị dữ liệu RAW" },
            ].map(({ icon: Icon, text }) => (
              <span
                key={text}
                className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-50 dark:bg-cyan-950/60 px-3.5 py-1.5 text-[11px] font-bold text-cyan-800 dark:text-cyan-300 shadow-sm"
              >
                <Icon className="size-3.5 text-cyan-600 dark:text-cyan-400" />
                {text}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tool Component */}
      <PhoneLookupTool />
    </div>
  );
}
