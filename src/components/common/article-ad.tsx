import { getSettings } from "@/lib/data/content-service";
import { AdSense } from "@/components/common/adsense";
import { cn } from "@/lib/utils";

/**
 * Ô quảng cáo dùng chung cho các trang nội dung (tin tức, wiki…).
 * Chỉ hiện khi slot tương ứng đã được cấu hình trong Cài đặt → Quảng cáo,
 * nên không bao giờ để lại khung trống nếu chưa bật.
 */
export async function ArticleAd({
  slotKey = "ads.slot_article",
  className,
}: {
  slotKey?: string;
  className?: string;
}) {
  const settings = await getSettings();
  const slot = settings.find((s) => s.key === slotKey)?.value?.trim() || null;
  if (!slot) return null;

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-dashed border-border/60 bg-card/40 p-2", className)}>
      <p className="mb-1 text-center text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">
        Quảng cáo
      </p>
      <AdSense slot={slot} />
    </div>
  );
}
