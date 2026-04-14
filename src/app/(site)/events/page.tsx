import type { Metadata } from "next";
import { SectionHeading } from "@/components/common/section-heading";
import { EventsGrid } from "@/components/events/events-grid";
import { getEvents } from "@/lib/data/content-service";

export const metadata: Metadata = {
  title: "Sự Kiện",
  description: "Lịch sự kiện Free Fire đầy đủ nhất – sự kiện đang diễn ra, sắp tới và đã kết thúc. Theo dõi và đừng bỏ lỡ bất kỳ sự kiện nào từ Arex.",
};

export const revalidate = 60;

export default async function EventsPage() {
  const events = await getEvents();

  return (
    <div className="space-y-8 pt-6 md:pt-8">
      <SectionHeading
        title="Toàn bộ sự kiện cộng đồng"
        description="Grid card hỗ trợ lọc trạng thái, lọc ngày bắt đầu - kết thúc và mở nhanh chi tiết."
      />
      <EventsGrid initialEvents={events} />
    </div>
  );
}
