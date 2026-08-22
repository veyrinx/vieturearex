import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Trash2 } from "lucide-react";
import {
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Field,
  Input,
  SearchInput,
  SectionTitle,
  Select,
  Sheet,
  Skeleton,
} from "@/components/ui";
import { SubHeader } from "@/components/sub-header";
import { useToast } from "@/components/toast";
import { api } from "@/lib/api";
import { useUsers } from "@/lib/queries";
import { timeAgo } from "@/lib/format";
import type { UserItem } from "@/types";

/**
 * Cấp danh hiệu và huy hiệu cho một tài khoản.
 *
 * Danh hiệu là chuỗi hiển thị cạnh tên (`selected_title`), huy hiệu là bản ghi
 * trong `user_achievements`. Mã huy hiệu lấy từ danh sách định nghĩa để không gõ
 * sai — server từ chối mã lạ.
 */

type AchievementDef = { id: string; name: string; icon?: string };

type GrantedAchievement = {
  id: string;
  user_id: string;
  achievement: string;
  earned_at: string;
  users?: { display_name: string | null; email: string; avatar_url: string | null };
};

export function AwardsScreen() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<UserItem | null>(null);
  const [title, setTitle] = useState("");
  const [achievement, setAchievement] = useState("");

  const users = useUsers();
  const defs = useQuery({
    queryKey: ["achievement-defs"],
    queryFn: () =>
      api<{ items: AchievementDef[] }>("/api/admin/achievements/defs").then((r) => r.items ?? []),
  });
  const granted = useQuery({
    queryKey: ["achievements", picked?.id],
    enabled: Boolean(picked),
    queryFn: () =>
      api<{ items: GrantedAchievement[] }>(`/api/admin/achievements?user_id=${picked?.id}`).then(
        (r) => r.items ?? [],
      ),
  });

  const setTitleOf = useMutation({
    mutationFn: (value: string | null) =>
      api(`/api/admin/users/${picked?.id}/title`, { method: "PATCH", body: { title: value } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Đã cập nhật danh hiệu.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const grant = useMutation({
    mutationFn: (code: string) =>
      api("/api/admin/achievements", {
        method: "POST",
        body: { user_id: picked?.id, achievement: code },
      }),
    onSuccess: () => {
      void granted.refetch();
      toast.success("Đã cấp huy hiệu.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const revoke = useMutation({
    mutationFn: (code: string) =>
      api("/api/admin/achievements", {
        method: "DELETE",
        body: { user_id: picked?.id, achievement: code },
      }),
    onSuccess: () => {
      void granted.refetch();
      toast.success("Đã thu hồi huy hiệu.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const list = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return (users.data ?? []).slice(0, 20);
    return (users.data ?? [])
      .filter((user) =>
        `${user.display_name ?? ""} ${user.email}`.toLowerCase().includes(needle),
      )
      .slice(0, 30);
  }, [users.data, search]);

  const defsList = defs.data ?? [];

  return (
    <div className="space-y-4">
      <SubHeader title="Danh hiệu & huy hiệu" description="Cấp cho từng tài khoản" />

      <SearchInput value={search} onChange={setSearch} placeholder="Tìm tài khoản…" />

      {users.isLoading ? (
        <Skeleton className="h-40" />
      ) : users.isError ? (
        <ErrorState message={(users.error as Error).message} onRetry={() => void users.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState icon={Award} title="Không tìm thấy tài khoản" />
      ) : (
        <div className="space-y-2.5">
          {list.map((user) => (
            <Card
              key={user.id}
              className="flex items-center gap-3 p-3"
              onClick={() => {
                setPicked(user);
                setTitle("");
                setAchievement(defsList[0]?.id ?? "");
              }}
            >
              <Avatar url={user.avatar_url} name={user.display_name ?? user.email} size={38} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium">
                  {user.display_name || user.email}
                </p>
                <p className="truncate text-[12px] text-mist-500">{user.email}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Sheet
        open={Boolean(picked)}
        onClose={() => setPicked(null)}
        title={picked?.display_name || picked?.email || "Tài khoản"}
      >
        <div className="space-y-5">
          <section>
            <SectionTitle>Danh hiệu</SectionTitle>
            <Field label="Danh hiệu hiển thị cạnh tên">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Chiến thần Free Fire"
              />
            </Field>
            <div className="mt-2 flex gap-2">
              <Button
                block
                loading={setTitleOf.isPending}
                onClick={() => setTitleOf.mutate(title.trim() || null)}
              >
                Cấp danh hiệu
              </Button>
              <Button variant="secondary" block onClick={() => setTitleOf.mutate(null)}>
                Gỡ
              </Button>
            </div>
          </section>

          <section>
            <SectionTitle>Huy hiệu</SectionTitle>
            <Field label="Chọn huy hiệu">
              <Select value={achievement} onChange={(e) => setAchievement(e.target.value)}>
                {defsList.map((def) => (
                  <option key={def.id} value={def.id}>
                    {def.icon ? `${def.icon} ` : ""}
                    {def.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Button
              block
              className="mt-2"
              loading={grant.isPending}
              disabled={!achievement}
              onClick={() => grant.mutate(achievement)}
            >
              Cấp huy hiệu
            </Button>

            <div className="mt-3 space-y-2">
              {(granted.data ?? []).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-2xl border border-ink-700 bg-ink-900 px-3.5 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px]">
                      {defsList.find((def) => def.id === item.achievement)?.name ?? item.achievement}
                    </p>
                    <p className="text-[11.5px] text-mist-500">{timeAgo(item.earned_at)}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="danger"
                    icon={Trash2}
                    loading={revoke.isPending}
                    onClick={() => revoke.mutate(item.achievement)}
                  >
                    Thu hồi
                  </Button>
                </div>
              ))}
              {(granted.data ?? []).length === 0 && (
                <Chip tone="neutral">Chưa có huy hiệu nào</Chip>
              )}
            </div>
          </section>
        </div>
      </Sheet>
    </div>
  );
}
