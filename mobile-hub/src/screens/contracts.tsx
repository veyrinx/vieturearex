import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSignature, Link2 } from "lucide-react";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Segmented,
  Sheet,
  Skeleton,
  Textarea,
  type ChipTone,
} from "@/components/ui";
import { SubHeader } from "@/components/sub-header";
import { useToast } from "@/components/toast";
import { useHasRole } from "@/auth/auth-context";
import { api } from "@/lib/api";
import { formatDateTime, timeAgo } from "@/lib/format";
import { openExternal } from "@/lib/native";

/**
 * Hợp đồng hợp tác — xem, ký thay Bên A, từ chối, chấm dứt.
 *
 * Ký là hành vi ràng buộc pháp lý nên server chỉ cho super_admin, và bắt buộc có
 * ảnh chữ ký PNG. Ở đây vẽ tay bằng canvas rồi gửi lên dạng data URL.
 */

type Contract = {
  id: string;
  code: string;
  kind: string;
  status: string;
  party_type: string;
  full_name: string;
  display_name: string;
  team_name: string | null;
  email: string;
  phone: string | null;
  b_signed_name: string;
  b_signed_at: string;
  a_signer_name: string | null;
  a_signed_at: string | null;
  reject_reason: string | null;
  admin_note: string | null;
  created_at: string;
};

type ContractEvent = { id: string; event: string; detail: string | null; created_at: string };

const STATUS_LABEL: Record<string, string> = {
  pending: "Chờ Arex ký",
  signed: "Đang hiệu lực",
  rejected: "Bị từ chối",
  terminated: "Đã chấm dứt",
  expired: "Hết hạn",
};

const STATUS_TONE: Record<string, ChipTone> = {
  pending: "warn",
  signed: "ok",
  rejected: "danger",
  terminated: "neutral",
  expired: "neutral",
};

const KIND_LABEL: Record<string, string> = {
  team: "Hợp tác đội nhóm",
  member: "Tham gia đội ngũ",
  tech: "Đối tác kỹ thuật",
};

const EVENT_LABEL: Record<string, string> = {
  created: "Tạo hợp đồng",
  viewed: "Mở xem",
  signed_b: "Bên B ký",
  signed_a: "Bên A ký",
  rejected: "Từ chối",
  terminated: "Chấm dứt",
  expired: "Hết hạn",
  note: "Ghi chú",
};

function partyName(row: Contract) {
  if (row.party_type === "team") return row.team_name || row.display_name || row.full_name;
  return row.display_name || row.full_name;
}

