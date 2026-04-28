import type { Metadata } from "next";
import { requireAdminAccess } from "@/lib/server/auth";
import { getAllStaffProfiles } from "@/lib/data/content-service";
import { TeamManagementClient } from "@/components/admin/team-management-client";
import { TeamInvitesPanel } from "@/components/admin/team-invites-panel";

export const metadata: Metadata = { title: "Quản lý đội ngũ" };
export const revalidate = 0;

export default async function AdminTeamPage() {
  const session = await requireAdminAccess();
  const profiles = await getAllStaffProfiles();
  const canCreateInvites = session.role === "super_admin";
  const isAdmin = session.role === "super_admin" || session.role === "admin";
  return (
    <div className="space-y-8">
      <TeamInvitesPanel canCreate={canCreateInvites} isAdmin={isAdmin} />
      <TeamManagementClient initialProfiles={profiles} />
    </div>
  );
}
