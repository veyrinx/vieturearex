"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useSettingsQuery } from "@/hooks/use-settings-query";
import { SettingsForm } from "@/components/admin/settings-form";
import { LoadingSpinner } from "@/components/common/loading-spinner";

export function SettingsAdminPanel() {
  const queryClient = useQueryClient();
  const { data: settings = [], isLoading } = useSettingsQuery();

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["settings"] });
  };

  if (isLoading) {
    return <LoadingSpinner className="py-10" label="ĐANG TẢI CÀI ĐẶT..." />;
  }

  return <SettingsForm settings={settings} onSaved={refresh} />;
}
