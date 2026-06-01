"use client";
import { SiteError } from "@/components/common/site-error";
export default function Error(props: Parameters<typeof SiteError>[0]) {
  return <SiteError {...props} title="Lỗi Sự Kiện" description="Không thể tải danh sách sự kiện. Vui lòng thử lại." backHref="/events" backLabel="Về Sự Kiện" />;
}
