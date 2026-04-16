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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-xl font-bold uppercase tracking-[0.08em] text-foreground">Cài Đặt</h1>
        <p className="text-sm text-muted-foreground">Quản lý thương hiệu, SEO, trang chủ và tích hợp.</p>
      </div>
      <SettingsForm settings={settings} onSaved={refresh} />
    </div>
  );
}
