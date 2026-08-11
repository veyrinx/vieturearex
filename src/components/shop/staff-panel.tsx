"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, LogOut, Store, UserMinus, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import {
  MAX_STAFF_PER_SHOP,
  STAFF_PERMISSION_HINT,
  STAFF_PERMISSION_LABEL,
  STAFF_STATUS_LABEL,
  timeAgo,
} from "@/lib/constants/shop";
import type { ShopStaffMembership, ShopStaffRow } from "@/lib/types/shop";
import { cn } from "@/lib/utils";

/**
 * Bàn nhân sự của gian hàng.
 *
 * Ba khối, theo đúng thứ tự việc cần làm: lời mời đang chờ mình trả lời (gấp
 * nhất), bảng CTV của shop mình (việc thường ngày), rồi những shop mình đang
 * phụ (chỉ để nhớ và để nghỉ khi cần).
 */

type Props = {
  /** Gian hàng của chính người xem — null nếu họ chưa bán, chỉ đi làm CTV. */
  shop: { id: string; display_name: string; approved: boolean } | null;
  staff: ShopStaffRow[];
  invites: ShopStaffMembership[];
  memberships: ShopStaffMembership[];
};

const card = "rounded-2xl border border-border bg-card p-4";
const chip =
  "rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-bold text-muted-foreground";

