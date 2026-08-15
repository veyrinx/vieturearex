import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server/auth";
import { FailoverPanel } from "@/components/admin/failover-panel";

export const metadata: Metadata = {
  title: "Chuyển hướng nhanh",
  description: "Kiểm tra máy chủ chính và chuyển khách sang máy chủ dự phòng.",
};

async function checkPrimaryServer() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch("https://arexnetwork.vn", {
      method: "HEAD",
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    return {
      online: response.ok,
      status: response.status,
    };
  } catch {
    return {
      online: false,
      status: 0,
    };
  }
}

export default async function ChuyenHuongPage() {
  const auth = await getAuthContext();

  if (auth.role !== "super_admin") {
    redirect("/admin");
  }

  const primary = await checkPrimaryServer();

  return (
    <FailoverPanel
      primaryOnline={primary.online}
      primaryStatus={primary.status}
    />
  );
}
