"use client";
import { SiteError } from "@/components/common/site-error";
export default function Error(props: Parameters<typeof SiteError>[0]) {
  return <SiteError {...props} title="Lỗi Tin Tức" description="Không thể tải tin tức. Vui lòng thử lại." backHref="/news" backLabel="Về Tin Tức" />;
}
