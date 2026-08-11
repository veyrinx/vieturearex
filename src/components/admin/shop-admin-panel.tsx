"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, Ban, Check, ExternalLink, Eye, Inbox, RefreshCw, ShieldAlert, Sparkles, Store, Tag,
  Users, X,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import {
  LISTING_KIND_LABEL,
  LISTING_STATUS_LABEL,
  ORDER_STATUS_COLOR,
  ORDER_STATUS_LABEL,
  SELLER_STATUS_LABEL,
  formatVnd,
} from "@/lib/constants/shop";
import type { AdminSellerRow, ShopDispute, ShopListing, ShopOrder, ShopSeller } from "@/lib/types/shop";
import { cn } from "@/lib/utils";

/**
 * Bàn làm việc chợ Arex cho staff.
 *
 * Bốn hàng chờ tách riêng: hồ sơ người bán, tin chờ duyệt, đơn đang chạy và
 * tranh chấp. Mọi thao tác đi qua đúng API mà trang /shop dùng — không có
 * đường ghi thẳng nào riêng cho admin.
 */

type DisputeRow = ShopDispute & {
  order_code: string | null;
  amount: number;
  order_status: string | null;
  listing_title: string | null;
};

/** Một lượt ai đó mở dữ liệu nhạy cảm — xem src/lib/server/shop-privacy.ts. */
type AccessLogRow = {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_role: string;
  kind: "seller_documents" | "seller_bank" | "order_secret" | "private_file";
  target: string;
  ip: string | null;
  created_at: string;
};

const ACCESS_KIND_LABEL: Record<AccessLogRow["kind"], string> = {
  seller_documents: "Mở hồ sơ + giấy tờ người bán",
  seller_bank: "Xem số tài khoản người bán",
  order_secret: "Mở thông tin đăng nhập acc",
  private_file: "Xem ảnh bằng chứng",
};

type TabKey = "sellers" | "listings" | "featured" | "orders" | "disputes" | "access";

const TABS: { key: TabKey; label: string; icon: typeof Users }[] = [
  { key: "sellers", label: "Hồ sơ người bán", icon: Users },
  { key: "listings", label: "Tin chờ duyệt", icon: Tag },
  { key: "featured", label: "Xin nổi bật", icon: Sparkles },
  { key: "orders", label: "Đơn hàng", icon: Store },
  { key: "disputes", label: "Tranh chấp", icon: AlertTriangle },
  { key: "access", label: "Nhật ký truy cập", icon: ShieldAlert },
];

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Không tải được dữ liệu.");
  return data;
}

