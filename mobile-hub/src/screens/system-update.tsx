import { useEffect, useState } from "react";
import { CheckCircle2, CloudDownload, Info, RefreshCw } from "lucide-react";
import { Button, Card, Chip, EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { SubHeader } from "@/components/sub-header";
import { errorMessage, useToast } from "@/components/toast";
import { useBundleUpdate } from "@/lib/queries";
import { applyBundleUpdate, currentBundleVersion } from "@/lib/updater";
import { formatBytes, formatDateTime } from "@/lib/format";
import { hapticResult, isNative } from "@/lib/native";

/**
 * Cập nhật nóng giao diện app mà không phải gỡ ra cài lại.
 *
 * Xem src/lib/updater.ts để hiểu giới hạn: chỉ thay được JS/CSS/ảnh, đổi code
 * native vẫn phải dựng lại app.
 */
export function UpdateScreen() {
  const toast = useToast();
  const update = useBundleUpdate();
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    void currentBundleVersion().then(setCurrent);
  }, []);

  async function install() {
    if (!update.data) return;
    setRunning(true);
    try {
      // set() khởi động lại WebView ngay — không có dòng nào sau đây chạy tiếp.
      await applyBundleUpdate(update.data);
    } catch (error) {
      hapticResult("error");
      toast.error(errorMessage(error));
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <SubHeader
        title="Cập nhật app"
        description="Tải giao diện mới về máy, không phải cài lại app"
      />

      <Card className="space-y-2 text-[13px]">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-mist-500">Bản đang chạy</span>
          <span className="truncate text-right">{current ?? "…"}</span>
        </div>
      </Card>

      <div className="flex items-start gap-2 rounded-2xl border border-ink-800 bg-ink-900/60 px-3.5 py-3 text-[12px] leading-relaxed text-mist-500">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        Cập nhật nóng chỉ thay giao diện (JS/CSS/ảnh). Khi thêm tính năng cần quyền hệ
        thống mới thì vẫn phải cài lại app từ bản phát hành.
      </div>

      {!isNative ? (
        <EmptyState
          icon={Info}
          title="Chỉ chạy trên app"
          description="Mở trên trình duyệt thì không có gì để cập nhật — bản web luôn là mới nhất."
        />
      ) : update.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : update.isError ? (
        <ErrorState message={errorMessage(update.error)} onRetry={() => void update.refetch()} />
      ) : !update.data ? (
        <EmptyState
          icon={CheckCircle2}
          title="Đang dùng bản mới nhất"
          description="Chưa có bundle nào mới hơn trên máy chủ."
        />
      ) : (
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Chip tone="info">v{update.data.version}</Chip>
            <span className="text-[11.5px] text-mist-500">
              {formatBytes(update.data.sizeBytes)}
            </span>
          </div>

          {update.data.notes && (
            <p className="text-[13.5px] leading-relaxed whitespace-pre-line">
              {update.data.notes}
            </p>
          )}

          <p className="text-[11.5px] text-mist-500">
            Phát hành {formatDateTime(update.data.updatedAt)}
          </p>

          <Button block icon={CloudDownload} loading={running} onClick={() => void install()}>
            {running ? "Đang tải…" : "Cập nhật ngay"}
          </Button>

          <p className="text-center text-[11.5px] text-mist-500">
            App sẽ tự khởi động lại sau khi tải xong.
          </p>
        </Card>
      )}

      {isNative && !update.isLoading && (
        <Button
          block
          variant="ghost"
          icon={RefreshCw}
          loading={update.isFetching}
          onClick={() => void update.refetch()}
        >
          Kiểm tra lại
        </Button>
      )}
    </div>
  );
}
