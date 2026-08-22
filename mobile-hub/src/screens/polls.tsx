import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart2, Plus, Trash2 } from "lucide-react";
import {
  Button,
  Card,
  Chip,
  ConfirmSheet,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Segmented,
  Sheet,
  Skeleton,
  Textarea,
} from "@/components/ui";
import { SubHeader } from "@/components/sub-header";
import { useToast } from "@/components/toast";
import { api } from "@/lib/api";
import { formatDateTime, fromLocalInputValue, timeAgo } from "@/lib/format";

/** Bình chọn: tạo, xem kết quả, đóng và xoá. */

type Poll = {
  id: string;
  question: string;
  status: string;
  entity_type: string | null;
  ends_at: string | null;
  created_at: string;
  poll_options: { id: string; label: string }[];
};

type PollResult = {
  id: string;
  question: string;
  status: string;
  totalVotes: number;
  options: { id: string; label: string; votes: number; percent: number }[];
};

export function PollsScreen() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("all");
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Poll | null>(null);

  const query = useQuery({
    queryKey: ["polls"],
    queryFn: () => api<{ polls: Poll[] }>("/api/polls?active=false").then((r) => r.polls ?? []),
  });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["polls"] });
  }

  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/polls/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setRemoving(null);
      refresh();
      toast.success("Đã xoá bình chọn.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const items = (query.data ?? []).filter((poll) =>
    status === "all" ? true : poll.status === status,
  );

  return (
    <div className="space-y-4">
      <SubHeader
        title="Bình chọn"
        description="Tạo poll cho sự kiện, tin tức"
        action={
          <Button size="sm" icon={Plus} onClick={() => setCreating(true)}>
            Tạo
          </Button>
        }
      />

      <Segmented
        value={status}
        onChange={setStatus}
        options={[
          { value: "all", label: "Tất cả" },
          { value: "active", label: "Đang mở" },
          { value: "closed", label: "Đã đóng" },
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
        <EmptyState icon={BarChart2} title="Chưa có bình chọn nào" />
      ) : (
        <div className="space-y-2.5">
          {items.map((poll) => (
            <Card key={poll.id} className="p-3.5">
              <button type="button" className="w-full text-left" onClick={() => setOpenId(poll.id)}>
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 text-[14px] font-medium">{poll.question}</p>
                  <Chip tone={poll.status === "active" ? "ok" : "neutral"}>
                    {poll.status === "active" ? "Đang mở" : "Đã đóng"}
                  </Chip>
                </div>
                <p className="mt-1 text-[12px] text-mist-500">
                  {poll.poll_options?.length ?? 0} lựa chọn · tạo {timeAgo(poll.created_at)}
                  {poll.ends_at ? ` · kết thúc ${formatDateTime(poll.ends_at)}` : ""}
                </p>
              </button>
              <Button
                size="sm"
                variant="danger"
                icon={Trash2}
                className="mt-3"
                onClick={() => setRemoving(poll)}
              >
                Xoá
              </Button>
            </Card>
          ))}
        </div>
      )}

      <ResultSheet id={openId} onClose={() => setOpenId(null)} onChanged={refresh} />

      <CreateSheet
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          refresh();
        }}
      />

      <ConfirmSheet
        open={Boolean(removing)}
        title="Xoá bình chọn?"
        message="Mọi lượt bình chọn đã ghi nhận cũng mất theo."
        confirmLabel="Xoá"
        destructive
        loading={remove.isPending}
        onCancel={() => setRemoving(null)}
        onConfirm={() => removing && remove.mutate(removing.id)}
      />
    </div>
  );
}

function ResultSheet({
  id,
  onClose,
  onChanged,
}: {
  id: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const query = useQuery({
    queryKey: ["poll", id],
    enabled: Boolean(id),
    queryFn: () => api<PollResult>(`/api/polls/${id}`),
  });

  const toggle = useMutation({
    mutationFn: (next: string) => api(`/api/polls/${id}`, { method: "PATCH", body: { status: next } }),
    onSuccess: () => {
      onChanged();
      void query.refetch();
      toast.success("Đã cập nhật.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const poll = query.data;

  return (
    <Sheet open={Boolean(id)} onClose={onClose} title="Kết quả bình chọn">
      {query.isLoading || !poll ? (
        <Skeleton className="h-32" />
      ) : (
        <div className="space-y-4">
          <p className="text-[14px] font-medium">{poll.question}</p>
          <div className="space-y-2.5">
            {poll.options.map((option) => (
              <div key={option.id}>
                <div className="mb-1 flex justify-between text-[12.5px]">
                  <span className="text-mist-200">{option.label}</span>
                  <span className="text-mist-500">
                    {option.votes} · {option.percent}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-ink-800">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-violet-glow to-cyan-glow"
                    style={{ width: `${option.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-[12.5px] text-mist-500">Tổng {poll.totalVotes} lượt bình chọn.</p>
          <Button
            variant={poll.status === "active" ? "danger" : "secondary"}
            block
            loading={toggle.isPending}
            onClick={() => toggle.mutate(poll.status === "active" ? "closed" : "active")}
          >
            {poll.status === "active" ? "Đóng bình chọn" : "Mở lại"}
          </Button>
        </div>
      )}
    </Sheet>
  );
}

function CreateSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const toast = useToast();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const create = useMutation({
    mutationFn: () =>
      api("/api/polls", {
        method: "POST",
        body: {
          question: question.trim(),
          options: options
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
          entity_type: "global",
          ends_at: endsAt ? fromLocalInputValue(endsAt) : null,
        },
      }),
    onSuccess: () => {
      setQuestion("");
      setOptions("");
      setEndsAt("");
      onCreated();
      toast.success("Đã tạo bình chọn.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Tạo bình chọn"
      footer={
        <Button
          block
          loading={create.isPending}
          onClick={() => {
            const list = options.split("\n").filter((line) => line.trim());
            if (question.trim().length < 5 || list.length < 2) {
              toast.error("Cần câu hỏi từ 5 ký tự và ít nhất 2 lựa chọn.");
              return;
            }
            create.mutate();
          }}
        >
          Tạo
        </Button>
      }
    >
      <div className="space-y-3.5">
        <Field label="Câu hỏi" required>
          <Textarea rows={2} value={question} onChange={(e) => setQuestion(e.target.value)} />
        </Field>
        <Field label="Lựa chọn" hint="Mỗi dòng một lựa chọn (2–8 dòng)." required>
          <Textarea rows={5} value={options} onChange={(e) => setOptions(e.target.value)} />
        </Field>
        <Field label="Kết thúc lúc" hint="Bỏ trống là mở đến khi tự đóng.">
          <Input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </Field>
      </div>
    </Sheet>
  );
}
