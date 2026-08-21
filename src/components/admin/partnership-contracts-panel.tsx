"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Building2, Copy, ExternalLink, FileSignature, Loader2, Save, ScrollText,
  ShieldCheck, X, XCircle, Ban, ChevronDown,
} from "lucide-react";
import { TIER_LABEL } from "@/lib/constants/partners";
import {
  CONTRACT_EVENT_LABEL, CONTRACT_STATUSES, CONTRACT_STATUS_LABEL, CONTRACT_STATUS_TONE,
  KIND_LABEL, PARTY_TYPE_LABEL, partyBName, vnDateTime,
  type ContractEventKind, type ContractKind, type ContractRecord, type ContractStatus, type PartyA,
} from "@/lib/constants/partnership-contract";
import { SignedContractView, type RenderedContractProps } from "@/components/partnership/signed-contract";
import { SignaturePad } from "@/components/partnership/signature-pad";
import { cn } from "@/lib/utils";

const INPUT =
  "h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60";
const LABEL = "text-[10px] font-bold uppercase tracking-widest text-muted-foreground";

type EventRow = {
  id: string;
  event: string;
  actor: string | null;
  detail: string | null;
  ip: string | null;
  created_at: string;
};

type Detail = {
  item: ContractRecord;
  rendered: RenderedContractProps;
  events: EventRow[];
  partnerUrl: string;
};

const FILTERS: Array<{ key: ContractStatus | "all"; label: string }> = [
  { key: "all", label: "Tất cả" },
  ...CONTRACT_STATUSES.map((s) => ({ key: s, label: CONTRACT_STATUS_LABEL[s] })),
];

