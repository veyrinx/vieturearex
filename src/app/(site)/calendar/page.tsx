import type { Metadata } from "next";
import { SectionHeading } from "@/components/common/section-heading";
import { EventTimeline } from "@/components/timeline/event-timeline";
import { getEvents } from "@/lib/data/content-service";

export const metadata: Metadata = {
  title: "Lịch",
  description:
    "Timeline hiển thị theo tháng, có thể lọc theo khoảng ngày cụ thể và trạng thái sự kiện.",
};

export const revalidate = 60;

export default async function CalendarPage() {
  const events = await getEvents();

  return (
    <div className="space-y-8 pt-6 md:pt-8">
      <SectionHeading
        title="Lịch sự kiện theo tháng"
        description="Mặc định hiển thị nguyên tháng hiện tại, có thể lọc theo khoảng ngày và trạng thái để xem chi tiết."
      />
      <EventTimeline initialEvents={events} />
    </div>
  );
}
