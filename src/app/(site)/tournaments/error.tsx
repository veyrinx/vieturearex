"use client";
import { SiteError } from "@/components/common/site-error";
export default function Error(props: Parameters<typeof SiteError>[0]) {
  return <SiteError {...props} title="Lỗi Giải Đấu" description="Không thể tải thông tin giải đấu. Vui lòng thử lại." backHref="/tournaments" backLabel="Về Giải Đấu" />;
}
