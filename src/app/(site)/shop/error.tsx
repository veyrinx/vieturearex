"use client";
import { SiteError } from "@/components/common/site-error";
export default function Error(props: Parameters<typeof SiteError>[0]) {
  return <SiteError {...props} title="Lỗi Chợ Arex" description="Không thể tải gian hàng. Vui lòng thử lại." backHref="/shop" backLabel="Về Chợ Arex" />;
}
