"use client";
import { SiteError } from "@/components/common/site-error";
export default function Error(props: Parameters<typeof SiteError>[0]) {
  return <SiteError {...props} title="Lỗi Nhân Vật" description="Không thể tải dữ liệu nhân vật. Vui lòng thử lại." backHref="/characters" backLabel="Về Nhân Vật" />;
}
