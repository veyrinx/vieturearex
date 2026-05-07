"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useSettingsQuery } from "@/hooks/use-settings-query";
import { SettingsForm } from "@/components/admin/settings-form";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Button } from "@/components/ui/button";

export function SettingsAdminPanel() {
  const queryClient = useQueryClient();
  const { data: settings = [], isLoading } = useSettingsQuery();

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["settings"] });
  };

  const downloadJson = () => {
    const obj = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `arex-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <LoadingSpinner className="py-10" label="ĐANG TẢI CÀI ĐẶT..." />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold uppercase tracking-[0.08em] text-foreground">Cài Đặt</h1>
          <p className="text-sm text-muted-foreground">Quản lý thương hiệu, SEO, trang chủ và tích hợp.</p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadJson} className="gap-1.5 shrink-0">
          <Download className="size-3.5" />
          Export JSON
        </Button>
      </div>
      <SettingsForm settings={settings} onSaved={refresh} />
    </div>
  );
}
