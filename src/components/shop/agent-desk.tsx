"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight, BadgeCheck, Banknote, Clock, HandCoins, Loader2, Lock,
  PackageOpen, RefreshCw, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { usePolling } from "@/hooks/use-polling";
import {
  ORDER_STATUS_COLOR,
  ORDER_STATUS_HINT,
  ORDER_STATUS_LABEL,
  actionsFor,
  formatVnd,
} from "@/lib/constants/shop";
import type { ShopOrder } from "@/lib/types/shop";
import { cn } from "@/lib/utils";

/**
 * Bàn làm việc của giao dịch viên.
 *
 * Khác trang "Đơn hàng của tôi" ở chỗ nó xếp theo VIỆC chứ không theo đơn:
 * đơn nào đang chờ mình bấm thì nổi lên trên cùng, đơn đang chờ bên kia thì
 * xếp xuống dưới. Người trực chỉ cần nhìn khối đầu tiên là biết phải làm gì.
 *
 * Hàng chờ hiện ẩn danh — server chỉ trả tên/SĐT người mua sau khi đơn đã
 * được nhận (xem src/lib/server/shop-privacy.ts). Nhận đơn là cam kết chịu
 * trách nhiệm, nên phải kèm số tài khoản trung gian ngay lúc bấm.
 */
export function AgentDesk({ userId }: { userId: string }) {
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [bankNote, setBankNote] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await fetch("/api/shop/orders?scope=agent");
      const d = (await res.json()) as { orders?: ShopOrder[]; error?: string };
      if (!res.ok) {
        if (!quiet) toast.error(d.error ?? "Không tải được đơn.");
        return;
      }
      setOrders(d.orders ?? []);
    } catch {
      if (!quiet) toast.error("Lỗi mạng.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const reload = useCallback(() => void load(true), [load]);
  usePolling(reload, 45_000, { immediate: false });

  const groups = useMemo(() => {
    const done = (o: ShopOrder) => ["completed", "cancelled"].includes(o.status);
    const queue = orders.filter((o) => !o.agent_id && !done(o));
    const mine = orders.filter((o) => o.agent_id === userId && !done(o));
    return {
      queue,
      // Đơn đang chờ CHÍNH MÌNH bấm — đây là phần phải nhìn trước tiên.
      todo: mine.filter((o) => actionsFor(o.status, "agent").length > 0),
      waiting: mine.filter((o) => actionsFor(o.status, "agent").length === 0),
      holding: mine
        .filter((o) => ["holding", "delivering", "payout"].includes(o.status))
        .reduce((s, o) => s + o.amount, 0),
    };
  }, [orders, userId]);

  const claim = async (code: string) => {
    if (!bankNote.trim()) {
      toast.error("Cần nhập số tài khoản trung gian để người mua chuyển đúng.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/shop/orders/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim", message: bankNote, images: [] }),
      });
      const d = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(d.error ?? "Không nhận được đơn.");
        return;
      }
      toast.success("Đã nhận đơn. Người mua nhận được STK ngay.");
      setClaiming(null);
      setBankNote("");
      await load(true);
    } catch {
      toast.error("Lỗi mạng, thử lại.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-20 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Đang tải bàn làm việc...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Số liệu nhanh */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat icon={HandCoins} label="Chờ nhận" value={String(groups.queue.length)} tone={groups.queue.length > 0 ? "warn" : "muted"} />
        <Stat icon={Clock} label="Việc của bạn" value={String(groups.todo.length)} tone={groups.todo.length > 0 ? "danger" : "muted"} />
        <Stat icon={ShieldCheck} label="Đang giữ tiền" value={formatVnd(groups.holding)} tone="info" />
        <Stat icon={BadgeCheck} label="Đang theo" value={String(groups.todo.length + groups.waiting.length)} tone="muted" />
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground transition hover:text-primary"
        >
          <RefreshCw className="size-3" /> Làm mới
        </button>
      </div>

      {/* 1. Việc của bạn */}
      <Section
        title="Việc của bạn"
        hint="Đơn đang đứng chờ chính bạn bấm — làm trước."
        count={groups.todo.length}
        tone="danger"
      >
        {groups.todo.map((o) => (
          <OrderRow key={o.id} order={o} showAction />
        ))}
      </Section>

      {/* 2. Hàng chờ */}
      <Section
        title="Hàng chờ nhận"
        hint="Chưa ai nhận. Thông tin người mua chỉ hiện sau khi bạn nhận đơn."
        count={groups.queue.length}
        tone="warn"
      >
        {groups.queue.map((o) => (
          <div key={o.id} className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3">
            <div className="flex items-center gap-3">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                {o.listing?.images?.[0] && (
                  <Image src={o.listing.images[0]} alt="" fill sizes="56px" className="object-cover" unoptimized />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{o.listing?.title ?? "Tin đã xoá"}</p>
                <p className="text-[11px] text-muted-foreground">
                  {o.code} · {new Date(o.created_at).toLocaleString("vi-VN")}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Lock className="size-3" /> Người mua ẩn danh cho tới khi nhận đơn
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-heading text-sm font-black text-primary dark:text-amber-400">{formatVnd(o.amount)}</p>
                <p className="text-[10px] text-muted-foreground">phí {formatVnd(o.fee)}</p>
              </div>
            </div>

            {claiming === o.code ? (
              <div className="mt-3 space-y-2 rounded-xl border border-border bg-background p-3">
                <p className="text-[11px] font-bold text-foreground">
                  Số tài khoản trung gian + nội dung chuyển khoản
                </p>
                <textarea
                  value={bankNote}
                  onChange={(e) => setBankNote(e.target.value)}
                  rows={3}
                  autoFocus
                  placeholder={`VD: Vietcombank 1234567890 — NGUYEN VAN A\nNội dung: ${o.code}`}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary/50"
                />
                <p className="text-[10px] text-muted-foreground">
                  Người mua thấy đúng nội dung này để chuyển tiền. Ghi rõ mã đơn {o.code} để dễ đối soát.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setClaiming(null); setBankNote(""); }}
                    className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground"
                  >
                    Thôi
                  </button>
                  <button
                    onClick={() => void claim(o.code)}
                    disabled={sending}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-60 dark:bg-amber-500"
                  >
                    {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Banknote className="size-3.5" />}
                    Nhận đơn & gửi STK
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setClaiming(o.code); setBankNote(`Nội dung chuyển khoản: ${o.code}`); }}
                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-xs font-bold text-white transition hover:opacity-90 dark:bg-amber-500"
              >
                <HandCoins className="size-3.5" /> Nhận đơn này
              </button>
            )}
          </div>
        ))}
      </Section>

      {/* 3. Đang chờ bên kia */}
      <Section
        title="Đang chờ bên kia"
        hint="Bạn đã làm xong phần của mình, đang đợi người mua hoặc người bán."
        count={groups.waiting.length}
        tone="muted"
      >
        {groups.waiting.map((o) => (
          <OrderRow key={o.id} order={o} />
        ))}
      </Section>
    </div>
  );
}

