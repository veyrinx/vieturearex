"use client";
import { SiteError } from "@/components/common/site-error";
export default function Error(props: Parameters<typeof SiteError>[0]) {
  return <SiteError {...props} title="Lỗi Vật Phẩm" description="Không thể tải kho vật phẩm. Vui lòng thử lại." backHref="/items" backLabel="Về Vật Phẩm" />;
}
