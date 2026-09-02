"use client";
import { SiteError } from "@/components/common/site-error";
export default function Error(props: Parameters<typeof SiteError>[0]) {
  return <SiteError {...props} title="Lỗi Thư Viện" description="Không thể tải thư viện ảnh. Vui lòng thử lại." backHref="/gallery" backLabel="Về Thư Viện" />;
}
