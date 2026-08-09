"use client";

import { Lock, Wrench, ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";

export function CheckScamTool() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto text-center py-6">
      {/* Khối Thông Báo Bảo Trì */}
      <div className="relative overflow-hidden rounded-3xl border border-rose-500/50 bg-[#160a10] p-8 md:p-12 shadow-2xl space-y-6">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-rose-500/10 via-transparent to-pink-500/5" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-500/60 to-transparent" />

        <div className="relative flex flex-col items-center justify-center space-y-4">
          <div className="relative flex size-20 items-center justify-center rounded-3xl bg-rose-500/20 text-rose-500 border border-rose-500/40 shadow-inner">
            <Lock className="size-9 animate-pulse" />
            <span className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-rose-600 text-white shadow">
              <Wrench className="size-3.5" />
            </span>
          </div>

          <div className="space-y-2 max-w-md">
            <span className="inline-block rounded-full bg-rose-600/30 border border-rose-500/50 px-3.5 py-1 text-xs font-black uppercase tracking-widest text-rose-300">
              ĐANG BẢO TRÌ
            </span>
            <h2 className="font-heading text-2xl md:text-3xl font-black uppercase text-rose-400">
              TÍNH NĂNG ĐANG BẢO TRÌ
            </h2>
            <p className="text-xs md:text-sm text-rose-200/80 leading-relaxed">
              Hệ thống tra cứu Check Scam hiện đang trong quá trình nâng cấp hệ thống kết nối và tối ưu cơ sở dữ liệu. Vui lòng quay lại sau!
            </p>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/phone-lookup"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-600 px-6 py-3 text-xs md:text-sm font-black text-white shadow-lg transition hover:from-cyan-500 hover:to-teal-500 active:scale-95"
            >
              <span>Dùng Phone Lookup VietNam</span>
            </Link>
            <Link
              href="/community"
              className="inline-flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-3 text-xs md:text-sm font-bold text-rose-300 hover:bg-rose-500/20 transition"
            >
              <ArrowLeft className="size-4" />
              <span>Về Cộng Đồng</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
