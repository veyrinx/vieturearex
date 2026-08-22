"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Ban, CalendarClock, Check, Copy, Eye, KeyRound, Loader2, Plus, RotateCcw,
  ScrollText, Search, ShieldCheck, Trash2, Unplug, X,
} from "lucide-react";
import {
  LICENSE_DENY_REASON_LABEL,
  LICENSE_PLANS,
  LICENSE_PLAN_LABEL,
  LICENSE_PRODUCTS,
  LICENSE_PRODUCT_LABEL,
  LICENSE_STATUSES,
  LICENSE_STATUS_LABEL,
  LICENSE_STATUS_TONE,
  vnDateTime,
  type LicenseActivation,
  type LicenseEffectiveStatus,
  type LicenseEvent,
  type LicenseListItem,
  type LicensePlan,
  type LicenseRecord,
  type LicenseProduct,
  type LicenseStatus,
} from "@/lib/constants/license";
import { cn } from "@/lib/utils";

const INPUT =
  "h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60";
const LABEL = "text-[10px] font-bold uppercase tracking-widest text-muted-foreground";
const BTN =
  "inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-3 py-1.5 text-xs font-medium transition hover:bg-muted disabled:opacity-50";

const FILTERS: Array<{ key: LicenseStatus | "all"; label: string }> = [
  { key: "all", label: "Tất cả" },
  ...LICENSE_STATUSES.map((s) => ({ key: s, label: LICENSE_STATUS_LABEL[s] })),
];

type Detail = {
  // Chi tiết trả về bản ghi đầy đủ (mã đã che hoặc đã lộ tuỳ `revealed`), khác
  // với danh sách vốn chỉ có key_masked.
  license: LicenseRecord & {
    revealed: boolean;
    effective_status: LicenseEffectiveStatus;
    days_left: number | null;
  };
  activations: LicenseActivation[];
  events: LicenseEvent[];
};

