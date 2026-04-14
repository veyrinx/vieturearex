"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Chỉ đếm trang public, không đếm admin
    if (pathname?.startsWith("/admin") || pathname?.startsWith("/auth")) return;

    fetch("/api/analytics/pageview", { method: "POST" }).catch(() => null);
  }, [pathname]);

  return null;
}
