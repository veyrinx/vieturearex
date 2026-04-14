"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useUsersQuery } from "@/hooks/use-users-query";
import { InvitedEmailsManager } from "@/components/admin/invited-emails-manager";
import { UserRoleTable } from "@/components/admin/user-role-table";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingSpinner } from "@/components/common/loading-spinner";

export function UsersAdminPanel() {
  const queryClient = useQueryClient();
  const { data: users = [], isLoading } = useUsersQuery();

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["users"] });
  };

  if (isLoading) {
    return <LoadingSpinner className="py-10" label="ĐANG TẢI NGƯỜI DÙNG..." />;
  }

  if (users.length === 0) {
    return (
      <div className="space-y-4">
        <InvitedEmailsManager />
        <EmptyState title="CHƯA CÓ NGƯỜI DÙNG" description="Hiện chưa có tài khoản nào trong hệ thống." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <InvitedEmailsManager />
      <UserRoleTable users={users} onSaved={refresh} />
    </div>
  );
}
