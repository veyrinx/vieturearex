import { getSettings } from "@/lib/data/content-service";
import { buildSettingsMap } from "@/lib/utils/site-settings";
import { Wrench, Clock } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MaintenancePage() {
  const settings = await getSettings();
  const settingsMap = buildSettingsMap(settings);

  const message =
    settingsMap["site.maintenance_message"] ||
    "Website đang được bảo trì. Vui lòng quay lại sau.";
  const endTime = settingsMap["site.maintenance_end_time"];
  const siteName = settingsMap["branding.site_name"] || "Arex";

  const endDate = endTime ? new Date(endTime) : null;
  const formattedEnd =
    endDate && !Number.isNaN(endDate.getTime())
      ? endDate.toLocaleString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="glass-card max-w-md w-full rounded-2xl p-10 flex flex-col items-center gap-6">
        <div className="flex size-20 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
          <Wrench className="size-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">{siteName}</h1>
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
            Đang bảo trì
          </p>
        </div>
        <p className="text-muted-foreground leading-relaxed">{message}</p>
        {formattedEnd && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-4 py-2 text-sm text-amber-600 dark:text-amber-400">
            <Clock className="size-4 shrink-0" />
            <span>Dự kiến hoàn thành: {formattedEnd}</span>
          </div>
        )}
        <p className="text-xs text-muted-foreground/60">
          Cảm ơn bạn đã kiên nhẫn chờ đợi.
        </p>
      </div>
    </div>
  );
}
