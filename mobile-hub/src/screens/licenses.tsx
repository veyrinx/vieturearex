import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, Plus } from "lucide-react";
import {
  Button,
  Card,
  Chip,
  ConfirmSheet,
  EmptyState,
  ErrorState,
  Field,
  Input,
  SearchInput,
  Segmented,
  Select,
  Sheet,
  Skeleton,
  Textarea,
  type ChipTone,
} from "@/components/ui";
import { SubHeader } from "@/components/sub-header";
import { useToast } from "@/components/toast";
import { useHasRole } from "@/auth/auth-context";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";

/**
 * Giấy phép cấp cho đối tác dùng sản phẩm Arex.
 *
 * Mã đầy đủ chỉ hiện ĐÚNG MỘT LẦN ngay sau khi cấp — server không trả lại nữa,
 * nên màn hình giữ nó trong tấm trượt cho tới khi người dùng tự đóng.
 */

type License = {
  id: string;
  key_masked: string;
  partner_name: string;
  contact: string | null;
  product: string;
  plan: string;
  domains: string[];
  max_activations: number;
  activation_count: number;
  status: string;
  effective_status: string;
  days_left: number | null;
  expires_at: string | null;
  note: string | null;
  created_at: string;
};

const PRODUCT_LABEL: Record<string, string> = {
  website: "Website",
  mobile_app: "App di động",
  hub: "Arex Hub",
  api: "API / dữ liệu",
  other: "Khác",
};

const PLAN_LABEL: Record<string, string> = {
  trial: "Dùng thử",
  standard: "Tiêu chuẩn",
  pro: "Nâng cao",
  lifetime: "Trọn đời",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Đang hiệu lực",
  suspended: "Tạm khoá",
  revoked: "Đã thu hồi",
  expired: "Hết hạn",
};

const STATUS_TONE: Record<string, ChipTone> = {
  active: "ok",
  suspended: "warn",
  revoked: "danger",
  expired: "neutral",
};

export function LicensesScreen() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const isSuper = useHasRole("super_admin");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<License | null>(null);
  const [creating, setCreating] = useState(false);
  const [issued, setIssued] = useState<string | null>(null);
  const [removing, setRemoving] = useState<License | null>(null);

  const query = useQuery({
    queryKey: ["licenses", status],
    queryFn: () =>
      api<{ items: License[] }>(
        `/api/admin/licenses${status === "all" ? "" : `?status=${status}`}`,
      ).then((r) => r.items ?? []),
  });

  const patch = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api("/api/admin/licenses", { method: "PATCH", body }),
    onSuccess: () => {
      setDetail(null);
      void queryClient.invalidateQueries({ queryKey: ["licenses"] });
      toast.success("Đã cập nhật giấy phép.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/admin/licenses?id=${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setRemoving(null);
      setDetail(null);
      void queryClient.invalidateQueries({ queryKey: ["licenses"] });
      toast.success("Đã xoá giấy phép.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const items = (query.data ?? []).filter((item) =>
    search.trim()
      ? `${item.partner_name} ${item.key_masked} ${item.domains.join(" ")}`
          .toLowerCase()
          .includes(search.trim().toLowerCase())
      : true,
  );

  return (
    <div className="space-y-4">
      <SubHeader
        title="Giấy phép"
        description="Cấp và thu hồi mã dùng sản phẩm Arex"
        action={
          <Button size="sm" icon={Plus} onClick={() => setCreating(true)}>
            Cấp mã
          </Button>
        }
      />

      <Segmented
        value={status}
        onChange={setStatus}
        options={[
          { value: "all", label: "Tất cả" },
          { value: "active", label: "Hiệu lực" },
          { value: "suspended", label: "Tạm khoá" },
          { value: "revoked", label: "Thu hồi" },
        ]}
      />

      <SearchInput value={search} onChange={setSearch} placeholder="Tìm đối tác, tên miền…" />

      {query.isLoading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState message={(query.error as Error).message} onRetry={() => void query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={KeyRound} title="Chưa cấp giấy phép nào" />
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <Card key={item.id} className="p-3.5" onClick={() => setDetail(item)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium">{item.partner_name}</p>
                  <p className="mt-0.5 truncate font-mono text-[12px] text-mist-500">
                    {item.key_masked}
                  </p>
                </div>
                <Chip tone={STATUS_TONE[item.effective_status] ?? "neutral"}>
                  {STATUS_LABEL[item.effective_status] ?? item.effective_status}
                </Chip>
              </div>
              <p className="mt-2 text-[12px] text-mist-500">
                {PRODUCT_LABEL[item.product] ?? item.product} ·{" "}
                {PLAN_LABEL[item.plan] ?? item.plan} · cài {item.activation_count}/
                {item.max_activations}
                {item.expires_at ? ` · hạn ${formatDate(item.expires_at)}` : " · không hạn"}
              </p>
            </Card>
          ))}
        </div>
      )}

      <Sheet
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.partner_name ?? "Giấy phép"}
      >
        {detail && (
          <div className="space-y-3">
            <div className="space-y-1.5 text-[13.5px]">
              <Row label="Mã" value={detail.key_masked} />
              <Row label="Sản phẩm" value={PRODUCT_LABEL[detail.product] ?? detail.product} />
              <Row label="Gói" value={PLAN_LABEL[detail.plan] ?? detail.plan} />
              <Row label="Liên hệ" value={detail.contact ?? "—"} />
              <Row label="Tên miền" value={detail.domains.join(", ") || "Không giới hạn"} />
              <Row
                label="Bản cài đặt"
                value={`${detail.activation_count}/${detail.max_activations}`}
              />
              <Row
                label="Hạn dùng"
                value={detail.expires_at ? formatDate(detail.expires_at) : "Không hạn"}
              />
              {detail.note && <Row label="Ghi chú" value={detail.note} />}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                loading={patch.isPending}
                onClick={() =>
                  patch.mutate({
                    id: detail.id,
                    status: detail.status === "suspended" ? "active" : "suspended",
                  })
                }
              >
                {detail.status === "suspended" ? "Mở khoá" : "Tạm khoá"}
              </Button>
              <Button
                variant="danger"
                loading={patch.isPending}
                onClick={() => patch.mutate({ id: detail.id, status: "revoked" })}
              >
                Thu hồi
              </Button>
            </div>

            <Button
              variant="secondary"
              block
              onClick={() =>
                patch.mutate({
                  id: detail.id,
                  expires_at: new Date(Date.now() + 365 * 86_400_000).toISOString(),
                })
              }
            >
              Gia hạn thêm 1 năm
            </Button>

            {isSuper && (
              <Button variant="outline" block onClick={() => setRemoving(detail)}>
                Xoá hẳn giấy phép
              </Button>
            )}
          </div>
        )}
      </Sheet>

      <CreateSheet
        open={creating}
        onClose={() => setCreating(false)}
        onIssued={(key) => {
          setCreating(false);
          setIssued(key);
          void queryClient.invalidateQueries({ queryKey: ["licenses"] });
        }}
      />

      <Sheet open={Boolean(issued)} onClose={() => setIssued(null)} title="Mã vừa cấp">
        <p className="text-[13px] text-warn">
          Mã đầy đủ chỉ hiện một lần duy nhất. Chép và gửi cho đối tác ngay.
        </p>
        <p className="mt-3 rounded-2xl border border-ink-700 bg-ink-900 px-3.5 py-3 font-mono text-[15px] break-all">
          {issued}
        </p>
        <Button
          block
          icon={Copy}
          className="mt-3"
          onClick={() => {
            void navigator.clipboard
              ?.writeText(issued ?? "")
              .then(() => toast.success("Đã chép mã."))
              .catch(() => toast.error("Máy không cho chép tự động."));
          }}
        >
          Chép mã
        </Button>
      </Sheet>

      <ConfirmSheet
        open={Boolean(removing)}
        title="Xoá giấy phép?"
        message="Xoá hẳn thì mất luôn nhật ký kích hoạt. Muốn chặn dùng thì nên thu hồi."
        confirmLabel="Xoá"
        destructive
        loading={remove.isPending}
        onCancel={() => setRemoving(null)}
        onConfirm={() => removing && remove.mutate(removing.id)}
      />
    </div>
  );
}