function Section({
  title,
  hint,
  count,
  tone,
  children,
}: {
  title: string;
  hint: string;
  count: number;
  tone: "danger" | "warn" | "muted";
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="text-xs font-black uppercase tracking-wide text-foreground">{title}</h2>
        <span
          className={cn(
            "rounded-full px-1.5 text-[10px] font-black",
            count === 0
              ? "bg-muted text-muted-foreground"
              : tone === "danger"
                ? "bg-red-500 text-white"
                : tone === "warn"
                  ? "bg-amber-500 text-white"
                  : "bg-muted text-muted-foreground",
          )}
        >
          {count}
        </span>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </div>
      {count === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-8 text-center">
          <PackageOpen className="mx-auto size-6 text-muted-foreground/40" />
          <p className="mt-1 text-[11px] text-muted-foreground">Trống</p>
        </div>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </div>
  );
}

function OrderRow({ order, showAction }: { order: ShopOrder; showAction?: boolean }) {
  const next = actionsFor(order.status, "agent")[0];
  return (
    <Link
      href={`/shop/don-hang/${order.code}`}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition hover:border-primary/40"
    >
      <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
        {order.listing?.images?.[0] && (
          <Image src={order.listing.images[0]} alt="" fill sizes="56px" className="object-cover" unoptimized />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-foreground">{order.listing?.title ?? "Tin đã xoá"}</p>
        <p className="text-[11px] text-muted-foreground">
          {order.code} · {order.buyer_name}
        </p>
        <span className={cn("mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold", ORDER_STATUS_COLOR[order.status])}>
          {ORDER_STATUS_LABEL[order.status]}
        </span>
        {showAction && next ? (
          <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-primary dark:text-amber-400">
            <ArrowRight className="size-3" /> {next.label}
          </p>
        ) : (
          <p className="mt-1 text-[11px] text-muted-foreground">{ORDER_STATUS_HINT[order.status]}</p>
        )}
      </div>
      <p className="shrink-0 font-heading text-sm font-black text-primary dark:text-amber-400">
        {formatVnd(order.amount)}
      </p>
    </Link>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof HandCoins;
  label: string;
  value: string;
  tone: "danger" | "warn" | "info" | "muted";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-3",
        tone === "danger"
          ? "border-red-500/30 bg-red-500/5"
          : tone === "warn"
            ? "border-amber-500/30 bg-amber-500/5"
            : tone === "info"
              ? "border-sky-500/30 bg-sky-500/5"
              : "border-border bg-card",
      )}
    >
      <p className="flex items-center gap-1 text-[10px] font-black uppercase text-muted-foreground">
        <Icon className="size-3" /> {label}
      </p>
      <p className="mt-0.5 font-heading text-lg font-black text-foreground">{value}</p>
    </div>
  );
}
