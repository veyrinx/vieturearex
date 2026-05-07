"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, FileJson, Copy, Check, X } from "lucide-react";
import { useSettingsQuery } from "@/hooks/use-settings-query";
import { SettingsForm } from "@/components/admin/settings-form";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Button } from "@/components/ui/button";

export function SettingsAdminPanel() {
  const queryClient = useQueryClient();
  const { data: settings = [], isLoading } = useSettingsQuery();
  const [jsonOpen, setJsonOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["settings"] });
  };

  const jsonText = JSON.stringify(
    Object.fromEntries(settings.map((s) => [s.key, s.value])),
    null,
    2,
  );

  const downloadJson = () => {
    const blob = new Blob([jsonText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `arex-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyJson = async () => {
    await navigator.clipboard.writeText(jsonText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        <Button variant="outline" size="sm" onClick={() => setJsonOpen((v) => !v)} className="gap-1.5 shrink-0">
          <FileJson className="size-3.5" />
          {jsonOpen ? "Ẩn JSON" : "Xem JSON"}
        </Button>
      </div>

      {jsonOpen && (
        <div className="rounded-xl border border-border bg-muted/50 overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
            <span className="text-xs font-mono text-muted-foreground">settings.json</span>
            <div className="flex gap-1.5">
              <Button variant="ghost" size="sm" onClick={copyJson} className="h-7 gap-1.5 px-2.5 text-xs">
                {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
                {copied ? "Đã copy" : "Copy"}
              </Button>
              <Button variant="ghost" size="sm" onClick={downloadJson} className="h-7 gap-1.5 px-2.5 text-xs">
                <Download className="size-3.5" />
                Tải về
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setJsonOpen(false)} className="h-7 w-7 p-0">
                <X className="size-3.5" />
              </Button>
            </div>
          </div>
          <pre className="max-h-[60vh] overflow-auto p-4 text-xs leading-relaxed text-foreground/90 font-mono whitespace-pre">
            {jsonText}
          </pre>
        </div>
      )}

      <SettingsForm settings={settings} onSaved={refresh} />
    </div>
  );
}
