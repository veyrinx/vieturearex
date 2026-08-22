import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Headset, Send } from "lucide-react";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Input,
  Segmented,
  Sheet,
  Skeleton,
  cx,
} from "@/components/ui";
import { SubHeader } from "@/components/sub-header";
import { useToast } from "@/components/toast";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/format";

/**
 * Hộp thoại CSKH.
 *
 * Danh sách phiên lấy ở `/api/admin/support`, nội dung từng phiên lấy ở endpoint
 * công khai `/api/support/session/{id}/messages` (chính là chỗ khách đang dùng),
 * nên trả lời trong app hiện ngay bên khách. Không có websocket nên khi đang mở
 * một phiên thì hỏi lại server mỗi 10 giây.
 */

type SupportSession = {
  id: string;
  display_name: string | null;
  status: string;
  last_message_at: string;
  created_at: string;
};

type SupportMessage = {
  id: string;
  sender_type: string;
  sender_name: string;
  content: string;
  created_at: string;
};

export function SupportScreen() {
  const [status, setStatus] = useState("open");
  const [openSession, setOpenSession] = useState<SupportSession | null>(null);

  const query = useQuery({
    queryKey: ["support-sessions"],
    queryFn: () =>
      api<{ sessions: SupportSession[] }>("/api/admin/support").then((r) => r.sessions ?? []),
    refetchInterval: 30_000,
  });

  const sessions = (query.data ?? []).filter((s) =>
    status === "all" ? true : status === "open" ? s.status !== "closed" : s.status === "closed",
  );

  return (
    <div className="space-y-4">
      <SubHeader title="Hỗ trợ khách hàng" description="Trả lời khách đang chờ trên web" />

      <Segmented
        value={status}
        onChange={setStatus}
        options={[
          { value: "open", label: "Đang mở" },
          { value: "closed", label: "Đã đóng" },
          { value: "all", label: "Tất cả" },
        ]}
      />

      {query.isLoading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState message={(query.error as Error).message} onRetry={() => void query.refetch()} />
      ) : sessions.length === 0 ? (
        <EmptyState icon={Headset} title="Không có phiên nào" />
      ) : (
        <div className="space-y-2.5">
          {sessions.map((session) => (
            <Card
              key={session.id}
              className="flex items-center gap-3 p-3.5"
              onClick={() => setOpenSession(session)}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium">
                  {session.display_name || "Khách ẩn danh"}
                </p>
                <p className="mt-0.5 text-[12px] text-mist-500">
                  Tin cuối {timeAgo(session.last_message_at)}
                </p>
              </div>
              <Chip tone={session.status === "closed" ? "neutral" : "ok"}>
                {session.status === "closed" ? "Đã đóng" : "Đang mở"}
              </Chip>
            </Card>
          ))}
        </div>
      )}

      <SessionSheet session={openSession} onClose={() => setOpenSession(null)} />
    </div>
  );
}

function SessionSheet({
  session,
  onClose,
}: {
  session: SupportSession | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  const messages = useQuery({
    queryKey: ["support-messages", session?.id],
    enabled: Boolean(session),
    queryFn: () =>
      api<{ messages: SupportMessage[] }>(`/api/support/session/${session?.id}/messages`).then(
        (r) => r.messages ?? [],
      ),
    refetchInterval: 10_000,
  });

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.data]);

  const reply = useMutation({
    mutationFn: (content: string) =>
      api("/api/admin/support/reply", {
        method: "POST",
        body: { session_id: session?.id, content },
      }),
    onSuccess: () => {
      setText("");
      void messages.refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggle = useMutation({
    mutationFn: (next: "open" | "closed") =>
      api("/api/admin/support", { method: "PATCH", body: { id: session?.id, status: next } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["support-sessions"] });
      toast.success("Đã cập nhật phiên.");
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const closed = session?.status === "closed";

  return (
    <Sheet
      open={Boolean(session)}
      onClose={onClose}
      title={session?.display_name || "Khách ẩn danh"}
      footer={
        <div className="flex items-center gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Nhập câu trả lời…"
            className="py-2.5"
          />
          <Button
            icon={Send}
            loading={reply.isPending}
            disabled={!text.trim()}
            onClick={() => reply.mutate(text.trim())}
          >
            Gửi
          </Button>
        </div>
      }
    >
      <div className="space-y-2.5">
        {(messages.data ?? []).map((message) => {
          const mine = message.sender_type !== "user";
          return (
            <div key={message.id} className={cx("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cx(
                  "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed",
                  mine ? "bg-violet-glow/15 text-mist-100" : "bg-ink-800 text-mist-200",
                )}
              >
                <p className="mb-0.5 text-[11px] text-mist-500">
                  {message.sender_name} · {timeAgo(message.created_at)}
                </p>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      <Button
        variant={closed ? "secondary" : "danger"}
        block
        className="mt-4"
        loading={toggle.isPending}
        onClick={() => toggle.mutate(closed ? "open" : "closed")}
      >
        {closed ? "Mở lại phiên" : "Đóng phiên"}
      </Button>
    </Sheet>
  );
}