/** Ngày (yyyy-mm-dd) → hết hiệu lực lúc cuối ngày đó theo giờ VN. */
function dateToExpiry(value: string): string | null {
  if (!value) return null;
  const d = new Date(`${value}T23:59:59+07:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function expiryToDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // Cắt theo giờ VN để ô ngày hiện đúng ngày người cấp đã chọn.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(d);
}

function splitList(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function StatusBadge({ status }: { status: LicenseEffectiveStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
        LICENSE_STATUS_TONE[status],
      )}
    >
      {LICENSE_STATUS_LABEL[status]}
    </span>
  );
}

export function LicensesPanel({
  initialItems,
  canDelete,
  canReveal,
}: {
  initialItems: LicenseListItem[];
  canDelete: boolean;
  canReveal: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<LicenseStatus | "all">("all");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);

  // Cấp mã mới
  const [openForm, setOpenForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [contact, setContact] = useState("");
  const [product, setProduct] = useState<LicenseProduct>("website");
  const [plan, setPlan] = useState<LicensePlan>("standard");
  const [domains, setDomains] = useState("");
  const [features, setFeatures] = useState("");
  const [maxActivations, setMaxActivations] = useState(1);
  const [expiresOn, setExpiresOn] = useState("");
  const [note, setNote] = useState("");
  /** Mã vừa cấp — hiện nguyên văn đúng một lần để chép cho đối tác. */
  const [issued, setIssued] = useState<{ key: string; partner: string } | null>(null);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((i) => {
      if (filter !== "all" && i.status !== filter) return false;
      if (!needle) return true;
      return (
        i.partner_name.toLowerCase().includes(needle) ||
        (i.contact ?? "").toLowerCase().includes(needle) ||
        i.key_masked.toLowerCase().includes(needle) ||
        i.domains.some((d) => d.includes(needle))
      );
    });
  }, [items, filter, q]);

  const stats = useMemo(() => {
    const active = items.filter((i) => i.effective_status === "active").length;
    const soon = items.filter(
      (i) => i.effective_status === "active" && i.days_left !== null && i.days_left <= 30,
    ).length;
    const dead = items.filter(
      (i) => i.effective_status === "revoked" || i.effective_status === "expired",
    ).length;
    return { total: items.length, active, soon, dead };
  }, [items]);

  async function refresh() {
    const res = await fetch("/api/admin/licenses");
    const json = (await res.json().catch(() => ({}))) as { items?: LicenseListItem[] };
    if (json.items) setItems(json.items);
  }

  async function copy(text: string, what = "Đã chép mã") {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(what);
    } catch {
      toast.error("Trình duyệt không cho chép — bôi đen rồi Ctrl+C.");
    }
  }

  async function create() {
    if (!partnerName.trim()) {
      toast.error("Nhập tên đối tác đã.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_name: partnerName.trim(),
          contact: contact.trim() || undefined,
          product,
          plan,
          domains: splitList(domains),
          features: splitList(features),
          max_activations: maxActivations,
          expires_at: dateToExpiry(expiresOn),
          note: note.trim() || undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        license?: { key: string; partner_name: string };
        error?: string;
      };
      if (!res.ok || !json.license) {
        toast.error(json.error ?? "Không cấp được mã.");
        return;
      }
      setIssued({ key: json.license.key, partner: json.license.partner_name });
      setPartnerName("");
      setContact("");
      setDomains("");
      setFeatures("");
      setNote("");
      setExpiresOn("");
      setMaxActivations(1);
      setOpenForm(false);
      await refresh();
    } catch {
      toast.error("Lỗi mạng.");
    } finally {
      setCreating(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>, okMsg: string) {
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/licenses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(json.error ?? "Không cập nhật được.");
        return;
      }
      toast.success(okMsg);
      await refresh();
      if (detail?.license.id === id) await openDetail(id, detail.license.revealed);
    } catch {
      toast.error("Lỗi mạng.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string, partner: string) {
    if (!window.confirm(`Xoá hẳn giấy phép của "${partner}"? Nhật ký đi kèm mất luôn.`)) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/licenses?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(json.error ?? "Không xoá được.");
        return;
      }
      toast.success("Đã xoá giấy phép.");
      setDetail(null);
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function openDetail(id: string, reveal = false) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/licenses?id=${id}${reveal ? "&reveal=1" : ""}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((json as { error?: string }).error ?? "Không mở được.");
        return;
      }
      setDetail(json as Detail);
    } finally {
      setBusyId(null);
    }
  }

  async function releaseActivation(activationId: string) {
    const res = await fetch(`/api/admin/licenses?activation=${activationId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Không gỡ được bản cài đặt.");
      return;
    }
    toast.success("Đã gỡ bản cài đặt — đối tác kích hoạt lại ở chỗ mới được.");
    if (detail) await openDetail(detail.license.id, detail.license.revealed);
    await refresh();
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <KeyRound className="size-5 text-primary" /> Giấy phép bản quyền
          </h1>
          <p className="text-xs text-muted-foreground">
            Cấp mã cho đối tác dùng sản phẩm Arex, theo dõi nơi mã đang chạy, thu hồi khi hết hợp đồng.
          </p>
        </div>
        <button type="button" onClick={() => setOpenForm((v) => !v)} className={cn(BTN, "border-primary/40 bg-primary/10")}>
          {openForm ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
          {openForm ? "Đóng" : "Cấp mã mới"}
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Tổng số", value: stats.total },
          { label: "Đang hiệu lực", value: stats.active },
          { label: "Hết hạn ≤ 30 ngày", value: stats.soon },
          { label: "Hết hạn / thu hồi", value: stats.dead },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-3">
            <p className={LABEL}>{s.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      {issued && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="size-4" /> Đã cấp mã cho {issued.partner}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Chép ngay và gửi cho đối tác. Sau khi đóng khung này, muốn xem lại mã đầy đủ phải là super_admin
            và thao tác đó được ghi vào nhật ký quản trị.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm tracking-wider">
              {issued.key}
            </code>
            <button type="button" onClick={() => copy(issued.key)} className={BTN}>
              <Copy className="size-3.5" /> Chép
            </button>
            <button type="button" onClick={() => setIssued(null)} className={BTN}>
              <Check className="size-3.5" /> Đã lưu, đóng
            </button>
          </div>
        </div>
      )}

      {openForm && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className={LABEL}>Đối tác *</p>
              <input className={INPUT} value={partnerName} onChange={(e) => setPartnerName(e.target.value)} placeholder="Tên đội / công ty" />
            </div>
            <div>
              <p className={LABEL}>Liên hệ</p>
              <input className={INPUT} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email / Zalo / Telegram" />
            </div>
            <div>
              <p className={LABEL}>Sản phẩm</p>
              <select className={INPUT} value={product} onChange={(e) => setProduct(e.target.value as LicenseProduct)}>
                {LICENSE_PRODUCTS.map((p) => (
                  <option key={p} value={p}>{LICENSE_PRODUCT_LABEL[p]}</option>
                ))}
              </select>
            </div>
            <div>
              <p className={LABEL}>Gói</p>
              <select className={INPUT} value={plan} onChange={(e) => setPlan(e.target.value as LicensePlan)}>
                {LICENSE_PLANS.map((p) => (
                  <option key={p} value={p}>{LICENSE_PLAN_LABEL[p]}</option>
                ))}
              </select>
            </div>
            <div>
              <p className={LABEL}>Số bản cài đặt</p>
              <input
                type="number"
                min={1}
                className={INPUT}
                value={maxActivations}
                onChange={(e) => setMaxActivations(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
            <div>
              <p className={LABEL}>Hết hạn (trống = vĩnh viễn)</p>
              <input type="date" className={INPUT} value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <p className={LABEL}>Tên miền cho phép</p>
              <textarea
                className={cn(INPUT, "h-16 py-1.5")}
                value={domains}
                onChange={(e) => setDomains(e.target.value)}
                placeholder="doi-tac.vn, app.doi-tac.vn — trống = không giới hạn"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <p className={LABEL}>Tính năng mở</p>
              <textarea
                className={cn(INPUT, "h-16 py-1.5")}
                value={features}
                onChange={(e) => setFeatures(e.target.value)}
                placeholder="shop, tms, wiki"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <p className={LABEL}>Ghi chú</p>
              <textarea className={cn(INPUT, "h-16 py-1.5")} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Khai một tên miền là mọi tên miền con của nó cũng hợp lệ — khỏi phải khai lại mỗi lần đối tác dựng thêm trang.
          </p>
          <button type="button" onClick={create} disabled={creating} className={cn(BTN, "mt-3 border-primary/40 bg-primary/10")}>
            {creating ? <Loader2 className="size-3.5 animate-spin" /> : <KeyRound className="size-3.5" />}
            {creating ? "Đang cấp…" : "Cấp mã"}
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-lg border px-3 py-1 text-xs font-medium transition",
              filter === f.key ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-muted/40 hover:bg-muted",
            )}
          >
            {f.label}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            className={cn(INPUT, "w-56 pl-8")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm đối tác / tên miền / mã"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/50 text-left">
            <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-[10px] [&>th]:font-bold [&>th]:uppercase [&>th]:tracking-widest [&>th]:text-muted-foreground">
              <th>Đối tác</th>
              <th>Mã</th>
              <th>Sản phẩm</th>
              <th>Tên miền</th>
              <th>Cài đặt</th>
              <th>Hạn</th>
              <th>Trạng thái</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shown.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  Chưa có giấy phép nào khớp bộ lọc.
                </td>
              </tr>
            )}
            {shown.map((item) => (
              <tr key={item.id} className="[&>td]:px-3 [&>td]:py-2.5">
                <td>
                  <p className="font-medium">{item.partner_name}</p>
                  {item.contact && <p className="text-[11px] text-muted-foreground">{item.contact}</p>}
                </td>
                <td className="font-mono text-[11px] tracking-wider">{item.key_masked}</td>
                <td className="text-xs">
                  {LICENSE_PRODUCT_LABEL[item.product]}
                  <span className="text-muted-foreground"> · {LICENSE_PLAN_LABEL[item.plan]}</span>
                </td>
                <td className="max-w-[180px] truncate text-xs text-muted-foreground">
                  {item.domains.length ? item.domains.join(", ") : "Không giới hạn"}
                </td>
                <td className="text-xs tabular-nums">
                  {item.activation_count}/{item.max_activations}
                </td>
                <td className="text-xs">
                  {item.expires_at ? (
                    <>
                      {vnDateTime(item.expires_at).slice(0, 10)}
                      {item.days_left !== null && (
                        <span className={cn("ml-1", item.days_left <= 30 && "font-semibold text-amber-600 dark:text-amber-400")}>
                          ({item.days_left > 0 ? `còn ${item.days_left}n` : "quá hạn"})
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Vĩnh viễn</span>
                  )}
                </td>
                <td><StatusBadge status={item.effective_status} /></td>
                <td>
                  <div className="flex items-center justify-end gap-1">
                    <button type="button" onClick={() => openDetail(item.id)} className={cn(BTN, "px-2 py-1")} title="Chi tiết">
                      {busyId === item.id ? <Loader2 className="size-3.5 animate-spin" /> : <ScrollText className="size-3.5" />}
                    </button>
                    {item.status === "active" ? (
                      <button
                        type="button"
                        onClick={() => patch(item.id, { status: "suspended" }, "Đã tạm khoá.")}
                        className={cn(BTN, "px-2 py-1")}
                        title="Tạm khoá"
                      >
                        <Ban className="size-3.5" />
                      </button>
                    ) : (
                      item.status !== "revoked" && (
                        <button
                          type="button"
                          onClick={() => patch(item.id, { status: "active" }, "Đã mở lại.")}
                          className={cn(BTN, "px-2 py-1")}
                          title="Mở lại"
                        >
                          <RotateCcw className="size-3.5" />
                        </button>
                      )
                    )}
                    {item.status !== "revoked" && (
                      <button
                        type="button"
                        onClick={() => patch(item.id, { status: "revoked" }, "Đã thu hồi.")}
                        className={cn(BTN, "px-2 py-1 text-rose-600 dark:text-rose-400")}
                        title="Thu hồi"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => remove(item.id, item.partner_name)}
                        className={cn(BTN, "px-2 py-1 text-rose-600 dark:text-rose-400")}
                        title="Xoá hẳn"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && (
        <DetailDrawer
          detail={detail}
          canReveal={canReveal}
          onClose={() => setDetail(null)}
          onReveal={() => openDetail(detail.license.id, true)}
          onCopy={copy}
          onRelease={releaseActivation}
          onPatch={(body, msg) => patch(detail.license.id, body, msg)}
        />
      )}
    </div>
  );
}

function DetailDrawer({
  detail,
  canReveal,
  onClose,
  onReveal,
  onCopy,
  onRelease,
  onPatch,
}: {
  detail: Detail;
  canReveal: boolean;
  onClose: () => void;
  onReveal: () => void;
  onCopy: (text: string, what?: string) => void;
  onRelease: (activationId: string) => void;
  onPatch: (body: Record<string, unknown>, msg: string) => void;
}) {
  const { license, activations, events } = detail;
  const [expiresOn, setExpiresOn] = useState(expiryToDate(license.expires_at));
  const [domains, setDomains] = useState(license.domains.join(", "));
  const [maxActivations, setMaxActivations] = useState(license.max_activations);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="h-full w-full max-w-xl overflow-y-auto border-l border-border bg-background p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">{license.partner_name}</h2>
            <p className="text-xs text-muted-foreground">
              {LICENSE_PRODUCT_LABEL[license.product]} · {LICENSE_PLAN_LABEL[license.plan]} · cấp{" "}
              {vnDateTime(license.issued_at)}
            </p>
          </div>
          <button type="button" onClick={onClose} className={cn(BTN, "px-2 py-1")}>
            <X className="size-3.5" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <code className="rounded-lg border border-border bg-muted/50 px-3 py-2 font-mono text-sm tracking-wider">
            {license.key}
          </code>
          {license.revealed ? (
            <button type="button" onClick={() => onCopy(license.key)} className={BTN}>
              <Copy className="size-3.5" /> Chép
            </button>
          ) : (
            canReveal && (
              <button type="button" onClick={onReveal} className={BTN} title="Ghi vào nhật ký quản trị">
                <Eye className="size-3.5" /> Hiện mã đầy đủ
              </button>
            )
          )}
          <StatusBadge status={license.effective_status} />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div>
            <p className={LABEL}>Hết hạn</p>
            <input type="date" className={INPUT} value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
          </div>
          <div>
            <p className={LABEL}>Số bản cài đặt</p>
            <input
              type="number"
              min={1}
              className={INPUT}
              value={maxActivations}
              onChange={(e) => setMaxActivations(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
          <div className="sm:col-span-3">
            <p className={LABEL}>Tên miền cho phép</p>
            <input className={INPUT} value={domains} onChange={(e) => setDomains(e.target.value)} placeholder="Trống = không giới hạn" />
          </div>
        </div>
        <button
          type="button"
          className={cn(BTN, "mt-3")}
          onClick={() =>
            onPatch(
              {
                expires_at: dateToExpiry(expiresOn),
                domains: splitList(domains),
                max_activations: maxActivations,
              },
              "Đã lưu thay đổi.",
            )
          }
        >
          <CalendarClock className="size-3.5" /> Lưu thay đổi
        </button>

        <section className="mt-6">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <Unplug className="size-4" /> Đang chạy ở {activations.length}/{license.max_activations} chỗ
          </h3>
          {activations.length === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">Chưa máy nào kích hoạt mã này.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {activations.map((a) => (
                <li key={a.id} className="rounded-lg border border-border p-2.5 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{a.domain ?? "(không khai tên miền)"}</p>
                      <p className="truncate font-mono text-[10px] text-muted-foreground">{a.instance_id}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {a.ip ?? "—"} · {a.app_version ?? "—"} · lần cuối {vnDateTime(a.last_seen_at)} · {a.verify_count} lượt
                      </p>
                    </div>
                    <button type="button" onClick={() => onRelease(a.id)} className={cn(BTN, "shrink-0 px-2 py-1")} title="Gỡ chỗ này">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-6">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <ScrollText className="size-4" /> Nhật ký
          </h3>
          <ul className="mt-2 space-y-1.5">
            {events.length === 0 && <li className="text-xs text-muted-foreground">Chưa có gì.</li>}
            {events.map((ev) => {
              const denied = ev.event.startsWith("verify_denied:");
              const reason = denied ? ev.event.slice("verify_denied:".length) : "";
              return (
                <li key={ev.id} className="flex items-baseline gap-2 text-xs">
                  <span className="w-32 shrink-0 text-[11px] text-muted-foreground">{vnDateTime(ev.created_at)}</span>
                  <span className={cn("font-medium", denied && "text-amber-600 dark:text-amber-400")}>
                    {denied ? (LICENSE_DENY_REASON_LABEL[reason] ?? reason) : ev.event}
                  </span>
                  {ev.detail && <span className="truncate text-muted-foreground">— {ev.detail}</span>}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
