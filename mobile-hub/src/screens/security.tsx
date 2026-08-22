import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ShieldBan, ShieldCheck, X } from "lucide-react";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  SectionTitle,
  Segmented,
  Sheet,
  Skeleton,
} from "@/components/ui";
import { SubHeader } from "@/components/sub-header";
import { useToast } from "@/components/toast";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/format";

/**
 * Chặn IP và danh sách trắng cho trang quản trị.
 *
 * Chặn có hạn một tiếng (server tự thả), còn danh sách trắng thì vĩnh viễn —
 * đưa IP của mình vào đó trước khi siết chặn, không thì tự khoá mình ra ngoài.
 */

type Blocked = { ip: string; blockedAt: number; reason: string };
type Visitor = { ip: string; lastSeen: number; count?: number; path?: string };

type SecurityData = {
  blocked: Blocked[];
  history: Blocked[];
  whitelist: string[];
  visitors: Visitor[];
};

export function SecurityScreen() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("blocked");
  const [adding, setAdding] = useState<"block" | "whitelist" | null>(null);
  const [ip, setIp] = useState("");
  const [reason, setReason] = useState("");

  const query = useQuery({
    queryKey: ["security"],
    queryFn: () => api<SecurityData>("/api/admin/security"),
  });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["security"] });
  }

  const block = useMutation({
    mutationFn: (body: { ip: string; reason?: string }) =>
      api("/api/admin/security", { method: "POST", body }),
    onSuccess: () => {
      setAdding(null);
      setIp("");
      setReason("");
      refresh();
      toast.success("Đã chặn IP.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const unblock = useMutation({
    mutationFn: (target: string) =>
      api("/api/admin/security", { method: "DELETE", body: { ip: target } }),
    onSuccess: () => {
      refresh();
      toast.success("Đã bỏ chặn.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const whitelist = useMutation({
    mutationFn: (body: { action: "add" | "remove"; ip: string }) =>
      api("/api/admin/security", { method: "PATCH", body }),
    onSuccess: () => {
      setAdding(null);
      setIp("");
      refresh();
      toast.success("Đã cập nhật danh sách trắng.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (query.isLoading) return <Skeleton className="h-64" />;
  if (query.isError)
    return <ErrorState message={(query.error as Error).message} onRetry={() => void query.refetch()} />;

  const data = query.data as SecurityData;

  return (
    <div className="space-y-4">
      <SubHeader
        title="An ninh"
        description="Chặn IP phá hoại, giữ IP tin cậy"
        action={
          <Button
            size="sm"
            icon={Plus}
            onClick={() => setAdding(tab === "whitelist" ? "whitelist" : "block")}
          >
            Thêm
          </Button>
        }
      />

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "blocked", label: "Đang chặn", count: data.blocked.length },
          { value: "whitelist", label: "Tin cậy", count: data.whitelist.length },
          { value: "visitors", label: "Truy cập" },
        ]}
      />

      {tab === "blocked" && (
        <>
          {data.blocked.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="Không có IP nào đang bị chặn" />
          ) : (
            <div className="space-y-2.5">
              {data.blocked.map((entry) => (
                <Card key={entry.ip} className="flex items-center gap-3 p-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[13.5px]">{entry.ip}</p>
                    <p className="mt-0.5 truncate text-[12px] text-mist-500">
                      {entry.reason} · {timeAgo(new Date(entry.blockedAt).toISOString())}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={unblock.isPending}
                    onClick={() => unblock.mutate(entry.ip)}
                  >
                    Bỏ chặn
                  </Button>
                </Card>
              ))}
            </div>
          )}

          <section>
            <SectionTitle>Lịch sử gần đây</SectionTitle>
            <Card className="space-y-1.5 text-[12.5px] text-mist-500">
              {data.history.slice(0, 20).map((entry) => (
                <p key={`${entry.ip}-${entry.blockedAt}`} className="truncate">
                  {entry.ip} — {entry.reason}
                </p>
              ))}
              {data.history.length === 0 && <p>Chưa có gì.</p>}
            </Card>
          </section>
        </>
      )}

      {tab === "whitelist" &&
        (data.whitelist.length === 0 ? (
          <EmptyState icon={ShieldBan} title="Chưa có IP tin cậy nào" />
        ) : (
          <div className="space-y-2.5">
            {data.whitelist.map((entry) => (
              <Card key={entry} className="flex items-center gap-3 p-3.5">
                <p className="min-w-0 flex-1 truncate font-mono text-[13.5px]">{entry}</p>
                <Button
                  size="sm"
                  variant="danger"
                  icon={X}
                  onClick={() => whitelist.mutate({ action: "remove", ip: entry })}
                >
                  Gỡ
                </Button>
              </Card>
            ))}
          </div>
        ))}

      {tab === "visitors" && (
        <div className="space-y-2.5">
          {data.visitors.slice(0, 50).map((visitor) => (
            <Card key={visitor.ip} className="flex items-center gap-3 p-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[13.5px]">{visitor.ip}</p>
                <p className="mt-0.5 truncate text-[12px] text-mist-500">
                  {timeAgo(new Date(visitor.lastSeen).toISOString())}
                  {visitor.path ? ` · ${visitor.path}` : ""}
                </p>
              </div>
              <Button
                size="sm"
                variant="danger"
                onClick={() => block.mutate({ ip: visitor.ip, reason: "Chặn từ Arex Hub" })}
              >
                Chặn
              </Button>
            </Card>
          ))}
          {data.visitors.length === 0 && <EmptyState icon={ShieldCheck} title="Chưa ghi nhận lượt truy cập nào" />}
        </div>
      )}

      <Sheet
        open={Boolean(adding)}
        onClose={() => setAdding(null)}
        title={adding === "whitelist" ? "Thêm IP tin cậy" : "Chặn IP"}
        footer={
          <Button
            block
            loading={block.isPending || whitelist.isPending}
            onClick={() => {
              if (!ip.trim()) {
                toast.error("Phải nhập IP.");
                return;
              }
              if (adding === "whitelist") whitelist.mutate({ action: "add", ip: ip.trim() });
              else block.mutate({ ip: ip.trim(), reason: reason.trim() || undefined });
            }}
          >
            Xác nhận
          </Button>
        }
      >
        <div className="space-y-3.5">
          <Field label="Địa chỉ IP" required>
            <Input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="1.2.3.4" />
          </Field>
          {adding === "block" && (
            <Field label="Lý do">
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
          )}
        </div>
      </Sheet>
    </div>
  );
}
