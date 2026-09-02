"use client";
import { SiteError } from "@/components/common/site-error";
export default function Error(props: Parameters<typeof SiteError>[0]) {
  return <SiteError {...props} title="Lỗi Công Cụ" description="Không thể tải công cụ. Vui lòng thử lại." backHref="/tools" backLabel="Về Công Cụ" />;
}
