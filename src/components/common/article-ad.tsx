import { getSettings } from "@/lib/data/content-service";
import { AdSense } from "@/components/common/adsense";
import { buildSettingsMap, resolveAdsDisplay } from "@/lib/utils/site-settings";

/**
 * Ô quảng cáo dùng chung cho các trang nội dung (tin tức, wiki…).
 * Chỉ hiện khi slot tương ứng đã được cấu hình trong Cài đặt → Quảng cáo,
 * nên không bao giờ để lại khung trống nếu chưa bật.
 *
 * Khung viền do AdSense tự dựng (prop `framed`) chứ không bọc ở đây: công tắc
 * bật/tắt theo thiết bị chỉ chốt được ở client, nên khung phải biến mất cùng
 * quảng cáo thay vì đứng lại thành hộp rỗng.
 */
export async function ArticleAd({
  slotKey = "ads.slot_article",
  className,
}: {
  slotKey?: string;
  className?: string;
}) {
  const settings = await getSettings();
  const settingsMap = buildSettingsMap(settings);
  const slot = settingsMap[slotKey]?.trim() || null;
  if (!slot) return null;
  const client = settingsMap["ads.google_adsense_id"]?.trim() || undefined;
  const ads = resolveAdsDisplay(settingsMap);

  return (
    <AdSense
      slot={slot}
      client={client}
      framed
      frameClassName={className}
      showOnMobile={ads.showOnMobile}
      showOnDesktop={ads.showOnDesktop}
    />
  );
}
