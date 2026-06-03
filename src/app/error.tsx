"use client";

import { SiteError } from "@/components/common/site-error";

export default function ErrorPage(props: Parameters<typeof SiteError>[0]) {
  return <SiteError {...props} />;
}