export function ShopAdminPanel({ canReview }: { canReview: boolean }) {
  const [tab, setTab] = useState<TabKey>(canReview ? "sellers" : "orders");
  const queryClient = useQueryClient();

  const sellers = useQuery({
    queryKey: ["admin-shop", "sellers"],
    queryFn: () => getJson<{ sellers: AdminSellerRow[] }>("/api/shop/sellers").then((d) => d.sellers ?? []),
    refetchInterval: 60_000,
    enabled: canReview,
  });
  const listings = useQuery({
    queryKey: ["admin-shop", "listings"],
    queryFn: () =>
      getJson<{ listings: ShopListing[] }>("/api/shop/listings?status=pending&limit=100").then((d) => d.listings ?? []),
    refetchInterval: 60_000,
    enabled: canReview,
  });
  const featureRequests = useQuery({
    queryKey: ["admin-shop", "feature-requests"],
    queryFn: () =>
      getJson<{ listings: ShopListing[] }>("/api/shop/listings?featureRequests=1&limit=100").then(
        (d) => d.listings ?? [],
      ),
    refetchInterval: 60_000,
    enabled: canReview,
  });
  const orders = useQuery({
    queryKey: ["admin-shop", "orders"],
    queryFn: () => getJson<{ orders: ShopOrder[] }>("/api/shop/orders?scope=all").then((d) => d.orders ?? []),
    refetchInterval: 30_000,
  });
  const disputes = useQuery({
    queryKey: ["admin-shop", "disputes"],
    queryFn: () => getJson<{ disputes: DisputeRow[] }>("/api/shop/disputes").then((d) => d.disputes ?? []),
    refetchInterval: 30_000,
    enabled: canReview,
  });
  const accessLogs = useQuery({
    queryKey: ["admin-shop", "access-logs"],
    queryFn: () => getJson<{ logs: AccessLogRow[] }>("/api/shop/access-logs").then((d) => d.logs ?? []),
    // Chỉ tải khi mở tab — nhật ký không cần chạy nền.
    enabled: canReview && tab === "access",
  });

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["admin-shop"] });

  const pendingSellers = (sellers.data ?? []).filter((s) => s.status === "pending").length;
  const openDisputes = (disputes.data ?? []).filter((d) => ["open", "resolving"].includes(d.status)).length;
  const counts: Record<TabKey, number> = {
    sellers: pendingSellers,
    listings: listings.data?.length ?? 0,
    featured: featureRequests.data?.length ?? 0,
    orders: (orders.data ?? []).filter((o) => !["completed", "cancelled"].includes(o.status)).length,
    disputes: openDisputes,
    access: 0,
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold uppercase tracking-[0.08em] text-foreground">CHỢ AREX</h1>
          <p className="text-sm text-muted-foreground">
            Duyệt người bán, duyệt tin đăng, theo dõi tiền đang giữ và xử lý tranh chấp.
          </p>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
        >
          <RefreshCw className="size-3.5" /> Làm mới
        </button>
      </div>

      {/* Số liệu nhanh */}
      <div className="grid gap-2 sm:grid-cols-4">
        {canReview && (
          <>
            <Stat label="Hồ sơ chờ duyệt" value={pendingSellers} tone={pendingSellers > 0 ? "warn" : "muted"} />
            <Stat label="Tin chờ duyệt" value={listings.data?.length ?? 0} tone={(listings.data?.length ?? 0) > 0 ? "warn" : "muted"} />
          </>
        )}
        <Stat
          label="Tiền đang giữ"
          value={formatVnd(
            (orders.data ?? [])
              .filter((o) => ["holding", "delivering", "payout", "disputed"].includes(o.status))
              .reduce((s, o) => s + o.amount, 0),
          )}
          tone="info"
        />
        {canReview && <Stat label="Tranh chấp mở" value={openDisputes} tone={openDisputes > 0 ? "danger" : "muted"} />}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.filter((t) => canReview || t.key === "orders").map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition",
              tab === key
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-muted/40 text-muted-foreground hover:border-primary/30",
            )}
          >
            <Icon className="size-3.5" /> {label}
            {counts[key] > 0 && (
              <span className="rounded-full bg-primary px-1.5 text-[10px] font-black text-white">{counts[key]}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "sellers" && <SellersTab query={sellers} onDone={refresh} />}
      {tab === "listings" && <ListingsTab query={listings} onDone={refresh} />}
      {tab === "featured" && <FeatureRequestsTab query={featureRequests} onDone={refresh} />}
      {tab === "orders" && <OrdersTab query={orders} />}
      {tab === "disputes" && <DisputesTab query={disputes} />}
      {tab === "access" && <AccessLogTab query={accessLogs} />}
    </section>
  );
}

