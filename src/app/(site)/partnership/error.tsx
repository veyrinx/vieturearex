"use client";
import { SiteError } from "@/components/common/site-error";
export default function Error(props: Parameters<typeof SiteError>[0]) {
  return <SiteError {...props} title="Lỗi Hợp Tác" description="Không thể tải trang hợp tác. Vui lòng thử lại." backHref="/partnership" backLabel="Về Hợp Tác" />;
}
