"use client";
import { SiteError } from "@/components/common/site-error";
export default function Error(props: Parameters<typeof SiteError>[0]) {
  return <SiteError {...props} title="Lỗi Esports" description="Không thể tải nội dung esports. Vui lòng thử lại." backHref="/esports" backLabel="Về Esports" />;
}