export function ContractsScreen() {
  const [status, setStatus] = useState("pending");
  const [openId, setOpenId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["contracts"],
    queryFn: () =>
      api<{ items: Contract[] }>("/api/admin/partnership-contracts").then((r) => r.items ?? []),
  });

  const items = (query.data ?? []).filter((item) =>
    status === "all" ? true : item.status === status,
  );

  return (
    <div className="space-y-4">
      <SubHeader title="Hợp đồng hợp tác" description="Ký, từ chối và theo dõi hiệu lực" />

      <Segmented
        value={status}
        onChange={setStatus}
        options={[
          { value: "pending", label: "Chờ ký" },
          { value: "signed", label: "Hiệu lực" },
          { value: "all", label: "Tất cả" },
        ]}
      />

      {query.isLoading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState message={(query.error as Error).message} onRetry={() => void query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={FileSignature} title="Không có hợp đồng nào ở mục này" />
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <Card key={item.id} className="p-3.5" onClick={() => setOpenId(item.id)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium">{partyName(item)}</p>
                  <p className="mt-0.5 truncate font-mono text-[12px] text-mist-500">{item.code}</p>
                </div>
                <Chip tone={STATUS_TONE[item.status] ?? "neutral"}>
                  {STATUS_LABEL[item.status] ?? item.status}
                </Chip>
              </div>
              <p className="mt-2 text-[12px] text-mist-500">
                {KIND_LABEL[item.kind] ?? item.kind} · Bên B ký {timeAgo(item.b_signed_at)}
              </p>
            </Card>
          ))}
        </div>
      )}

      <DetailSheet id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function DetailSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const isSuper = useHasRole("super_admin");
  const [mode, setMode] = useState<"none" | "sign" | "reject" | "terminate" | "note">("none");
  const [reason, setReason] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signerTitle, setSignerTitle] = useState("");
  const padRef = useRef<SignaturePadHandle>(null);

  const detail = useQuery({
    queryKey: ["contract", id],
    enabled: Boolean(id),
    queryFn: () =>
      api<{ item: Contract; events: ContractEvent[]; partnerUrl: string }>(
        `/api/admin/partnership-contracts/${id}`,
      ),
  });

  useEffect(() => {
    setMode("none");
    setReason("");
  }, [id]);

  const act = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api(`/api/admin/partnership-contracts/${id}`, { method: "PATCH", body }),
    onSuccess: () => {
      setMode("none");
      setReason("");
      void queryClient.invalidateQueries({ queryKey: ["contracts"] });
      void detail.refetch();
      toast.success("Đã cập nhật hợp đồng.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const item = detail.data?.item;

  return (
    <Sheet open={Boolean(id)} onClose={onClose} title={item ? item.code : "Hợp đồng"}>
      {detail.isLoading || !item ? (
        <Skeleton className="h-40" />
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5 text-[13.5px]">
            <Row label="Bên B" value={partyName(item)} />
            <Row label="Loại" value={KIND_LABEL[item.kind] ?? item.kind} />
            <Row label="Trạng thái" value={STATUS_LABEL[item.status] ?? item.status} />
            <Row label="Email" value={item.email} />
            <Row label="Điện thoại" value={item.phone ?? "—"} />
            <Row label="Bên B ký" value={`${item.b_signed_name} · ${formatDateTime(item.b_signed_at)}`} />
            {item.a_signed_at && (
              <Row
                label="Bên A ký"
                value={`${item.a_signer_name ?? "—"} · ${formatDateTime(item.a_signed_at)}`}
              />
            )}
            {item.reject_reason && <Row label="Lý do từ chối" value={item.reject_reason} />}
            {item.admin_note && <Row label="Ghi chú" value={item.admin_note} />}
          </div>

          <Button
            variant="secondary"
            block
            icon={Link2}
            onClick={() => void openExternal(detail.data?.partnerUrl ?? "")}
          >
            Mở bản hợp đồng đầy đủ
          </Button>

          {mode === "none" ? (
            <div className="space-y-2">
              {item.status === "pending" && isSuper && (
                <>
                  <Button block onClick={() => setMode("sign")}>
                    Ký thay Bên A
                  </Button>
                  <Button variant="danger" block onClick={() => setMode("reject")}>
                    Từ chối
                  </Button>
                </>
              )}
              {item.status === "signed" && isSuper && (
                <Button variant="danger" block onClick={() => setMode("terminate")}>
                  Chấm dứt hợp đồng
                </Button>
              )}
              {isSuper && (
                <Button variant="outline" block onClick={() => setMode("note")}>
                  Thêm ghi chú
                </Button>
              )}
              {!isSuper && (
                <p className="text-center text-[12px] text-mist-500">
                  Chỉ super admin mới ký hoặc chấm dứt được hợp đồng.
                </p>
              )}
            </div>
          ) : mode === "sign" ? (
            <div className="space-y-3.5">
              <Field label="Họ tên người đại diện Bên A" required>
                <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} />
              </Field>
              <Field label="Chức danh">
                <Input
                  value={signerTitle}
                  onChange={(e) => setSignerTitle(e.target.value)}
                  placeholder="Người đại diện"
                />
              </Field>
              <Field label="Chữ ký" hint="Ký bằng ngón tay vào khung dưới.">
                <SignaturePad ref={padRef} />
              </Field>
              <div className="flex gap-2">
                <Button variant="secondary" block onClick={() => setMode("none")}>
                  Huỷ
                </Button>
                <Button
                  block
                  loading={act.isPending}
                  onClick={() => {
                    const signature = padRef.current?.toDataUrl();
                    if (!signerName.trim() || !signature) {
                      toast.error("Cần họ tên và chữ ký.");
                      return;
                    }
                    act.mutate({
                      action: "sign",
                      signer_name: signerName.trim(),
                      signer_title: signerTitle.trim() || undefined,
                      signature,
                    });
                  }}
                >
                  Ký hợp đồng
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              <Field
                label={mode === "note" ? "Ghi chú" : "Lý do"}
                required={mode !== "note"}
              >
                <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
              </Field>
              <div className="flex gap-2">
                <Button variant="secondary" block onClick={() => setMode("none")}>
                  Huỷ
                </Button>
                <Button
                  variant={mode === "note" ? "primary" : "danger"}
                  block
                  loading={act.isPending}
                  onClick={() => {
                    if (mode !== "note" && !reason.trim()) {
                      toast.error("Phải ghi lý do.");
                      return;
                    }
                    act.mutate(
                      mode === "note"
                        ? { action: "note", note: reason.trim() }
                        : { action: mode, reason: reason.trim() },
                    );
                  }}
                >
                  Xác nhận
                </Button>
              </div>
            </div>
          )}

          <div>
            <p className="mb-1.5 text-[12px] font-semibold tracking-wide text-mist-500 uppercase">
              Nhật ký
            </p>
            <div className="space-y-1.5 text-[12.5px] text-mist-500">
              {(detail.data?.events ?? []).map((event) => (
                <p key={event.id}>
                  {EVENT_LABEL[event.event] ?? event.event}
                  {event.detail ? ` — ${event.detail}` : ""} · {timeAgo(event.created_at)}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
}

type SignaturePadHandle = { toDataUrl: () => string | null };

/** Khung ký bằng ngón tay — xuất PNG data URL đúng định dạng server yêu cầu. */
function SignaturePad({ ref }: { ref: React.RefObject<SignaturePadHandle | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scale = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * scale;
    canvas.height = canvas.clientHeight * scale;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(scale, scale);
    context.lineWidth = 2.2;
    context.lineCap = "round";
    context.strokeStyle = "#e7ecf5";
  }, []);

  ref.current = {
    toDataUrl: () => (dirty.current ? (canvasRef.current?.toDataURL("image/png") ?? null) : null),
  };

  function pointFrom(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        className="h-40 w-full touch-none rounded-2xl border border-ink-700 bg-ink-900"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          const context = canvasRef.current?.getContext("2d");
          if (!context) return;
          const point = pointFrom(event);
          context.beginPath();
          context.moveTo(point.x, point.y);
          drawing.current = true;
          dirty.current = true;
        }}
        onPointerMove={(event) => {
          if (!drawing.current) return;
          const context = canvasRef.current?.getContext("2d");
          if (!context) return;
          const point = pointFrom(event);
          context.lineTo(point.x, point.y);
          context.stroke();
        }}
        onPointerUp={() => {
          drawing.current = false;
        }}
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          const canvas = canvasRef.current;
          const context = canvas?.getContext("2d");
          if (!canvas || !context) return;
          context.clearRect(0, 0, canvas.width, canvas.height);
          dirty.current = false;
        }}
      >
        Ký lại
      </Button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 text-mist-500">{label}</span>
      <span className="max-w-[62%] text-right break-words">{value}</span>
    </div>
  );
}
