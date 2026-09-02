"use client";
import { SiteError } from "@/components/common/site-error";
export default function Error(props: Parameters<typeof SiteError>[0]) {
  return <SiteError {...props} title="Lỗi Vũ Khí" description="Không thể tải dữ liệu vũ khí. Vui lòng thử lại." backHref="/weapons" backLabel="Về Vũ Khí" />;
}