export function PartnershipContractsPanel({
  initialItems,
  initialPartyA,
  canEdit,
}: {
  initialItems: ContractRecord[];
  initialPartyA: PartyA;
  canEdit: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<ContractStatus | "all">("all");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Ký thay Bên A
  const [signature, setSignature] = useState("");
  const [signerName, setSignerName] = useState(initialPartyA.repName);
  const [signerTitle, setSignerTitle] = useState(initialPartyA.repTitle);
  const [reason, setReason] = useState("");

  // Bên A
  const [partyA, setPartyA] = useState(initialPartyA);
  const [savingA, setSavingA] = useState(false);
  const [openPartyA, setOpenPartyA] = useState(false);

  const shown = filter === "all" ? items : items.filter((i) => i.status === filter);
  const pendingCount = items.filter((i) => i.status === "pending").length;

  async function open(id: string) {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/admin/partnership-contracts/${id}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Không mở được hợp đồng.");
        return;
      }
      setDetail(json as Detail);
      setSignature("");
      setReason("");
    } catch {
      toast.error("Lỗi mạng.");
    } finally {
      setLoadingId(null);
    }
  }

  async function act(action: "sign" | "reject" | "terminate") {
    if (!detail) return;
    if (action === "sign" && (!signature || !signerName.trim())) {
      toast.error("Cần chữ ký và họ tên người đại diện Bên A.");
      return;
    }
    if (action !== "sign" && !reason.trim()) {
      toast.error("Phải ghi lý do.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/partnership-contracts/${detail.item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          signature: action === "sign" ? signature : undefined,
          signer_name: action === "sign" ? signerName.trim() : undefined,
          signer_title: action === "sign" ? signerTitle.trim() : undefined,
          reason: action === "sign" ? undefined : reason.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Thao tác thất bại.");
        return;
      }
      const updated = json.item as ContractRecord;
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      toast.success(
        action === "sign" ? "Đã ký. Email thông báo đang gửi cho đối tác." : "Đã cập nhật và báo cho đối tác.",
      );
      await open(updated.id);
    } catch {
      toast.error("Lỗi mạng.");
    } finally {
      setBusy(false);
    }
  }

  async function savePartyA() {
    setSavingA(true);
    try {
      const res = await fetch("/api/admin/partnership-contracts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partyA }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Lưu thất bại.");
        return;
      }
      setPartyA(json.partyA as PartyA);
      toast.success("Đã lưu thông tin Bên A. Hợp đồng ký từ giờ dùng bản này.");
    } catch {
      toast.error("Lỗi mạng.");
    } finally {
      setSavingA(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-amber-400/10 dark:text-amber-400">
            <FileSignature className="size-5" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-black uppercase tracking-tight text-foreground">
              Hợp Đồng Điện Tử
            </h1>
            <p className="text-xs text-muted-foreground">
              {pendingCount > 0 ? `${pendingCount} hợp đồng đang chờ Arex ký.` : "Không có hợp đồng nào đang chờ ký."}{" "}
              {canEdit ? "Chỉ super admin mới ký được thay Bên A." : "Bạn chỉ có quyền xem."}
            </p>
          </div>
        </div>
        <Link
          href="/partnership/hop-dong"
          target="_blank"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          <ExternalLink className="size-3.5" /> Xem biểu mẫu
        </Link>
      </div>

      {/* ── Thông tin Bên A ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card">
        <button
          type="button"
          onClick={() => setOpenPartyA((v) => !v)}
          className="flex w-full items-center gap-2 p-4 text-left"
        >
          <Building2 className="size-4 text-muted-foreground" />
          <span className="flex-1 text-sm font-bold text-foreground">
            Thông tin Bên A trong hợp đồng
            {!partyA.repName && (
              <span className="ml-2 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-black uppercase text-rose-500">
                Thiếu người đại diện
              </span>
            )}
          </span>
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", openPartyA && "rotate-180")} />
        </button>

        {openPartyA && (
          <div className="space-y-3 border-t border-border p-4">
            <p className="text-xs text-muted-foreground">
              Đây là phần “BÊN A” in trên mọi hợp đồng ký từ giờ trở đi. Hợp đồng đã ký giữ bản chụp riêng nên không bị
              ảnh hưởng khi bạn sửa ở đây.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["name", "Tên đội ngũ"],
                  ["legalForm", "Tư cách"],
                  ["address", "Khu vực hoạt động"],
                  ["phone", "Điện thoại"],
                  ["email", "Email"],
                  ["website", "Website"],
                  ["repName", "Người đại diện *"],
                  ["repTitle", "Vai trò"],
                ] as Array<[keyof PartyA, string]>
              ).map(([key, label]) => (
                <label key={key} className="space-y-1">
                  <span className={LABEL}>{label}</span>
                  <input
                    value={(partyA[key] as string) ?? ""}
                    disabled={!canEdit}
                    onChange={(e) => setPartyA((p) => ({ ...p, [key]: e.target.value }))}
                    className={INPUT}
                  />
                </label>
              ))}
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={savePartyA}
                disabled={savingA}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {savingA ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Lưu Bên A
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Bộ lọc ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const count = f.key === "all" ? items.length : items.filter((i) => i.status === f.key).length;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors",
                filter === f.key
                  ? "border-primary/50 bg-primary/[0.08] text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label} <span className="opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* ── Danh sách ───────────────────────────────────────────────────── */}
      <div className="space-y-2">
        {shown.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => open(c.id)}
            className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50"
          >
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider",
                CONTRACT_STATUS_TONE[c.status],
              )}
            >
              {CONTRACT_STATUS_LABEL[c.status]}
            </span>
            <span className="font-mono text-xs text-muted-foreground">{c.code}</span>
            <span className="text-sm font-bold text-foreground">{partyBName(c)}</span>
            <span className="text-xs text-muted-foreground">
              {KIND_LABEL[c.kind as ContractKind] ?? c.kind} · {PARTY_TYPE_LABEL[c.party_type]}
              {c.kind === "team" && c.tier ? ` · ${TIER_LABEL[c.tier]}` : ""}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              {c.term_start} → {c.term_end}
            </span>
            {loadingId === c.id && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          </button>
        ))}
        {shown.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <ScrollText className="mx-auto mb-2 size-6 opacity-40" /> Chưa có hợp đồng nào ở nhóm này.
          </div>
        )}
      </div>

      {/* ── Chi tiết ────────────────────────────────────────────────────── */}
      {detail && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-background/95 backdrop-blur-sm">
          <div className="container-main my-6 max-w-4xl space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-heading text-lg font-black uppercase tracking-tight text-foreground">
                {detail.item.code}
              </h2>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Liên hệ Bên B — không nằm trong thân hợp đồng nên để riêng cho dễ gọi */}
            <div className="grid gap-2 rounded-2xl border border-border bg-card p-4 text-xs sm:grid-cols-4">
              <p>
                <span className={LABEL}>Kênh liên lạc</span>
                <br />
                <span className="break-all font-mono text-foreground">{detail.item.contact_link || "—"}</span>
              </p>
              <p>
                <span className={LABEL}>Điện thoại</span>
                <br />
                <span className="font-mono text-foreground">{detail.item.phone || "—"}</span>
              </p>
              <p>
                <span className={LABEL}>Email</span>
                <br />
                <span className="break-all font-mono text-foreground">{detail.item.email}</span>
              </p>
              <p className="sm:col-span-1">
                <span className={LABEL}>Link của đối tác</span>
                <br />
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(detail.partnerUrl);
                    toast.success("Đã sao chép link gửi đối tác.");
                  }}
                  className="inline-flex items-center gap-1 text-primary hover:underline dark:text-amber-400"
                >
                  <Copy className="size-3" /> Sao chép
                </button>
              </p>
            </div>

            <SignedContractView row={detail.item} rendered={detail.rendered} />

            {/* Thao tác */}
            {canEdit && detail.item.status === "pending" && (
              <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
                <p className="text-sm font-bold text-foreground">Ký thay Bên A</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className={LABEL}>Họ tên người ký *</span>
                    <input value={signerName} onChange={(e) => setSignerName(e.target.value)} className={INPUT} />
                  </label>
                  <label className="space-y-1">
                    <span className={LABEL}>Chức vụ</span>
                    <input value={signerTitle} onChange={(e) => setSignerTitle(e.target.value)} className={INPUT} />
                  </label>
                </div>
                <SignaturePad value={signature} onChange={setSignature} label="Chữ ký người đại diện Arex" />
                <button
                  type="button"
                  onClick={() => act("sign")}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />} Ký & kích
                  hoạt hợp đồng
                </button>

                <div className="border-t border-border pt-3">
                  <label className="space-y-1">
                    <span className={LABEL}>Lý do từ chối</span>
                    <input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Ví dụ: nội dung thuộc nhóm Arex không nhận, hoặc không đồng ý điều khoản riêng Bên B thêm."
                      className={INPUT}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => act("reject")}
                    disabled={busy}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 px-4 py-2 text-sm font-bold text-rose-500 hover:bg-rose-500/10 disabled:opacity-60"
                  >
                    <XCircle className="size-4" /> Từ chối
                  </button>
                </div>
              </div>
            )}

            {canEdit && detail.item.status === "signed" && (
              <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
                <p className="text-sm font-bold text-foreground">Chấm dứt hợp đồng</p>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Lý do chấm dứt — sẽ gửi cho đối tác qua email."
                  className={INPUT}
                />
                <button
                  type="button"
                  onClick={() => act("terminate")}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 px-4 py-2 text-sm font-bold text-rose-500 hover:bg-rose-500/10 disabled:opacity-60"
                >
                  <Ban className="size-4" /> Chấm dứt
                </button>
              </div>
            )}

            {/* Nhật ký */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className={LABEL}>Nhật ký ký kết</p>
              <ul className="mt-2 space-y-1.5">
                {detail.events.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{CONTRACT_EVENT_LABEL[e.event as ContractEventKind] ?? e.event}</span>
                    {e.actor && <span>· {e.actor}</span>}
                    {e.detail && <span className="opacity-80">· {e.detail}</span>}
                    {e.ip && <span className="font-mono opacity-60">· {e.ip}</span>}
                    <span className="ml-auto opacity-60">{vnDateTime(e.created_at)}</span>
                  </li>
                ))}
                {detail.events.length === 0 && <li className="text-xs text-muted-foreground">Chưa có bản ghi nào.</li>}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
