import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, ExternalLink, Eye, Trash2 } from "lucide-react";
import {
  Button,
  Card,
  Chip,
  ConfirmSheet,
  EmptyState,
  ErrorState,
  SearchInput,
  Segmented,
  Skeleton,
} from "@/components/ui";
import { SubHeader } from "@/components/sub-header";
import { useToast } from "@/components/toast";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { openExternal } from "@/lib/native";
import { env } from "@/env";

/** Bài wiki cộng đồng: đăng/gỡ và xoá. Soạn nội dung dài vẫn nên làm trên web. */

type WikiArticle = {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  status: string;
  author_name: string | null;
  view_count: number;
  created_at: string;
};

export function WikiScreen() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [removing, setRemoving] = useState<WikiArticle | null>(null);

  const query = useQuery({
    queryKey: ["wiki"],
    queryFn: () =>
      api<{ articles: WikiArticle[] }>("/api/admin/wiki").then((r) => r.articles ?? []),
  });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["wiki"] });
  }

  const setStatusOf = useMutation({
    mutationFn: (input: { slug: string; status: string }) =>
      api("/api/admin/wiki", { method: "PATCH", body: input }),
    onSuccess: () => {
      refresh();
      toast.success("Đã đổi trạng thái.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (slug: string) =>
      api(`/api/admin/wiki?slug=${encodeURIComponent(slug)}`, { method: "DELETE" }),
    onSuccess: () => {
      setRemoving(null);
      refresh();
      toast.success("Đã xoá bài wiki.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const items = (query.data ?? [])
    .filter((item) => (status === "all" ? true : item.status === status))
    .filter((item) =>
      search.trim() ? item.title.toLowerCase().includes(search.trim().toLowerCase()) : true,
    );

  return (
    <div className="space-y-4">
      <SubHeader title="Wiki" description="Duyệt và gỡ bài wiki cộng đồng" />

      <Segmented
        value={status}
        onChange={setStatus}
        options={[
          { value: "all", label: "Tất cả" },
          { value: "published", label: "Đã đăng" },
          { value: "draft", label: "Nháp" },
        ]}
      />

      <SearchInput value={search} onChange={setSearch} placeholder="Tìm bài wiki…" />

      {query.isLoading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState message={(query.error as Error).message} onRetry={() => void query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={BookOpen} title="Không có bài nào" />
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <Card key={item.id} className="p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium">{item.title}</p>
                  <p className="mt-0.5 truncate text-[12px] text-mist-500">
                    {item.author_name || "Ẩn danh"} · {item.view_count} lượt xem ·{" "}
                    {timeAgo(item.created_at)}
                  </p>
                </div>
                <Chip tone={item.status === "published" ? "ok" : "neutral"}>
                  {item.status === "published" ? "Đã đăng" : "Nháp"}
                </Chip>
              </div>

              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Eye}
                  loading={setStatusOf.isPending}
                  onClick={() =>
                    setStatusOf.mutate({
                      slug: item.slug,
                      status: item.status === "published" ? "draft" : "published",
                    })
                  }
                >
                  {item.status === "published" ? "Gỡ xuống" : "Đăng lên"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={ExternalLink}
                  onClick={() => void openExternal(`${env.apiBaseUrl}/wiki/${item.slug}`)}
                >
                  Xem
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  icon={Trash2}
                  className="ml-auto"
                  onClick={() => setRemoving(item)}
                >
                  Xoá
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmSheet
        open={Boolean(removing)}
        title="Xoá bài wiki?"
        message={`"${removing?.title ?? ""}" sẽ bị xoá hẳn khỏi web.`}
        confirmLabel="Xoá"
        destructive
        loading={remove.isPending}
        onCancel={() => setRemoving(null)}
        onConfirm={() => removing && remove.mutate(removing.slug)}
      />
    </div>
  );
}