function CreateSheet({
  open,
  onClose,
  onIssued,
}: {
  open: boolean;
  onClose: () => void;
  onIssued: (key: string) => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({
    partner_name: "",
    contact: "",
    product: "website",
    plan: "standard",
    domains: "",
    max_activations: "1",
    months: "12",
    note: "",
  });

  const create = useMutation({
    mutationFn: () => {
      const months = Number(form.months);
      return api<{ license?: { key?: string } }>("/api/admin/licenses", {
        method: "POST",
        body: {
          partner_name: form.partner_name.trim(),
          contact: form.contact.trim() || undefined,
          product: form.product,
          plan: form.plan,
          domains: form.domains
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
          features: [],
          max_activations: Number(form.max_activations) || 1,
          expires_at:
            form.plan === "lifetime" || !months
              ? null
              : new Date(Date.now() + months * 30 * 86_400_000).toISOString(),
          note: form.note.trim() || undefined,
        },
      });
    },
    onSuccess: (data) => onIssued(data?.license?.key ?? "(server không trả mã)"),
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Cấp giấy phép"
      footer={
        <Button
          block
          loading={create.isPending}
          onClick={() => {
            if (!form.partner_name.trim()) {
              toast.error("Phải có tên đối tác.");
              return;
            }
            create.mutate();
          }}
        >
          Cấp mã
        </Button>
      }
    >
      <div className="space-y-3.5">
        <Field label="Tên đối tác" required>
          <Input
            value={form.partner_name}
            onChange={(e) => setForm({ ...form, partner_name: e.target.value })}
          />
        </Field>
        <Field label="Liên hệ" hint="Email hoặc số điện thoại.">
          <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
        </Field>
        <Field label="Sản phẩm">
          <Select value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })}>
            {Object.entries(PRODUCT_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Gói">
          <Select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
            {Object.entries(PLAN_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tên miền được dùng" hint="Mỗi dòng một tên miền. Bỏ trống là không giới hạn.">
          <Textarea
            rows={3}
            value={form.domains}
            onChange={(e) => setForm({ ...form, domains: e.target.value })}
          />
        </Field>
        <Field label="Số bản cài đặt tối đa">
          <Input
            inputMode="numeric"
            value={form.max_activations}
            onChange={(e) => setForm({ ...form, max_activations: e.target.value })}
          />
        </Field>
        <Field label="Thời hạn (tháng)" hint="Gói trọn đời bỏ qua ô này.">
          <Input
            inputMode="numeric"
            value={form.months}
            onChange={(e) => setForm({ ...form, months: e.target.value })}
          />
        </Field>
        <Field label="Ghi chú">
          <Textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </Field>
      </div>
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-mist-500">{label}</span>
      <span className="ml-auto max-w-[62%] text-right break-words">{value}</span>
    </div>
  );
}
