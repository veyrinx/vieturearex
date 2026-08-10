import { NewsTicker } from "@/components/home/news-ticker";
import type { NewsItem } from "@/lib/types/content";

type PulseBarProps = {
  news: NewsItem[];
};

/**
 * Dải "nhịp" ngay dưới hero: chữ chạy tin mới, tràn hết bề ngang màn hình.
 *
 * Trước đây khối này còn gánh thêm lưới chỉ số (StatsBar) bên dưới ticker; lưới
 * đó đã được gỡ khỏi trang chủ. Giữ lại lớp bọc này chứ không nhập thẳng
 * NewsTicker vào trang: full-bleed nằm ở đây, còn NewsTicker cố ý chỉ dựng phần
 * nội dung — tách vậy để không chỗ nào phải tự tính lại mẹo `w-screen`.
 */
export function PulseBar({ news }: PulseBarProps) {
  return (
    <div className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 overflow-hidden">
      <NewsTicker news={news} />
    </div>
  );
}
