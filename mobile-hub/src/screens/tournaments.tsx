import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Trophy } from "lucide-react";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Segmented,
  Sheet,
  Skeleton,
  type ChipTone,
} from "@/components/ui";
import { SubHeader } from "@/components/sub-header";
import { useToast } from "@/components/toast";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { openExternal } from "@/lib/native";
import { env } from "@/env";

/**
 * Giải đấu (TMS).
 *
 * Trong app chỉ theo dõi và chuyển trạng thái — bốc thăm, xếp bảng, nhập kết quả
 * từng trận vẫn phải làm trên web vì cần bảng rộng.
 */

type Tournament = {
  id: string;
  name: string;
  slug: string;
  status: string;
  mode: string;
  max_teams: number;
  team_size: number;
  start_at?: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Nháp",
  registering: "Đang mở đăng ký",
  ongoing: "Đang diễn ra",
  finished: "Đã kết thúc",
  cancelled: "Đã huỷ",
};

const STATUS_TONE: Record<string, ChipTone> = {
  draft: "neutral",
  registering: "ok",
  ongoing: "warn",
  finished: "neutral",
  cancelled: "danger",
};

const NEXT_STATUS: { value: string; label: string }[] = [
  { value: "draft", label: "Nháp" },
  { value: "registering", label: "Mở đăng ký" },
  { value: "ongoing", label: "Bắt đầu" },
  { value: "finished", label: "Kết thúc" },
  { value: "cancelled", label: "Huỷ" },
];

export function TournamentsScreen() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [detail, setDetail] = useState<Tournament | null>(null);

  const query = useQuery({
    queryKey: ["tournaments"],
    queryFn: () => api<Tournament[]>("/api/tms/tournaments"),
  });

  const setStatus = useMutation({
    mutationFn: (input: { id: string; status: string }) =>
      api(`/api/tms/tournaments/${input.id}`, { method: "PATCH", body: { status: input.status } }),
    onSuccess: () => {
      setDetail(null);
      void queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      toast.success("Đã đổi trạng thái giải.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const items = (query.data ?? []).filter((item) =>
    filter === "all" ? true : item.status === filter,
  );

  return (
    <div className="space-y-4">
      <SubHeader title="Giải đấu" description="Theo dõi và chuyển trạng thái giải" />

      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "Tất cả" },
          { value: "registering", label: "Đăng ký" },
          { value: "ongoing", label: "Đang chạy" },
        ]}
      />

      {query.isLoading ? (
        <div className="space-y-2.5">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState message={(query.error as Error).message} onRetry={() => void query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={Trophy} title="Chưa có giải đấu nào" />
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <Card key={item.id} className="p-3.5" onClick={() => setDetail(item)}>
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 truncate text-[14px] font-medium">{item.name}</p>
                <Chip tone={STATUS_TONE[item.status] ?? "neutral"}>
                  {STATUS_LABEL[item.status] ?? item.status}
                </Chip>
              </div>
              <p className="mt-1 text-[12px] text-mist-500">
                {item.mode} · tối đa {item.max_teams} đội · {item.team_size} người/đội
                {item.start_at ? ` · ${formatDate(item.start_at)}` : ""}
              </p>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={Boolean(detail)} onClose={() => setDetail(null)} title={detail?.name ?? "Giải đấu"}>
        {detail && (
          <div className="space-y-3">
            <p className="text-[13px] text-mist-500">
              Trạng thái hiện tại: {STATUS_LABEL[detail.status] ?? detail.status}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {NEXT_STATUS.filter((option) => option.value !== detail.status).map((option) => (
                <Button
                  key={option.value}
                  variant={option.value === "cancelled" ? "danger" : "secondary"}
                  loading={setStatus.isPending}
                  onClick={() => setStatus.mutate({ id: detail.id, status: option.value })}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              block
              icon={ExternalLink}
              onClick={() => void openExternal(`${env.apiBaseUrl}/admin/tournaments/${detail.id}`)}
            >
              Mở bảng điều khiển giải trên web
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
