"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, MessageCircle, PackageOpen } from "lucide-react";
import { ORDER_STATUS_COLOR, ORDER_STATUS_LABEL, formatVnd } from "@/lib/constants/shop";
import type { ShopOrder } from "@/lib/types/shop";
import { cn } from "@/lib/utils";

type Scope = "buying" | "selling" | "agent";

/** Danh sách đơn theo vai: đang mua / đang bán / đang làm trung gian. */
export function OrderList({
  scopes,
  initialScope,
}: {
  scopes: { key: Scope; label: string }[];
  initialScope: Scope;
}) {
  const [scope, setScope] = useState<Scope>(initialScope);
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/shop/orders?scope=${scope}`)
      .then((r) => r.json())
      .then((d: { orders?: ShopOrder[]; unread?: Record<string, number> }) => {
        if (cancelled) return;
        setOrders(d.orders ?? []);
        setUnread(d.unread ?? {});
      })
      .catch(() => { /* im lặng */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [scope]);

  return (
    <div className="space-y-3">
      {scopes.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {scopes.map((s) => (
            <button
              key={s.key}
              onClick={() => setScope(s.key)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-bold transition",
                scope === s.key
                  ? "border-primary/40 bg-primary/10 text-primary dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300"
                  : "border-border bg-muted/40 text-muted-foreground hover:border-primary/30",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-16 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Đang tải đơn...
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-16 text-center">
          <PackageOpen className="mx-auto size-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm font-semibold text-foreground">Chưa có đơn nào</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/shop/don-hang/${o.code}`}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition hover:border-primary/40"
            >
              <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                {o.listing?.images?.[0] && (
                  <Image src={o.listing.images[0]} alt="" fill sizes="56px" className="object-cover" unoptimized />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">
                  {o.listing?.title ?? "Tin đã xoá"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {o.code} · {new Date(o.created_at).toLocaleDateString("vi-VN")}
                </p>
                <span
                  className={cn(
                    "mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold",
                    ORDER_STATUS_COLOR[o.status],
                  )}
                >
                  {ORDER_STATUS_LABEL[o.status]}
                </span>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-heading text-sm font-black text-primary dark:text-amber-400">
                  {formatVnd(o.amount)}
                </p>
                {(unread[o.id] ?? 0) > 0 && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-black text-white">
                    <MessageCircle className="size-2.5" />
                    {unread[o.id]}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
