import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server/auth";
import { SqlEditor } from "@/components/admin/sql-editor";

export const metadata: Metadata = {
  title: "SQL Editor",
  description: "Thực thi truy vấn SQL trực tiếp trên cơ sở dữ liệu.",
};

export default async function SqlEditorPage() {
  const auth = await getAuthContext();

  // Chỉ super_admin với email admin@arex.tech mới được truy cập
  if (auth.role !== "super_admin" || auth.email !== "admin@arex.tech") {
    redirect("/admin");
  }

  return <SqlEditor />;
}