export function StaffPanel({ shop, staff, invites, memberships }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const call = async (
    key: string,
    init: RequestInit & { url?: string },
    okMessage: string,
  ): Promise<boolean> => {
    setBusy(key);
    try {
      const res = await fetch(init.url ?? "/api/shop/staff", {
        ...init,
        headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Không thực hiện được.");
        return false;
      }
      toast.success(okMessage);
      router.refresh();
      return true;
    } catch {
      toast.error("Lỗi mạng, thử lại.");
      return false;
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      {invites.length > 0 && (
        <div className={cn(card, "border-amber-500/40 bg-amber-500/5")}>
          <p className="text-xs font-black uppercase tracking-wide text-amber-600 dark:text-amber-400">
            Lời mời đang chờ bạn
          </p>
          <div className="mt-2 space-y-2">
            {invites.map((iv) => (
              <div
                key={iv.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background/60 p-2.5"
              >
                <Store className="size-4 shrink-0 text-amber-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">
                    {iv.shop?.display_name ?? "Gian hàng"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {permissionSummary(iv)} · mời {timeAgo(iv.created_at)}
                  </p>
                </div>
                <button
                  onClick={() =>
                    void call(
                      `accept-${iv.id}`,
                      { method: "PATCH", body: JSON.stringify({ id: iv.id, action: "accept" }) },
                      "Bạn đã là CTV của gian hàng này.",
                    )
                  }
                  disabled={busy !== null}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {busy === `accept-${iv.id}` ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                  Đồng ý
                </button>
                <button
                  onClick={() =>
                    void call(
                      `decline-${iv.id}`,
                      { method: "PATCH", body: JSON.stringify({ id: iv.id, action: "decline" }) },
                      "Đã từ chối lời mời.",
                    )
                  }
                  disabled={busy !== null}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground transition hover:border-red-500/40 hover:text-red-500 disabled:opacity-60"
                >
                  <X className="size-3" /> Từ chối
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {shop && <OwnerSection shop={shop} staff={staff} busy={busy} call={call} />}

      {memberships.length > 0 && (
        <div className={card}>
          <p className="text-xs font-black uppercase tracking-wide text-foreground">Shop bạn đang phụ</p>
          <div className="mt-2 space-y-2">
            {memberships.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">
                    {m.shop?.display_name ?? "Gian hàng"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{permissionSummary(m)}</p>
                </div>
                {m.can_manage_listings && (
                  <Link
                    href={`/shop/tin-cua-toi?shop=${m.seller_id}`}
                    className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                  >
                    Tin của shop
                  </Link>
                )}
                <button
                  onClick={() =>
                    void call(
                      `leave-${m.id}`,
                      { method: "PATCH", body: JSON.stringify({ id: m.id, action: "revoke" }) },
                      "Bạn đã nghỉ làm CTV cho shop này.",
                    )
                  }
                  disabled={busy !== null}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground transition hover:border-red-500/40 hover:text-red-500 disabled:opacity-60"
                >
                  {busy === `leave-${m.id}` ? <Loader2 className="size-3 animate-spin" /> : <LogOut className="size-3" />}
                  Nghỉ
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!shop && invites.length === 0 && memberships.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-14 text-center text-sm text-muted-foreground">
          Bạn chưa có gian hàng nào và cũng chưa ai mời bạn làm CTV.
        </div>
      )}
    </div>
  );
}

// ── Khối của chủ gian hàng ─────────────────────────────────────────────────
function OwnerSection({
  shop,
  staff,
  busy,
  call,
}: {
  shop: NonNullable<Props["shop"]>;
  staff: ShopStaffRow[];
  busy: string | null;
  call: (key: string, init: RequestInit & { url?: string }, ok: string) => Promise<boolean>;
}) {
  const [member, setMember] = useState("");
  const [perms, setPerms] = useState({ manage_listings: true, handle_orders: false });

  const live = staff.filter((s) => s.status === "invited" || s.status === "active");
  const full = live.length >= MAX_STAFF_PER_SHOP;

  const invite = async () => {
    if (!member.trim()) return void toast.error("Nhập @handle hoặc email của người cần mời.");
    const ok = await call(
      "invite",
      {
        method: "POST",
        body: JSON.stringify({
          sellerId: shop.id,
          member,
          canManageListings: perms.manage_listings,
          canHandleOrders: perms.handle_orders,
        }),
      },
      "Đã gửi lời mời — chờ họ đồng ý.",
    );
    if (ok) setMember("");
  };

  return (
    <div className={cn(card, "space-y-4")}>
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-foreground">
          CTV của {shop.display_name}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
          CTV làm hộ bạn phần việc bạn bật. Họ không bao giờ thấy giấy tờ, số điện thoại hay tài
          khoản ngân hàng của bạn, và cũng không mời được CTV khác. Mọi thao tác vẫn ghi tên người
          bấm trong nhật ký đơn.
        </p>
      </div>

      {!shop.approved ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5 text-[11px] text-amber-600 dark:text-amber-400">
          Hồ sơ bán của bạn được duyệt rồi mới mời CTV được.
        </p>
      ) : (
        <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
          <div className="flex flex-wrap gap-2">
            <input
              value={member}
              onChange={(e) => setMember(e.target.value)}
              placeholder="@handle hoặc email của thành viên"
              className="min-w-[200px] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
            />
            <button
              onClick={() => void invite()}
              disabled={busy !== null || full}
              title={full ? `Đã đủ ${MAX_STAFF_PER_SHOP} CTV` : undefined}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-60 dark:bg-amber-500"
            >
              {busy === "invite" ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />}
              Mời làm CTV
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {(["manage_listings", "handle_orders"] as const).map((p) => (
              <label key={p} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={perms[p]}
                  onChange={(e) => setPerms({ ...perms, [p]: e.target.checked })}
                  className="mt-0.5 size-3.5 accent-primary"
                />
                <span>
                  <b className="text-foreground">{STAFF_PERMISSION_LABEL[p]}</b> — {STAFF_PERMISSION_HINT[p]}
                </span>
              </label>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {live.length}/{MAX_STAFF_PER_SHOP} chỗ đã dùng.
          </p>
        </div>
      )}

      {staff.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
          Chưa có CTV nào.
        </p>
      ) : (
        <div className="space-y-2">
          {staff.map((s) => (
            <StaffRow key={s.id} row={s} busy={busy} call={call} />
          ))}
        </div>
      )}
    </div>
  );
}

function StaffRow({
  row,
  busy,
  call,
}: {
  row: ShopStaffRow;
  busy: string | null;
  call: (key: string, init: RequestInit & { url?: string }, ok: string) => Promise<boolean>;
}) {
  const live = row.status === "invited" || row.status === "active";

  const setPerm = (next: { manage: boolean; orders: boolean }) =>
    void call(
      `perms-${row.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          id: row.id,
          action: "perms",
          canManageListings: next.manage,
          canHandleOrders: next.orders,
        }),
      },
      "Đã đổi nhóm việc.",
    );

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-foreground">
          {row.member?.display_name ?? "Thành viên"}
          {row.member?.handle && (
            <span className="ml-1 text-[11px] font-normal text-muted-foreground">@{row.member.handle}</span>
          )}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
          <span className={chip}>{STAFF_STATUS_LABEL[row.status]}</span>
          {permissionSummary(row)}
        </p>
      </div>

      {live && (
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
            <input
              type="checkbox"
              checked={row.can_manage_listings}
              onChange={(e) => setPerm({ manage: e.target.checked, orders: row.can_handle_orders })}
              disabled={busy !== null}
              className="size-3.5 accent-primary"
            />
            Tin
          </label>
          <label className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
            <input
              type="checkbox"
              checked={row.can_handle_orders}
              onChange={(e) => setPerm({ manage: row.can_manage_listings, orders: e.target.checked })}
              disabled={busy !== null}
              className="size-3.5 accent-primary"
            />
            Đơn
          </label>
        </div>
      )}

      {live ? (
        <button
          onClick={() =>
            void call(
              `revoke-${row.id}`,
              { method: "PATCH", body: JSON.stringify({ id: row.id, action: "revoke" }) },
              "Đã gỡ CTV.",
            )
          }
          disabled={busy !== null}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground transition hover:border-red-500/40 hover:text-red-500 disabled:opacity-60"
        >
          {busy === `revoke-${row.id}` ? <Loader2 className="size-3 animate-spin" /> : <UserMinus className="size-3" />}
          {row.status === "invited" ? "Huỷ mời" : "Gỡ"}
        </button>
      ) : (
        <button
          onClick={() =>
            void call(
              `delete-${row.id}`,
              { method: "DELETE", url: `/api/shop/staff?id=${row.id}` },
              "Đã xoá khỏi danh sách.",
            )
          }
          disabled={busy !== null}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground transition hover:border-red-500/40 hover:text-red-500 disabled:opacity-60"
        >
          <X className="size-3" /> Xoá dòng
        </button>
      )}
    </div>
  );
}

function permissionSummary(row: { can_manage_listings: boolean; can_handle_orders: boolean }): string {
  const parts = [
    row.can_manage_listings && STAFF_PERMISSION_LABEL.manage_listings,
    row.can_handle_orders && STAFF_PERMISSION_LABEL.handle_orders,
  ].filter((v): v is string => !!v);
  return parts.length > 0 ? parts.join(" · ") : "Chưa có nhóm việc nào";
}
