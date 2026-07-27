"use client";
import { SiteError } from "@/components/common/site-error";
export default function Error(props: Parameters<typeof SiteError>[0]) {
  return <SiteError {...props} title="Lỗi Diễn Đàn" description="Không thể tải diễn đàn. Vui lòng thử lại." backHref="/community" backLabel="Về diễn đàn" />;
}
