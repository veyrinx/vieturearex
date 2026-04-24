import type { Metadata } from "next";
import { requireAdminAccess } from "@/lib/server/auth";
import { getAllStaffProfiles } from "@/lib/data/content-service";
import { TeamManagementClient } from "@/components/admin/team-management-client";

export const metadata: Metadata = { title: "Quản lý đội ngũ" };
export const revalidate = 0;

export default async function AdminTeamPage() {
  await requireAdminAccess();
  const profiles = await getAllStaffProfiles();
  return <TeamManagementClient initialProfiles={profiles} />;
}
