import { NewsTicker } from "@/components/home/news-ticker";
import { StatsBar } from "@/components/home/stats-bar";
import type { NewsItem } from "@/lib/types/content";

type PulseBarProps = {
  news: NewsItem[];
  newsCount: number;
  galleryCount: number;
  toolCount?: number;
};

/**
 * Dải "nhịp" ngay dưới hero: chữ chạy tin mới + lưới chỉ số, dính liền nhau
 * thành một khối duy nhất.
 *
 * Trước đây hai thứ này là hai section rời, mỗi cái tự kéo full-bleed và có
 * khoảng trống ở giữa, nên đọc như hai lần "bắt đầu lại". Gộp lại thì phần mở
 * đầu trang chỉ còn một điểm dừng, và các section nội dung phía dưới mới là
 * chuỗi nhịp thật sự.
 */
export function PulseBar({ news, newsCount, galleryCount, toolCount }: PulseBarProps) {
  return (
    <div className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 overflow-hidden">
      <NewsTicker news={news} />
      <StatsBar
        newsCount={newsCount}
        galleryCount={galleryCount}
        toolCount={toolCount}
      />
    </div>
  );
}