// ── Nhật ký truy cập dữ liệu nhạy cảm ───────────────────────────────────────
function AccessLogTab({ query }: { query: ReturnType<typeof useQuery<AccessLogRow[]>> }) {
  if (query.isLoading) return <LoadingSpinner className="py-10" />;
  if (query.error) return <ErrorBox message={(query.error as Error).message} />;

  const rows = query.data ?? [];
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Chưa có lượt truy cập nào"
        description="Mọi lần mở giấy tờ người bán hoặc thông tin đăng nhập acc sẽ hiện ở đây."
      />
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground">
        200 lượt gần nhất. Bảng này chỉ ghi thêm — không ai sửa hay xoá được, kể cả super admin.
      </p>
      {rows.map((r) => (
        <div key={r.id} className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2 text-[11px]">
          <span className="font-bold text-foreground">
            {r.actor_name ?? r.actor_id ?? "?"}
            <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">
              {r.actor_role}
            </span>
          </span>
          <span className="text-muted-foreground">{ACCESS_KIND_LABEL[r.kind] ?? r.kind}</span>
          <span className="break-all font-mono text-muted-foreground">{r.target}</span>
          <span className="text-muted-foreground">
            {new Date(r.created_at).toLocaleString("vi-VN")}
            {r.ip ? ` · ${r.ip}` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Hồ sơ người bán ─────────────────────────────────────────────────────────
function SellersTab({
  query,
  onDone,
}: {
  query: ReturnType<typeof useQuery<AdminSellerRow[]>>;
  onDone: () => void;
}) {
  const [filter, setFilter] = useState<ShopSeller["status"] | "all">("pending");
  const [busy, setBusy] = useState<string | null>(null);

  if (query.isLoading) return <LoadingSpinner className="py-10" />;
  if (query.error) return <ErrorBox message={(query.error as Error).message} />;

  const all = query.data ?? [];
  const rows = filter === "all" ? all : all.filter((s) => s.status === filter);

  const review = async (id: string, status: ShopSeller["status"]) => {
    const reason =
      status === "rejected" || status === "suspended"
        ? window.prompt(status === "rejected" ? "Lý do từ chối:" : "Lý do tạm khoá:") ?? ""
        : "";
    if ((status === "rejected" || status === "suspended") && !reason.trim()) return;

    setBusy(id);
    try {
      const res = await fetch(`/api/shop/sellers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason }),
      });
      const d = (await res.json()) as { error?: string };
      if (!res.ok) { toast.error(d.error ?? "Không cập nhật được."); return; }
      toast.success(`Đã chuyển hồ sơ sang "${SELLER_STATUS_LABEL[status]}".`);
      onDone();
    } catch {
      toast.error("Lỗi mạng, thử lại.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <FilterRow
        options={[["pending", "Chờ duyệt"], ["approved", "Đã duyệt"], ["rejected", "Từ chối"], ["suspended", "Tạm khoá"], ["all", "Tất cả"]]}
        value={filter}
        onChange={(v) => setFilter(v as typeof filter)}
        counts={Object.fromEntries(
          (["pending", "approved", "rejected", "suspended"] as const).map((s) => [s, all.filter((x) => x.status === s).length]),
        )}
      />

      {rows.length === 0 ? (
        <EmptyState icon={Users} title="Không có hồ sơ nào" description="Hàng chờ duyệt người bán đang trống." />
      ) : (
        <div className="space-y-2">
          {rows.map((s) => (
            <div key={s.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">
                    {s.display_name}
                    <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                      {SELLER_STATUS_LABEL[s.status]}
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Nộp lúc {new Date(s.created_at).toLocaleString("vi-VN")} · {s.orders_done} đơn thành công
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {s.status !== "approved" && (
                    <ActionBtn tone="ok" disabled={busy === s.id} onClick={() => void review(s.id, "approved")}>
                      <Check className="size-3.5" /> Duyệt
                    </ActionBtn>
                  )}
                  {s.status === "pending" && (
                    <ActionBtn tone="bad" disabled={busy === s.id} onClick={() => void review(s.id, "rejected")}>
                      <X className="size-3.5" /> Từ chối
                    </ActionBtn>
                  )}
                  {s.status === "approved" && (
                    <ActionBtn tone="bad" disabled={busy === s.id} onClick={() => void review(s.id, "suspended")}>
                      <Ban className="size-3.5" /> Tạm khoá
                    </ActionBtn>
                  )}
                </div>
              </div>

              <SellerDetails row={s} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Phần thông tin cá nhân của một hồ sơ người bán.
 *
 * Danh sách chỉ mang bản đã che (SĐT, STK còn vài ký tự, không có ảnh giấy
 * tờ). Muốn xem đủ để duyệt thì bấm — lệnh gọi riêng, và mỗi lần bấm là một
 * dòng trong `shop_access_logs` ghi rõ ai xem hồ sơ nào lúc nào.
 */
function SellerDetails({ row }: { row: AdminSellerRow }) {
  const [full, setFull] = useState<ShopSeller | null>(null);
  const [loading, setLoading] = useState(false);

  const s = full ?? row;
  const idImages = full?.id_images ?? [];

  const reveal = async () => {
    setLoading(true);
    try {
      const d = await getJson<{ seller: ShopSeller }>(`/api/shop/sellers/${row.id}`);
      setFull(d.seller);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không mở được hồ sơ.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <dl className="mt-3 grid gap-x-4 gap-y-1 border-t border-border pt-3 text-[11px] sm:grid-cols-2">
        <Field label="Họ tên thật" value={s.real_name} />
        <Field label="Điện thoại" value={s.phone} />
        <Field label="Liên hệ" value={s.contact} />
        <Field label="Ngân hàng" value={`${s.bank_name} — ${s.bank_account}`} />
        <Field label="Chủ tài khoản" value={s.bank_holder} />
        {s.note && <Field label="Ghi chú" value={s.note} />}
        {s.reject_reason && <Field label="Lý do từ chối/khoá" value={s.reject_reason} />}
      </dl>

      {!full && (
        <button
          onClick={() => void reveal()}
          disabled={loading}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground transition hover:border-primary/40 hover:text-primary disabled:opacity-60"
        >
          {loading ? <RefreshCw className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />}
          Xem đủ số tài khoản{row.id_images_count > 0 ? ` + ${row.id_images_count} ảnh giấy tờ` : ""} (ghi log)
        </button>
      )}

      {idImages.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {idImages.map((url) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="relative size-20 overflow-hidden rounded-lg border border-border">
              <Image src={url} alt="" fill sizes="80px" className="object-cover" unoptimized />
            </a>
          ))}
        </div>
      )}
    </>
  );
}

// ── Tin chờ duyệt ───────────────────────────────────────────────────────────
function ListingsTab({
  query,
  onDone,
}: {
  query: ReturnType<typeof useQuery<ShopListing[]>>;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  if (query.isLoading) return <LoadingSpinner className="py-10" />;
  if (query.error) return <ErrorBox message={(query.error as Error).message} />;

  const rows = query.data ?? [];

  const review = async (id: string, status: "active" | "rejected" | "hidden") => {
    const reason = status === "rejected" ? window.prompt("Lý do từ chối (người bán sẽ đọc được):") ?? "" : "";
    if (status === "rejected" && !reason.trim()) return;

    setBusy(id);
    try {
      const res = await fetch(`/api/shop/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason }),
      });
      const d = (await res.json()) as { error?: string };
      if (!res.ok) { toast.error(d.error ?? "Không cập nhật được."); return; }
      toast.success(`Tin đã chuyển sang "${LISTING_STATUS_LABEL[status]}".`);
      onDone();
    } catch {
      toast.error("Lỗi mạng, thử lại.");
    } finally {
      setBusy(null);
    }
  };

  if (rows.length === 0) {
    return <EmptyState icon={Inbox} title="Không có tin chờ duyệt" description="Mọi tin đăng đã được xử lý." />;
  }

  return (
    <div className="space-y-2">
      {rows.map((l) => (
        <div key={l.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex gap-3">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
              {l.images[0] && <Image src={l.images[0]} alt="" fill sizes="80px" className="object-cover" unoptimized />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-bold text-foreground">{l.title}</p>
              <p className="font-heading text-base font-black text-primary">{formatVnd(l.price)}</p>
              <p className="text-[11px] text-muted-foreground">
                {LISTING_KIND_LABEL[l.kind]} · {l.seller?.display_name ?? "—"} ·{" "}
                {new Date(l.created_at).toLocaleString("vi-VN")}
              </p>
            </div>
            <Link
              href={`/shop/${l.id}`}
              target="_blank"
              className="shrink-0 self-start text-[11px] font-semibold text-muted-foreground hover:text-primary"
            >
              <ExternalLink className="size-4" />
            </Link>
          </div>

          <p className="mt-2 whitespace-pre-wrap border-t border-border pt-2 text-[11px] leading-relaxed text-muted-foreground">
            {l.description}
          </p>

          {l.images.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {l.images.slice(1).map((url) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="relative size-16 overflow-hidden rounded-lg border border-border">
                  <Image src={url} alt="" fill sizes="64px" className="object-cover" unoptimized />
                </a>
              ))}
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-1.5">
            <ActionBtn tone="ok" disabled={busy === l.id} onClick={() => void review(l.id, "active")}>
              <Check className="size-3.5" /> Duyệt lên sàn
            </ActionBtn>
            <ActionBtn tone="bad" disabled={busy === l.id} onClick={() => void review(l.id, "rejected")}>
              <X className="size-3.5" /> Từ chối
            </ActionBtn>
            <ActionBtn tone="mute" disabled={busy === l.id} onClick={() => void review(l.id, "hidden")}>
              <Ban className="size-3.5" /> Gỡ
            </ActionBtn>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Hàng chờ xin đẩy nổi bật ────────────────────────────────────────────────
/**
 * Khác tab "Tin chờ duyệt": ở đó tin chưa được lên sàn, còn ở đây tin đã bán
 * bình thường rồi — từ chối cũng không ảnh hưởng gì tới nó, chỉ là không được
 * ghim. Nên không hỏi lý do như lúc từ chối tin.
 */
const FEATURE_DAY_CHOICES = [3, 7, 30];

function FeatureRequestsTab({
  query,
  onDone,
}: {
  query: ReturnType<typeof useQuery<ShopListing[]>>;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  if (query.isLoading) return <LoadingSpinner className="py-10" />;
  if (query.error) return <ErrorBox message={(query.error as Error).message} />;

  const rows = query.data ?? [];

  const act = async (id: string, body: Record<string, unknown>, done: string) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/shop/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = (await res.json()) as { error?: string };
      if (!res.ok) { toast.error(d.error ?? "Không cập nhật được."); return; }
      toast.success(done);
      onDone();
    } catch {
      toast.error("Lỗi mạng, thử lại.");
    } finally {
      setBusy(null);
    }
  };

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Không có yêu cầu nào"
        description="Người bán chưa xin đẩy tin nào lên dải nổi bật."
      />
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((l) => (
        <div key={l.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex gap-3">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
              {l.images[0] && <Image src={l.images[0]} alt="" fill sizes="64px" className="object-cover" unoptimized />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-bold text-foreground">{l.title}</p>
              <p className="font-heading text-base font-black text-primary">{formatVnd(l.price)}</p>
              <p className="text-[11px] text-muted-foreground">
                {LISTING_KIND_LABEL[l.kind]} · {l.seller?.display_name ?? "—"}
                {l.seller ? ` · ${l.seller.orders_done} đơn xong` : ""}
                {l.featured_requested_at
                  ? ` · xin lúc ${new Date(l.featured_requested_at).toLocaleString("vi-VN")}`
                  : ""}
              </p>
            </div>
            <Link
              href={`/shop/${l.id}`}
              target="_blank"
              className="shrink-0 self-start text-[11px] font-semibold text-muted-foreground hover:text-primary"
            >
              <ExternalLink className="size-4" />
            </Link>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-muted-foreground">Ghim trong:</span>
            {FEATURE_DAY_CHOICES.map((days) => (
              <ActionBtn
                key={days}
                tone="ok"
                disabled={busy === l.id}
                onClick={() => void act(l.id, { action: "feature", days }, `Đã ghim nổi bật ${days} ngày.`)}
              >
                <Check className="size-3.5" /> {days} ngày
              </ActionBtn>
            ))}
            <ActionBtn
              tone="bad"
              disabled={busy === l.id}
              onClick={() => void act(l.id, { action: "feature_reject" }, "Đã bỏ yêu cầu.")}
            >
              <X className="size-3.5" /> Từ chối
            </ActionBtn>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Đơn hàng ────────────────────────────────────────────────────────────────
function OrdersTab({ query }: { query: ReturnType<typeof useQuery<ShopOrder[]>> }) {
  const [showDone, setShowDone] = useState(false);

  if (query.isLoading) return <LoadingSpinner className="py-10" />;
  if (query.error) return <ErrorBox message={(query.error as Error).message} />;

  const all = query.data ?? [];
  const rows = showDone ? all : all.filter((o) => !["completed", "cancelled"].includes(o.status));

  if (all.length === 0) {
    return <EmptyState icon={Store} title="Chưa có đơn nào" description="Chợ chưa phát sinh giao dịch." />;
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
        Hiện cả đơn đã xong / đã huỷ
      </label>

      {rows.map((o) => (
        <Link
          key={o.id}
          href={`/shop/don-hang/${o.code}`}
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition hover:border-primary/40"
        >
          <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
            {o.listing?.images?.[0] && (
              <Image src={o.listing.images[0]} alt="" fill sizes="48px" className="object-cover" unoptimized />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 text-xs font-bold text-foreground">{o.listing?.title ?? "Tin đã xoá"}</p>
            <p className="text-[11px] text-muted-foreground">
              {o.code} · {o.buyer_name} ← {o.seller?.display_name ?? "—"} ·{" "}
              {new Date(o.created_at).toLocaleDateString("vi-VN")}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-heading text-sm font-black text-primary">{formatVnd(o.amount)}</p>
            <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", ORDER_STATUS_COLOR[o.status])}>
              {ORDER_STATUS_LABEL[o.status]}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ── Tranh chấp ──────────────────────────────────────────────────────────────
function DisputesTab({ query }: { query: ReturnType<typeof useQuery<DisputeRow[]>> }) {
  if (query.isLoading) return <LoadingSpinner className="py-10" />;
  if (query.error) return <ErrorBox message={(query.error as Error).message} />;

  const rows = query.data ?? [];
  if (rows.length === 0) {
    return <EmptyState icon={AlertTriangle} title="Không có tranh chấp" description="Chưa ai khiếu nại đơn nào." />;
  }

  return (
    <div className="space-y-2">
      {rows.map((d) => (
        <div key={d.id} className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-black text-red-500">
              {d.listing_title ?? "Đơn"} · {formatVnd(d.amount)}
            </p>
            {d.order_code && (
              <Link
                href={`/shop/don-hang/${d.order_code}`}
                className="inline-flex items-center gap-1 rounded-lg bg-red-500 px-2.5 py-1 text-[11px] font-bold text-white transition hover:opacity-90"
              >
                Vào xử lý <ExternalLink className="size-3" />
              </Link>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {PARTY_LABEL[d.opened_role]} mở lúc {new Date(d.created_at).toLocaleString("vi-VN")} · trạng thái {d.status}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-xs text-foreground">{d.reason}</p>
          {d.resolution && <p className="mt-1 text-xs font-semibold text-emerald-600">Kết luận: {d.resolution}</p>}
          {d.images.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {d.images.map((url) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="relative size-16 overflow-hidden rounded-lg border border-border">
                  <Image src={url} alt="" fill sizes="64px" className="object-cover" unoptimized />
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Mảnh dùng chung ─────────────────────────────────────────────────────────
const PARTY_LABEL: Record<string, string> = {
  buyer: "Người mua",
  seller: "Người bán",
  agent: "Giao dịch viên",
};

function Stat({ label, value, tone }: { label: string; value: string | number; tone: "warn" | "info" | "danger" | "muted" }) {
  const tones = {
    warn: "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400",
    info: "border-sky-500/30 bg-sky-500/5 text-sky-600 dark:text-sky-400",
    danger: "border-red-500/30 bg-red-500/5 text-red-500",
    muted: "border-border bg-card text-foreground",
  };
  return (
    <div className={cn("rounded-2xl border p-3", tones[tone])}>
      <p className="text-[10px] font-black uppercase tracking-wide opacity-70">{label}</p>
      <p className="font-heading text-xl font-black">{value}</p>
    </div>
  );
}

function FilterRow({
  options,
  value,
  onChange,
  counts,
}: {
  options: [string, string][];
  value: string;
  onChange: (v: string) => void;
  counts: Record<string, number>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([key, label]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={cn(
            "rounded-full border px-3 py-1 text-[11px] font-bold transition",
            value === key
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border bg-muted/40 text-muted-foreground hover:border-primary/30",
          )}
        >
          {label}
          {counts[key] != null && ` (${counts[key]})`}
        </button>
      ))}
    </div>
  );
}

function ActionBtn({
  children,
  tone,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  tone: "ok" | "bad" | "mute";
  disabled?: boolean;
  onClick: () => void;
}) {
  const tones = {
    ok: "bg-emerald-500 text-white hover:opacity-90",
    bad: "border border-red-500/40 text-red-500 hover:bg-red-500/10",
    mute: "border border-border text-muted-foreground hover:border-primary/40",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn("inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition disabled:opacity-50", tones[tone])}
    >
      {children}
    </button>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-border/40 py-1">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="break-all text-right font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm font-semibold text-red-500">
      {message}
    </div>
  );
}
