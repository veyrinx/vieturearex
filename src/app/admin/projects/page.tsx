import type { Metadata } from "next";
import { ProjectsPanel } from "@/components/admin/projects-panel";
import { getResolvedProjects } from "@/lib/server/projects";
import { getAuthContext } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quản Lý Dự Án",
  description: "Theo dõi các phần sắp ra mắt — tiến độ tự tính từ code & web.",
};

export default async function AdminProjectsPage() {
  const [auth, projects] = await Promise.all([getAuthContext(), getResolvedProjects()]);
  const canEdit = auth.role === "super_admin";
  return <ProjectsPanel initialProjects={projects} canEdit={canEdit} />;
}
