"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { History, Loader2, ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { Field, LinkListEditor, apiCall, inputCls } from "@/components/craftland/studio-forms";
import { MAP_STATUS_META, REPORT_REASONS, VERIFICATION_META, craftlandCreatorHref, craftlandMapHref } from "@/lib/constants/craftland";
import type {
  CraftlandAcademyArticle, CraftlandCategory, CraftlandLink, CraftlandMapStatus, CraftlandVerificationStatus,
} from "@/lib/types/craftland";
import { cn } from "@/lib/utils";

const dt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" });
const CONFIRM_WORD = "XAC NHAN";

// ── Hộp thoại lý do / xác nhận lại ───────────────────────────

type PendingAction = {
  title: string;
  description?: string;
  needReason: boolean;
  /** Thao tác nhạy cảm: bắt gõ lại từ xác nhận. */
  sensitive?: boolean;
  confirmLabel: string;
  destructive?: boolean;
  run: (reason: string) => Promise<void>;
};

function ActionDialog({ action, onClose }: { action: PendingAction | null; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const ok = (!action?.needReason || reason.trim().length >= 5) && (!action?.sensitive || confirm.trim().toUpperCase() === CONFIRM_WORD);

  const close = () => {
    setReason("");
    setConfirm("");
    onClose();
  };

  return (
    <Dialog open={!!action} onOpenChange={(o) => !o && !busy && close()}>
      <DialogContent>
        {action && (
          <>
            <DialogHeader>
              <DialogTitle>{action.title}</DialogTitle>
              {action.description && <DialogDescription>{action.description}</DialogDescription>}
            </DialogHeader>
            <div className="space-y-3">
              <Field label={action.needReason ? "Lý do (bắt buộc, ghi vào nhật ký)" : "Ghi chú (không bắt buộc)"}>
                <textarea className={inputCls} rows={3} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
              </Field>
              {action.sensitive && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm">
                  <p className="flex items-center gap-1.5 font-semibold text-red-700 dark:text-red-300">
                    <ShieldAlert className="size-4" aria-hidden /> Thao tác nhạy cảm
                  </p>
                  <p className="mt-1 text-muted-foreground">Gõ <strong>{CONFIRM_WORD}</strong> để tiếp tục. Tài khoản đã bật MFA cần phiên đăng nhập đã nhập mã xác thực.</p>
                  <input className={cn(inputCls, "mt-2")} value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-label="Từ xác nhận" />
                </div>
              )}
            </div>
            <DialogFooter>
              <button type="button" onClick={close} disabled={busy} className="h-10 rounded-lg px-4 text-sm text-muted-foreground hover:text-foreground">Huỷ</button>
              <button
                type="button"
                disabled={!ok || busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await action.run(reason.trim());
                    close();
                  } catch (e) {
                    toast.error((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-50",
                  action.destructive ? "bg-destructive" : "bg-primary",
                )}
              >
                {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
                {action.confirmLabel}
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Lịch sử thao tác ─────────────────────────────────────────

type AuditEntry = { id: number; actor_email: string | null; action: string; reason: string | null; outcome: string; created_at: string };

export function AuditButton({ targetType, targetId }: { targetType: string; targetId: string }) {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          setOpen(true);
          setEntries(null);
          try {
            const d = await apiCall<{ entries: AuditEntry[] }>(`/api/admin/craftland/audit?target_type=${targetType}&target_id=${targetId}`, "GET");
            setEntries(d.entries);
          } catch (e) {
            toast.error((e as Error).message);
            setEntries([]);
          }
        }}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        aria-label="Xem lịch sử thao tác"
      >
        <History className="size-3.5" aria-hidden /> Lịch sử
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lịch sử thao tác</DialogTitle>
            <DialogDescription>Nhật ký append-only — không ai sửa hoặc xoá được.</DialogDescription>
          </DialogHeader>
          {!entries ? (
            <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" aria-label="Đang tải" />
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có thao tác nào.</p>
          ) : (
            <ol className="space-y-3 text-sm">
              {entries.map((e) => (
                <li key={e.id} className="border-l-2 border-border pl-3">
                  <div className="font-medium">
                    {e.action}
                    {e.outcome === "failure" && <span className="ml-2 text-xs text-destructive">thất bại</span>}
                  </div>
                  {e.reason && <div className="text-muted-foreground">{e.reason}</div>}
                  <div className="text-xs text-muted-foreground">{e.actor_email ?? "creator"} · {dt.format(new Date(e.created_at))}</div>
                </li>
              ))}
            </ol>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Bảng bản đồ ──────────────────────────────────────────────

export type AdminMapRow = {
  id: string; slug: string; title: string; status: CraftlandMapStatus; map_code: string | null; category_slug: string;
  platforms: string[]; platforms_verified: boolean; is_featured: boolean; is_editor_pick: boolean; report_count: number;
  view_count: number; submitted_at: string | null; updated_at: string; moderation_note: string | null;
  creator: { username: string; display_name: string } | null;
};

type MapActionKey =
  | "approve" | "reject" | "hide" | "restore" | "remove" | "unremove"
  | "verify_platforms" | "unverify_platforms" | "feature" | "unfeature" | "pick" | "unpick";

const MAP_ACTION_UI: Record<MapActionKey, { label: string; needReason: boolean; sensitive?: boolean; destructive?: boolean; when: (m: AdminMapRow) => boolean; content?: boolean }> = {
  approve:            { label: "Duyệt", needReason: false, when: (m) => m.status === "pending" },
  reject:             { label: "Từ chối", needReason: true, destructive: true, when: (m) => m.status === "pending" },
  hide:               { label: "Ẩn", needReason: true, when: (m) => m.status === "published" },
  restore:            { label: "Khôi phục", needReason: true, when: (m) => m.status === "hidden" },
  remove:             { label: "Gỡ bản đồ", needReason: true, sensitive: true, destructive: true, when: (m) => m.status !== "removed" },
  unremove:           { label: "Huỷ gỡ", needReason: true, sensitive: true, when: (m) => m.status === "removed" },
  verify_platforms:   { label: "Xác nhận nền tảng", needReason: false, when: (m) => m.platforms.length > 0 && !m.platforms_verified },
  unverify_platforms: { label: "Bỏ xác nhận nền tảng", needReason: false, when: (m) => m.platforms_verified },
  feature:            { label: "Ghim nổi bật", needReason: false, content: true, when: (m) => m.status === "published" && !m.is_featured },
  unfeature:          { label: "Bỏ ghim", needReason: false, content: true, when: (m) => m.is_featured },
  pick:               { label: "Đề xuất", needReason: false, content: true, when: (m) => m.status === "published" && !m.is_editor_pick },
  unpick:             { label: "Bỏ đề xuất", needReason: false, content: true, when: (m) => m.is_editor_pick },
};

const BULK: Array<"approve" | "reject" | "hide" | "restore" | "verify_platforms"> = ["approve", "reject", "hide", "restore", "verify_platforms"];

export function AdminMapsTable({ maps, canContent }: { maps: AdminMapRow[]; canContent: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<PendingAction | null>(null);

  const runSingle = (m: AdminMapRow, key: MapActionKey) => {
    const ui = MAP_ACTION_UI[key];
    setPending({
      title: `${ui.label}: ${m.title}`,
      needReason: ui.needReason,
      sensitive: ui.sensitive,
      destructive: ui.destructive,
      confirmLabel: ui.label,
      description: key === "reject" || key === "hide" || key === "remove" ? "Creator sẽ thấy lý do này trong Creator Studio." : undefined,
      run: async (reason) => {
        await apiCall(`/api/admin/craftland/maps/${m.id}`, "PATCH", { action: key, reason: reason || undefined });
        toast.success(`${ui.label}: thành công`);
        router.refresh();
      },
    });
  };

  const runBulk = (key: (typeof BULK)[number]) => {
    const ui = MAP_ACTION_UI[key];
    const ids = Array.from(selected);
    setPending({
      title: `${ui.label} ${ids.length} bản đồ`,
      needReason: ui.needReason,
      destructive: ui.destructive,
      confirmLabel: `${ui.label} (${ids.length})`,
      run: async (reason) => {
        const r = await apiCall<{ succeeded: number; failed: Array<{ id: string; error: string }> }>("/api/admin/craftland/maps/bulk", "POST", { ids, action: key, reason: reason || undefined });
        if (r.failed.length) toast.warning(`Thành công ${r.succeeded}, thất bại ${r.failed.length}: ${r.failed[0].error}`);
        else toast.success(`Đã ${ui.label.toLowerCase()} ${r.succeeded} bản đồ`);
        setSelected(new Set());
        router.refresh();
      },
    });
  };

  const allChecked = maps.length > 0 && maps.every((m) => selected.has(m.id));

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-primary/40 bg-card p-2.5 shadow-sm">
          <span className="px-1 text-sm font-semibold">Đã chọn {selected.size}</span>
          {BULK.map((k) => (
            <button key={k} type="button" onClick={() => runBulk(k)} className="h-8 rounded-lg border border-border px-3 text-xs font-semibold hover:border-primary/40">
              {MAP_ACTION_UI[k].label}
            </button>
          ))}
          <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Bỏ chọn</button>
        </div>
      )}

      {maps.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">Không có bản đồ nào khớp bộ lọc.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="w-10 px-3 py-2">
                  <input type="checkbox" aria-label="Chọn tất cả" checked={allChecked}
                    onChange={(e) => setSelected(e.target.checked ? new Set(maps.map((m) => m.id)) : new Set())} />
                </th>
                <th className="px-3 py-2 font-medium">Bản đồ</th>
                <th className="px-3 py-2 font-medium">Creator</th>
                <th className="px-3 py-2 font-medium">Trạng thái</th>
                <th className="px-3 py-2 text-right font-medium">Báo cáo</th>
                <th className="px-3 py-2 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {maps.map((m) => (
                <tr key={m.id} className="border-b border-border align-top last:border-0">
                  <td className="px-3 py-3">
                    <input type="checkbox" aria-label={`Chọn ${m.title}`} checked={selected.has(m.id)}
                      onChange={(e) => {
                        const next = new Set(selected);
                        if (e.target.checked) next.add(m.id);
                        else next.delete(m.id);
                        setSelected(next);
                      }} />
                  </td>
                  <td className="max-w-xs px-3 py-3">
                    <div className="font-medium">
                      {m.status === "published" ? <Link href={craftlandMapHref(m.slug)} target="_blank" className="hover:text-primary">{m.title}</Link> : m.title}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {m.map_code ? <span className="font-mono">{m.map_code}</span> : "chưa có mã"} · {m.category_slug}
                      {m.platforms.length > 0 && ` · ${m.platforms.join(", ")}${m.platforms_verified ? " ✓" : " (chưa xác nhận)"}`}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {m.submitted_at ? `Gửi ${dt.format(new Date(m.submitted_at))}` : `Cập nhật ${dt.format(new Date(m.updated_at))}`}
                      {m.is_featured && " · Nổi bật"}{m.is_editor_pick && " · Đề xuất"}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {m.creator ? <Link href={craftlandCreatorHref(m.creator.username)} target="_blank" className="hover:text-primary">@{m.creator.username}</Link> : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-semibold", MAP_STATUS_META[m.status].tone)}>{MAP_STATUS_META[m.status].label}</span>
                    {m.moderation_note && <div className="mt-1 max-w-[180px] text-xs text-muted-foreground">{m.moderation_note}</div>}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{m.report_count}</td>
                  <td className="px-3 py-3">
                    <div className="flex max-w-xs flex-wrap gap-x-3 gap-y-1">
                      {(Object.keys(MAP_ACTION_UI) as MapActionKey[])
                        .filter((k) => MAP_ACTION_UI[k].when(m) && (!MAP_ACTION_UI[k].content || canContent))
                        .map((k) => (
                          <button key={k} type="button" onClick={() => runSingle(m, k)}
                            className={cn("text-xs font-semibold hover:underline", MAP_ACTION_UI[k].destructive ? "text-destructive" : "text-primary")}>
                            {MAP_ACTION_UI[k].label}
                          </button>
                        ))}
                      <AuditButton targetType="map" targetId={m.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ActionDialog action={pending} onClose={() => setPending(null)} />
    </div>
  );
}

// ── Báo cáo ──────────────────────────────────────────────────

export type AdminReportRow = {
  id: string; reason: string; details: string; status: "open" | "resolved" | "dismissed"; created_at: string;
  resolution_note: string | null; map: { id: string; slug: string; title: string; status: CraftlandMapStatus } | null;
};

export function AdminReportsTable({ reports }: { reports: AdminReportRow[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const reasonLabel = new Map(REPORT_REASONS.map((r) => [r.key as string, r.label]));

  const act = (r: AdminReportRow, action: "resolve" | "dismiss" | "reopen") =>
    setPending({
      title: action === "resolve" ? "Đánh dấu đã xử lý" : action === "dismiss" ? "Bác bỏ báo cáo" : "Mở lại báo cáo",
      description: action === "resolve" ? "Nếu cần ẩn/gỡ bản đồ, thao tác ở tab Bản đồ — việc đó được ghi nhật ký riêng." : undefined,
      needReason: true,
      confirmLabel: "Lưu",
      run: async (note) => {
        await apiCall(`/api/admin/craftland/reports/${r.id}`, "PATCH", { action, note });
        toast.success("Đã cập nhật báo cáo");
        router.refresh();
      },
    });

  if (reports.length === 0) {
    return <p className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">Không có báo cáo nào.</p>;
  }
  return (
    <>
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {reports.map((r) => (
          <li key={r.id} className="flex flex-col gap-2 p-4 md:flex-row md:items-start">
            <div className="min-w-0 flex-1 space-y-1 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{reasonLabel.get(r.reason) ?? r.reason}</span>
                <span className="text-xs text-muted-foreground">{dt.format(new Date(r.created_at))}</span>
                {r.status !== "open" && <span className="rounded bg-muted px-1.5 py-0.5 text-[11px]">{r.status === "resolved" ? "Đã xử lý" : "Đã bác bỏ"}</span>}
              </div>
              {r.map && (
                <div>
                  Bản đồ:{" "}
                  {r.map.status === "published" ? <Link href={craftlandMapHref(r.map.slug)} target="_blank" className="text-primary hover:underline">{r.map.title}</Link> : r.map.title}
                  <span className="ml-1 text-xs text-muted-foreground">({MAP_STATUS_META[r.map.status].label})</span>
                </div>
              )}
              {r.details && <p className="whitespace-pre-line text-muted-foreground">{r.details}</p>}
              {r.resolution_note && <p className="text-xs text-muted-foreground">Ghi chú xử lý: {r.resolution_note}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {r.status === "open" ? (
                <>
                  <button type="button" onClick={() => act(r, "resolve")} className="text-xs font-semibold text-primary hover:underline">Đã xử lý</button>
                  <button type="button" onClick={() => act(r, "dismiss")} className="text-xs font-semibold text-muted-foreground hover:underline">Bác bỏ</button>
                </>
              ) : (
                <button type="button" onClick={() => act(r, "reopen")} className="text-xs font-semibold text-muted-foreground hover:underline">Mở lại</button>
              )}
              <AuditButton targetType="report" targetId={r.id} />
            </div>
          </li>
        ))}
      </ul>
      <ActionDialog action={pending} onClose={() => setPending(null)} />
    </>
  );
}

// ── Creator ──────────────────────────────────────────────────

export type AdminCreatorRow = {
  user_id: string; username: string; display_name: string; status: "active" | "suspended"; can_publish: boolean;
  verification_status: CraftlandVerificationStatus; created_at: string; map_count: number; suspended_reason: string | null;
};

export function AdminCreatorsTable({ creators, canManage, canDecide }: { creators: AdminCreatorRow[]; canManage: boolean; canDecide: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingAction | null>(null);

  const act = (c: AdminCreatorRow, action: string, label: string, sensitive: boolean, destructive = false) =>
    setPending({
      title: `${label}: @${c.username}`,
      needReason: true,
      sensitive,
      destructive,
      confirmLabel: label,
      description: action === "suspend" ? "Các bản đồ đang xuất bản của creator sẽ tạm ẩn; mở khoá sẽ trả lại." : undefined,
      run: async (reason) => {
        const r = await apiCall<{ affectedMaps: number }>(`/api/admin/craftland/creators/${c.user_id}`, "PATCH", { action, reason });
        toast.success(`${label}: thành công${r.affectedMaps ? ` (${r.affectedMaps} bản đồ)` : ""}`);
        router.refresh();
      },
    });

  if (creators.length === 0) return <p className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">Không có creator nào.</p>;
  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Creator</th>
              <th className="px-3 py-2 font-medium">Xác minh</th>
              <th className="px-3 py-2 font-medium">Tài khoản</th>
              <th className="px-3 py-2 text-right font-medium">Bản đồ</th>
              <th className="px-4 py-2 font-medium">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {creators.map((c) => (
              <tr key={c.user_id} className="border-b border-border align-top last:border-0">
                <td className="px-4 py-3">
                  <Link href={craftlandCreatorHref(c.username)} target="_blank" className="font-medium hover:text-primary">{c.display_name}</Link>
                  <div className="text-xs text-muted-foreground">@{c.username} · tham gia {dt.format(new Date(c.created_at))}</div>
                </td>
                <td className="px-3 py-3"><span className={cn("rounded px-1.5 py-0.5 text-[11px] font-semibold", VERIFICATION_META[c.verification_status].tone)}>{VERIFICATION_META[c.verification_status].label}</span></td>
                <td className="px-3 py-3 text-xs">
                  {c.status === "suspended" ? <span className="font-semibold text-destructive">Bị khoá</span> : "Hoạt động"}
                  {!c.can_publish && <div className="text-amber-700 dark:text-amber-300">Bị dừng quyền đăng</div>}
                  {c.suspended_reason && <div className="text-muted-foreground">{c.suspended_reason}</div>}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{c.map_count}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {canManage && (c.can_publish
                      ? <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => act(c, "revoke_publish", "Dừng quyền đăng", false)}>Dừng quyền đăng</button>
                      : <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => act(c, "grant_publish", "Cấp lại quyền đăng", false)}>Cấp quyền đăng</button>)}
                    {canManage && (c.status === "active"
                      ? <button type="button" className="text-xs font-semibold text-destructive hover:underline" onClick={() => act(c, "suspend", "Khoá creator", true, true)}>Khoá</button>
                      : <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => act(c, "unsuspend", "Mở khoá creator", true)}>Mở khoá</button>)}
                    {canDecide && c.verification_status === "verified" && (
                      <button type="button" className="text-xs font-semibold text-destructive hover:underline" onClick={() => act(c, "revoke_verification", "Thu hồi xác minh", true, true)}>Thu hồi xác minh</button>
                    )}
                    <AuditButton targetType="creator" targetId={c.user_id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ActionDialog action={pending} onClose={() => setPending(null)} />
    </>
  );
}

// ── Hàng chờ xác minh ────────────────────────────────────────

export type AdminVerificationRow = {
  id: string; creator_id: string; display_name: string; about: string; public_links: CraftlandLink[]; evidence: string;
  status: "pending" | "needs_info"; review_notes: string | null; decision_reason: string | null; created_at: string;
  creator: { username: string; map_count: number } | null;
};

export function VerificationQueue({ requests, canDecide }: { requests: AdminVerificationRow[]; canDecide: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingAction | null>(null);

  const act = (r: AdminVerificationRow, action: "note" | "request_info" | "approve" | "reject") => {
    const labels = { note: "Thêm ghi chú nội bộ", request_info: "Yêu cầu bổ sung", approve: "Cấp huy hiệu xác minh", reject: "Từ chối xác minh" };
    setPending({
      title: `${labels[action]}: ${r.display_name}`,
      description:
        action === "note" ? "Chỉ đội ngũ thấy ghi chú này."
          : action === "approve" ? "Huy hiệu hiển thị là “Xác minh bởi ArexNetwork”, không phải xác nhận của Garena."
            : "Creator sẽ thấy nội dung này.",
      needReason: true,
      sensitive: action === "approve" || action === "reject",
      destructive: action === "reject",
      confirmLabel: labels[action],
      run: async (message) => {
        await apiCall(`/api/admin/craftland/verifications/${r.id}`, "PATCH", { action, message });
        toast.success("Đã cập nhật yêu cầu");
        router.refresh();
      },
    });
  };

  if (requests.length === 0) return <p className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">Không có yêu cầu xác minh đang mở.</p>;
  return (
    <>
      <ul className="space-y-3">
        {requests.map((r) => (
          <li key={r.id} className="space-y-3 rounded-xl border border-border bg-card p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{r.display_name}</span>
              {r.creator && <Link href={craftlandCreatorHref(r.creator.username)} target="_blank" className="text-xs text-primary hover:underline">@{r.creator.username} · {r.creator.map_count} bản đồ</Link>}
              <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-semibold", r.status === "pending" ? VERIFICATION_META.pending.tone : "bg-orange-500/12 text-orange-700 dark:text-orange-300")}>
                {r.status === "pending" ? "Chờ xét duyệt" : "Chờ creator bổ sung"}
              </span>
              <span className="text-xs text-muted-foreground">{dt.format(new Date(r.created_at))}</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div><div className="text-xs font-medium text-muted-foreground">Thông tin</div><p className="whitespace-pre-line">{r.about}</p></div>
              <div><div className="text-xs font-medium text-muted-foreground">Bằng chứng</div><p className="whitespace-pre-line">{r.evidence}</p></div>
            </div>
            <ul className="flex flex-wrap gap-2">
              {r.public_links.map((l) => (
                <li key={l.url}><a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="text-xs text-primary hover:underline">{l.label} ↗</a></li>
              ))}
            </ul>
            {r.decision_reason && r.status === "needs_info" && <p className="text-xs text-muted-foreground">Đã yêu cầu bổ sung: {r.decision_reason}</p>}
            {r.review_notes && <pre className="whitespace-pre-wrap rounded-lg bg-muted p-2 font-sans text-xs">{r.review_notes}</pre>}
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <button type="button" onClick={() => act(r, "note")} className="text-xs font-semibold text-muted-foreground hover:underline">Ghi chú kiểm tra</button>
              {r.status === "pending" && <button type="button" onClick={() => act(r, "request_info")} className="text-xs font-semibold text-primary hover:underline">Yêu cầu bổ sung</button>}
              {canDecide ? (
                <>
                  <button type="button" onClick={() => act(r, "approve")} className="text-xs font-semibold text-emerald-600 hover:underline">Phê duyệt</button>
                  <button type="button" onClick={() => act(r, "reject")} className="text-xs font-semibold text-destructive hover:underline">Từ chối</button>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">Quyết định cuối thuộc Super Admin.</span>
              )}
              <AuditButton targetType="verification" targetId={r.id} />
            </div>
          </li>
        ))}
      </ul>
      <ActionDialog action={pending} onClose={() => setPending(null)} />
    </>
  );
}

// ── Thể loại ─────────────────────────────────────────────────

export function CategoriesManager({ categories }: { categories: CraftlandCategory[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(categories);
  const [draft, setDraft] = useState({ slug: "", name: "", sort_order: 100 });
  const [busy, setBusy] = useState<string | null>(null);

  const save = async (c: Pick<CraftlandCategory, "slug" | "name" | "description" | "sort_order" | "is_active">) => {
    setBusy(c.slug);
    try {
      await apiCall("/api/admin/craftland/categories", "PUT", c);
      toast.success(`Đã lưu “${c.name}”`);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {rows.map((c, i) => (
          <li key={c.slug} className="flex flex-wrap items-center gap-2 p-3">
            <code className="w-28 shrink-0 text-xs text-muted-foreground">{c.slug}</code>
            <input className={cn(inputCls, "w-40")} value={c.name} aria-label="Tên" onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)))} />
            <input className={cn(inputCls, "w-20")} type="number" aria-label="Thứ tự" value={c.sort_order} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, sort_order: Number(e.target.value) } : r)))} />
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={c.is_active} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, is_active: e.target.checked } : r)))} /> Hiển thị
            </label>
            <button type="button" disabled={busy === c.slug} onClick={() => save(c)} className="ml-auto h-9 rounded-lg border border-border px-3 text-sm font-medium disabled:opacity-50">Lưu</button>
          </li>
        ))}
      </ul>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          save({ ...draft, description: "", is_active: true }).then(() => setDraft({ slug: "", name: "", sort_order: 100 }));
        }}
      >
        <Field label="Slug mới"><input className={cn(inputCls, "w-36")} value={draft.slug} pattern="[a-z0-9\-]{2,32}" required onChange={(e) => setDraft({ ...draft, slug: e.target.value.toLowerCase() })} /></Field>
        <Field label="Tên"><input className={cn(inputCls, "w-44")} value={draft.name} required minLength={2} maxLength={40} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
        <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Thêm thể loại</button>
      </form>
    </div>
  );
}

