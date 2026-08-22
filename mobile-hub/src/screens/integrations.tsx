import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert, RefreshCw } from "lucide-react";
import { Button, Card, Chip, ErrorState, Skeleton } from "@/components/ui";
import { SubHeader } from "@/components/sub-header";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

/**
 * Soi các tích hợp ngoài: email, Telegram, Discord, tên miền phục vụ.
 *
 * Giá trị còn nguyên tiền tố "enc:" nghĩa là APP_SECRET trên máy chủ lệch với
 * lúc lưu cài đặt — server báo luôn trong phần cách sửa.
 */

type Check = { name: string; ok: boolean; detail: string; fix?: string };

type Health = {
  site_url: string;
  canonical: string;
  serving_origin: string;
  checked_at: string;
  ok: boolean;
  checks: Check[];
};

export function IntegrationsScreen() {
  const query = useQuery({
    queryKey: ["integrations-health"],
    queryFn: () => api<Health>("/api/admin/integrations-health"),
    staleTime: 60_000,
  });

  return (
    <div className="space-y-4">
      <SubHeader
        title="Soi tích hợp"
        description="Kiểm tra email, Telegram, Discord"
        action={
          <Button
            size="sm"
            variant="secondary"
            icon={RefreshCw}
            loading={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Soi lại
          </Button>
        }
      />

      {query.isLoading ? (
        <Skeleton className="h-56" />
      ) : query.isError ? (
        <ErrorState message={(query.error as Error).message} onRetry={() => void query.refetch()} />
      ) : (
        <>
          <Card className="space-y-1.5 text-[13px]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-mist-500">Tổng thể</span>
              <Chip tone={query.data?.ok ? "ok" : "danger"}>
                {query.data?.ok ? "Bình thường" : "Có lỗi"}
              </Chip>
            </div>
            <Row label="Tên miền chuẩn" value={query.data?.canonical ?? "—"} />
            <Row label="Đang phục vụ" value={query.data?.serving_origin ?? "—"} />
            <Row label="Soi lúc" value={formatDateTime(query.data?.checked_at)} />
          </Card>

          <div className="space-y-2.5">
            {(query.data?.checks ?? []).map((check) => (
              <Card key={check.name} className="flex items-start gap-3 p-3.5">
                {check.ok ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" />
                ) : (
                  <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" />
                )}
                <div className="min-w-0">
                  <p className="text-[14px] font-medium">{check.name}</p>
                  <p className="mt-0.5 text-[12.5px] break-words text-mist-500">{check.detail}</p>
                  {!check.ok && check.fix && (
                    <p className="mt-1 text-[12.5px] break-words text-warn">Cách sửa: {check.fix}</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-mist-500">{label}</span>
      <span className="max-w-[62%] text-right break-words">{value}</span>
    </div>
  );
}
