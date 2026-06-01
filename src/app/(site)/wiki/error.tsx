"use client";
import { SiteError } from "@/components/common/site-error";
export default function Error(props: Parameters<typeof SiteError>[0]) {
  return <SiteError {...props} title="Lỗi Wiki" description="Không thể tải Wiki. Vui lòng thử lại." backHref="/wiki" backLabel="Về Wiki" />;
}
