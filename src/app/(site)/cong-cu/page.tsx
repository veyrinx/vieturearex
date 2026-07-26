import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Wrench } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { findFeatureLock, LOCK_LABELS } from "@/lib/constants/feature-locks";
import { getFeatureLocks } from "@/lib/server/feature-locks";
import { TOOLS } from "@/lib/constants/tools";

export const metadata: Metadata = {
  title: "Công Cụ Free Fire",
  description:
    "Bộ công cụ Free Fire cho người chơi: chỉnh độ nhạy theo máy, tier list nhân vật, ghép combo kỹ năng, thư viện icon. Miễn phí trên Arex Network.",
  alternates: { canonical: `${siteConfig.url}/cong-cu` },
  openGraph: {
    title: "Công Cụ Free Fire | Arex",
    description: "Chỉnh độ nhạy, tier list nhân vật, combo kỹ năng, thư viện icon — tất cả trong một chỗ.",
    url: `${siteConfig.url}/cong-cu`,
    type: "website",
  },
};

export default async function ToolsHubPage() {
  const featureLocks = await getFeatureLocks();
  return (
    <div className="mx-auto max-w-4xl py-8 md:py-12 space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-7 md:p-10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/8 dark:from-amber-500/10" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent dark:via-amber-400/60" />
        <div className="relative space-y-3">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-primary dark:text-amber-400">
            <Wrench className="size-3.5" /> Người Chơi · Free Fire
          </p>
          <h1 className="font-heading text-3xl font-black uppercase tracking-tight text-foreground md:text-4xl">
            <span className="text-primary dark:text-amber-400">Công Cụ</span> Free Fire
          </h1>
          <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
            Bộ công cụ miễn phí giúp bạn tối ưu lối chơi: chỉnh độ nhạy, tra tier list, ghép combo kỹ năng
            và tra cứu thư viện icon.
          </p>
        </div>
      </div>

      {/* Tool grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          const lock = findFeatureLock(t.href, featureLocks);
          const badge = (
            <div className={`flex size-12 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-110 ${t.accent}`}>
              <Icon className="size-6" />
            </div>
          );

          // Chức năng đang khóa/cập nhật → thẻ mờ, không bấm được, có nhãn trạng thái
          if (lock) {
            return (
              <div
                key={t.href}
                className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-dashed border-border bg-card/60 p-5 opacity-70"
              >
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                  <Wrench className="size-3" /> {LOCK_LABELS[lock.status ?? "maintenance"]}
                </span>
                {badge}
                <div className="space-y-1">
                  <h2 className="font-heading text-lg font-black uppercase tracking-tight text-foreground">{t.title}</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">{t.desc}</p>
                </div>
                <span className="mt-auto text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
                  Tạm thời chưa mở
                </span>
              </div>
            );
          }

          return (
            <Link
              key={t.href}
              href={t.href}
              className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
            >
              {badge}
              <div className="space-y-1">
                <h2 className="font-heading text-lg font-black uppercase tracking-tight text-foreground">{t.title}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{t.desc}</p>
              </div>
              <span className="mt-auto inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors group-hover:text-primary dark:group-hover:text-amber-400">
                Mở công cụ
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