// ── Soạn bài Academy ─────────────────────────────────────────

export function AcademyEditor({ article, categories }: { article: CraftlandAcademyArticle | null; categories: Array<{ slug: string; name: string }> }) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: article?.title ?? "",
    slug: article?.slug ?? "",
    category_slug: article?.category_slug ?? categories[0]?.slug ?? "",
    excerpt: article?.excerpt ?? "",
    body: article?.body ?? "",
    platform: article?.platform ?? "both",
    sources: article?.sources ?? [],
    compat_warning: article?.compat_warning ?? "",
    sort_order: article?.sort_order ?? 100,
    status: article?.status ?? "draft",
  });
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (status: typeof form.status) => {
    if (status === "published" && form.sources.filter((s) => s.url).length === 0
      && !window.confirm("Bài chưa có nguồn tham khảo. Nội dung dựa trên tài liệu Garena nên dẫn link nguồn. Vẫn xuất bản?")) return;
    setBusy(true);
    try {
      const payload = { ...form, status, compat_warning: form.compat_warning.trim() || null, sources: form.sources.filter((s) => s.label.trim() && s.url.trim()) };
      if (article) await apiCall(`/api/admin/craftland/academy/${article.id}`, "PUT", payload);
      else await apiCall("/api/admin/craftland/academy", "POST", payload);
      toast.success(status === "published" ? "Đã xuất bản" : "Đã lưu");
      router.push("/admin/craftland/academy");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Tiêu đề" required><input className={inputCls} value={form.title} maxLength={160} onChange={(e) => set("title", e.target.value)} /></Field>
        <Field label="Slug" hint="Để trống để tạo tự động từ tiêu đề."><input className={inputCls} value={form.slug} onChange={(e) => set("slug", e.target.value.toLowerCase())} /></Field>
        <Field label="Danh mục" required>
          <select className={inputCls} value={form.category_slug} onChange={(e) => set("category_slug", e.target.value)}>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nền tảng">
            <select className={inputCls} value={form.platform} onChange={(e) => set("platform", e.target.value as typeof form.platform)}>
              <option value="both">PC & Mobile</option><option value="pc">PC</option><option value="mobile">Mobile</option>
            </select>
          </Field>
          <Field label="Thứ tự"><input className={inputCls} type="number" value={form.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} /></Field>
        </div>
      </div>
      <Field label="Tóm tắt"><input className={inputCls} value={form.excerpt} maxLength={300} onChange={(e) => set("excerpt", e.target.value)} /></Field>
      <div className="space-y-1.5">
        <span className="text-sm font-medium">Nội dung</span>
        <p className="text-xs text-muted-foreground">Dùng Heading 2/3 để tạo mục lục tự động; khối code sẽ có nút sao chép. Không dán nguyên văn tài liệu, mã nguồn hay hình ảnh có bản quyền của Garena — hãy viết lời giải thích và ví dụ riêng.</p>
        <RichTextEditor value={form.body} onChange={(html) => set("body", html)} />
      </div>
      <Field label="Cảnh báo tương thích / API cũ" hint="Chỉ ghi khi có căn cứ từ tài liệu chính thức.">
        <input className={inputCls} value={form.compat_warning} maxLength={500} onChange={(e) => set("compat_warning", e.target.value)} />
      </Field>
      <div className="space-y-1.5">
        <span className="text-sm font-medium">Nguồn tham khảo</span>
        <LinkListEditor value={form.sources} onChange={(v) => set("sources", v)} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => submit("draft")} className="h-10 rounded-xl border border-border px-4 text-sm font-semibold disabled:opacity-50">Lưu nháp</button>
        <button type="button" disabled={busy} onClick={() => submit("published")} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Xuất bản
        </button>
        {article && article.status !== "archived" && (
          <button type="button" disabled={busy} onClick={() => window.confirm("Lưu trữ bài viết? Bài sẽ ẩn khỏi Academy.") && submit("archived")} className="h-10 rounded-xl px-4 text-sm font-semibold text-destructive disabled:opacity-50">Lưu trữ</button>
        )}
      </div>
    </div>
  );
}
