import { useMemo, useState } from "react";
import { Apple, Download, Smartphone, TriangleAlert } from "lucide-react";
import { Button, Card, Chip, EmptyState, ErrorState, Segmented, Skeleton } from "@/components/ui";
import { SubHeader } from "@/components/sub-header";
import { errorMessage, useToast } from "@/components/toast";
import { useReleases } from "@/lib/queries";
import { signedReleaseUrl } from "@/lib/api";
import { formatBytes, formatDateTime } from "@/lib/format";
import { openExternal } from "@/lib/native";
import type { AppPlatform } from "@/types";

const PLATFORM_HINT: Record<AppPlatform, string> = {
  android:
    "Bản debug đã tự ký — chép sang máy, bật “Cài từ nguồn không xác định” rồi mở file.",
  ios: "IPA chưa ký — phải qua Sideloadly/AltStore ký lại bằng Apple ID, app sống 7 ngày.",
};

export function ReleasesScreen() {
  const toast = useToast();
  const releases = useReleases();
  const [platform, setPlatform] = useState<AppPlatform>("android");
  const [downloading, setDownloading] = useState<string | null>(null);

  const items = useMemo(
    () => (releases.data ?? []).filter((item) => item.platform === platform),
    [releases.data, platform],
  );

  async function download(path: string) {
    setDownloading(path);
    try {
      const url = await signedReleaseUrl(path);
      await openExternal(url);
      toast.success("Đang mở link tải…");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="space-y-4">
      <SubHeader
        title="Bản phát hành app"
        description="File cài đặt do CI dựng, lưu trong bucket app-releases"
      />

      <Segmented
        value={platform}
        onChange={setPlatform}
        options={[
          {
            value: "android",
            label: "Android",
            count: releases.data?.filter((r) => r.platform === "android").length,
          },
          {
            value: "ios",
            label: "iOS",
            count: releases.data?.filter((r) => r.platform === "ios").length,
          },
        ]}
      />

      <div className="flex items-start gap-2 rounded-2xl border border-warn/25 bg-warn/8 px-3.5 py-3 text-[12px] leading-relaxed text-warn">
        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
        {PLATFORM_HINT[platform]}
      </div>

      {releases.isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : releases.isError ? (
        <ErrorState message={errorMessage(releases.error)} onRetry={() => void releases.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={platform === "ios" ? Apple : Smartphone}
          title="Chưa có bản phát hành"
          description="Chạy workflow build trên GitHub Actions để đẩy file lên."
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.path} className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <Chip tone="info">v{item.version}</Chip>
                <span className="text-[11.5px] text-mist-500">{formatBytes(item.sizeBytes)}</span>
              </div>
              <p className="text-[13.5px] break-all">{item.fileName}</p>
              <p className="text-[11.5px] text-mist-500">
                Cập nhật {formatDateTime(item.updatedAt)}
              </p>
              <Button
                block
                icon={Download}
                loading={downloading === item.path}
                onClick={() => void download(item.path)}
              >
                Tải về
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
