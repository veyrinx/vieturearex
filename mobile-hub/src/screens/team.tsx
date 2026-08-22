import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Ticket, UserCheck } from "lucide-react";
import {
  Button,
  Card,
  Chip,
  ConfirmSheet,
  EmptyState,
  ErrorState,
  Field,
  Input,
  SectionTitle,
  Sheet,
  Skeleton,
} from "@/components/ui";
import { SubHeader } from "@/components/sub-header";
import { useToast } from "@/components/toast";
import { useHasRole } from "@/auth/auth-context";
import { api } from "@/lib/api";
import { formatDate, timeAgo } from "@/lib/format";
import { env } from "@/env";

/**
 * Đơn xin vào đội ngũ + mã mời.
 *
 * Duyệt hai vòng: IT xem trước (`approve_it`), rồi admin chốt (`approve_admin`).
 * Server tự kiểm quyền theo từng bước nên ở đây chỉ cần hiện đúng nút.
 */

type Applicant = {
  id: string;
  email: string;
  display_name: string | null;
  applied_role: string | null;
  application_note: string | null;
  phone: string | null;
  team_status: string;
  created_at: string;
};

type Invite = {
  id: string;
  code: string;
  label: string | null;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  created_at: string;
};

export function TeamScreen() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const isAdmin = useHasRole("admin");
  const [detail, setDetail] = useState<Applicant | null>(null);
  const [rejecting, setRejecting] = useState<Applicant | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const applications = useQuery({
    queryKey: ["team-approval"],
    queryFn: () =>
      api<{ pending_it: Applicant[]; pending_admin: Applicant[] }>("/api/admin/team/approval"),
  });

  const invites = useQuery({
    queryKey: ["team-invites"],
    queryFn: () => api<{ invites: Invite[] }>("/api/admin/team/invites").then((r) => r.invites ?? []),
  });

  const act = useMutation({
    mutationFn: (input: { userId: string; action: "approve_it" | "approve_admin" | "reject" }) =>
      api("/api/admin/team/approval", { method: "POST", body: input }),
    onSuccess: () => {
      setDetail(null);
      setRejecting(null);
      void queryClient.invalidateQueries({ queryKey: ["team-approval"] });
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Đã xử lý đơn.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const pendingIt = applications.data?.pending_it ?? [];
  const pendingAdmin = applications.data?.pending_admin ?? [];

  return (
    <div className="space-y-6">
      <SubHeader title="Đội ngũ" description="Duyệt đơn gia nhập và phát mã mời" />

      {applications.isLoading ? (
        <Skeleton className="h-24" />
      ) : applications.isError ? (
        <ErrorState
          message={(applications.error as Error).message}
          onRetry={() => void applications.refetch()}
        />
      ) : (
        <>
          <section>
            <SectionTitle>Chờ IT xem ({pendingIt.length})</SectionTitle>
            <ApplicantList items={pendingIt} onOpen={setDetail} />
          </section>

          <section>
            <SectionTitle>Chờ admin chốt ({pendingAdmin.length})</SectionTitle>
            <ApplicantList items={pendingAdmin} onOpen={setDetail} />
          </section>
        </>
      )}

      <section>
        <SectionTitle
          action={
            <Button size="sm" icon={Ticket} onClick={() => setInviteOpen(true)}>
              Tạo mã
            </Button>
          }
        >
          Mã mời
        </SectionTitle>
        {invites.isLoading ? (
          <Skeleton className="h-20" />
        ) : (invites.data ?? []).length === 0 ? (
          <EmptyState icon={Ticket} title="Chưa có mã mời nào" />
        ) : (
          <div className="space-y-2.5">
            {(invites.data ?? []).map((invite) => (
              <Card key={invite.id} className="flex items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[14px] font-semibold">{invite.code}</p>
                  <p className="mt-0.5 text-[12px] text-mist-500">
                    {invite.label ? `${invite.label} · ` : ""}
                    dùng {invite.used_count}/{invite.max_uses}
                    {invite.expires_at ? ` · hạn ${formatDate(invite.expires_at)}` : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Copy}
                  onClick={() => {
                    void navigator.clipboard
                      ?.writeText(`${env.apiBaseUrl}/team/join?code=${invite.code}`)
                      .then(() => toast.success("Đã chép link mời."))
                      .catch(() => toast.error("Máy không cho chép tự động."));
                  }}
                >
                  Chép
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Sheet
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.display_name || detail?.email || "Đơn gia nhập"}
        footer={
          detail && (
            <div className="flex gap-2">
              <Button
                variant="danger"
                block
                onClick={() => {
                  setRejecting(detail);
                  setDetail(null);
                }}
              >
                Từ chối
              </Button>
              <Button
                block
                loading={act.isPending}
                onClick={() =>
                  act.mutate({
                    userId: detail.id,
                    action: detail.team_status === "pending_admin" ? "approve_admin" : "approve_it",
                  })
                }
              >
                {detail.team_status === "pending_admin" ? "Duyệt vào đội" : "Duyệt vòng 1"}
              </Button>
            </div>
          )
        }
      >
        {detail && (
          <div className="space-y-2 text-[13.5px]">
            <Row label="Email" value={detail.email} />
            <Row label="Vị trí xin vào" value={detail.applied_role ?? "—"} />
            <Row label="Điện thoại" value={detail.phone ?? "—"} />
            <Row label="Nộp lúc" value={timeAgo(detail.created_at)} />
            {detail.application_note && (
              <div className="mt-3 rounded-2xl border border-ink-700 bg-ink-900 p-3.5">
                <p className="mb-1 text-[12px] text-mist-500">Lời nhắn</p>
                <p className="whitespace-pre-wrap text-mist-200">{detail.application_note}</p>
              </div>
            )}
            {!isAdmin && detail.team_status === "pending_admin" && (
              <p className="text-[12px] text-warn">Vòng cuối cần tài khoản admin trở lên.</p>
            )}
          </div>
        )}
      </Sheet>

      <ConfirmSheet
        open={Boolean(rejecting)}
        title="Từ chối đơn?"
        message="Người nộp sẽ nhận thông báo bị từ chối và trở lại vai trò thường."
        confirmLabel="Từ chối"
        destructive
        loading={act.isPending}
        onCancel={() => setRejecting(null)}
        onConfirm={() => rejecting && act.mutate({ userId: rejecting.id, action: "reject" })}
      />

      <InviteSheet
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onCreated={() => void invites.refetch()}
      />
    </div>
  );
}

function ApplicantList({
  items,
  onOpen,
}: {
  items: Applicant[];
  onOpen: (item: Applicant) => void;
}) {
  if (items.length === 0) {
    return <EmptyState icon={UserCheck} title="Không có đơn nào chờ" />;
  }
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <Card key={item.id} className="flex items-center gap-3 p-3.5" onClick={() => onOpen(item)}>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium">{item.display_name || item.email}</p>
            <p className="mt-0.5 truncate text-[12px] text-mist-500">
              {item.applied_role || "Chưa ghi vị trí"} · {timeAgo(item.created_at)}
            </p>
          </div>
          <Chip tone="warn">Chờ duyệt</Chip>
        </Card>
      ))}
    </div>
  );
}

function InviteSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const toast = useToast();
  const [label, setLabel] = useState("");
  const [days, setDays] = useState("7");
  const [uses, setUses] = useState("1");

  const create = useMutation({
    mutationFn: () =>
      api<{ code?: string }>("/api/admin/team/invites", {
        method: "POST",
        body: {
          label: label.trim() || undefined,
          expiresInDays: Number(days) || 7,
          maxUses: Number(uses) || 1,
        },
      }),
    onSuccess: (data) => {
      onCreated();
      onClose();
      toast.success(data?.code ? `Đã tạo mã ${data.code}` : "Đã tạo mã mời.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Tạo mã mời"
      footer={
        <Button block loading={create.isPending} onClick={() => create.mutate()}>
          Tạo mã
        </Button>
      }
    >
      <div className="space-y-3.5">
        <Field label="Ghi chú" hint="Để nhớ mã này phát cho ai.">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Tuyển CTV tháng 8" />
        </Field>
        <Field label="Hạn dùng (ngày)">
          <Input value={days} onChange={(e) => setDays(e.target.value)} inputMode="numeric" />
        </Field>
        <Field label="Số lượt dùng">
          <Input value={uses} onChange={(e) => setUses(e.target.value)} inputMode="numeric" />
        </Field>
      </div>
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-mist-500">{label}</span>
      <span className="truncate text-right">{value}</span>
    </div>
  );
}
