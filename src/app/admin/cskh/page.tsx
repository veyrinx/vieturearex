import type { Metadata } from "next";
import { CskhAdminPanel } from "@/components/admin/cskh-admin-panel";

export const metadata: Metadata = { title: "CSKH" };
export const dynamic = "force-dynamic";

export default function CskhPage() {
  return <CskhAdminPanel />;
}
