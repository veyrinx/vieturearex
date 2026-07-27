import type { Metadata } from "next";
import { Wrench } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { getFeatureLocks } from "@/lib/server/feature-locks";
import { TOOLS } from "@/lib/constants/tools";
import { ToolsExplorer } from "@/components/tools/tools-explorer";

export const metadata: Metadata = {
  title: "Công Cụ Free Fire",
  description:
    "Bộ công cụ Free Fire cho người chơi: chỉnh độ nhạy theo máy, tier list nhân vật, ghép combo kỹ năng, thư viện icon. Miễn phí trên Arex Network.",
  alternates: { canonical: `${siteConfig.url}/tools` },
  openGraph: {
    title: "Công Cụ Free Fire | Arex",
    description: "Chỉnh độ nhạy, tier list nhân vật, combo kỹ năng, thư viện icon — tất cả trong một chỗ.",
    url: `${siteConfig.url}/tools`,
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
            {TOOLS.length} công cụ miễn phí giúp bạn tối ưu lối chơi: tra cứu nick, chỉnh độ nhạy,
            tra tier list, ghép combo kỹ năng và thư viện icon.
          </p>
        </div>
      </div>

      {/* Tìm kiếm + lọc nhóm + lưới công cụ */}
      <ToolsExplorer featureLocks={featureLocks} />
    </div>
  );
}
