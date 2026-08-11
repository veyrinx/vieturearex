"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, Ban, BadgeCheck, BellRing, Check, Clock, ExternalLink, Eye, Flame, HandCoins,
  Inbox, MessageSquare, RefreshCw, Search, ShieldAlert, Sparkles, Star, Store, Tag, TimerReset,
  Users, Wallet, X,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import {
  LISTING_KIND_LABEL,
  LISTING_STATUS_LABEL,
  ORDER_STATUS_COLOR,
  ORDER_STATUS_HINT,
  ORDER_STATUS_LABEL,
  ORDER_STEPS,
  ORDER_WAITING_ON,
  SELLER_STATUS_LABEL,
  STALE_ORDER_HOURS,
  formatVnd,
  formatVndShort,
  hoursSince,
  isOrderStale,
  orderLastMoved,
  orderStep,
  timeAgo,
  timeLeft,
  type ListingStatus,
  type OrderStatus,
} from "@/lib/constants/shop";
import type { AdminSellerRow, ShopDispute, ShopListing, ShopOrder, ShopSeller } from "@/lib/types/shop";
import { cn } from "@/lib/utils";

/**
 * Bàn làm việc chợ Arex cho staff.
 *
 * Sáu hàng chờ tách riêng: hồ sơ người bán, tin đăng, xin nổi bật, đơn đang
 * chạy, tranh chấp và nhật ký truy cập. Mọi thao tác đi qua đúng API mà trang
 * /shop dùng — không có đường ghi thẳng nào riêng cho admin.
 *
 * Nguyên tắc trình bày: mỗi hàng chờ phải trả lời được ba câu hỏi ngay trên
 * dòng danh sách — đang chờ ai, chờ bao lâu rồi, và bấm gì tiếp theo. Cái gì
 * phải mở đơn ra mới biết thì coi như bàn làm việc đã hỏng.
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

/** Danh sách đơn kèm số tin nhắn chưa đọc — API trả cả hai trong một lần gọi. */
type OrdersPayload = { orders: ShopOrder[]; unread: Record<string, number> };

type TabKey = "sellers" | "listings" | "featured" | "orders" | "agents" | "disputes" | "access";

const TABS: { key: TabKey; label: string; icon: typeof Users }[] = [
  { key: "sellers", label: "Hồ sơ người bán", icon: Users },
  { key: "listings", label: "Tin đăng", icon: Tag },
  { key: "featured", label: "Xin nổi bật", icon: Sparkles },
  { key: "orders", label: "Đơn hàng", icon: Store },
  { key: "agents", label: "Giao dịch viên", icon: HandCoins },
  { key: "disputes", label: "Tranh chấp", icon: AlertTriangle },
  { key: "access", label: "Nhật ký truy cập", icon: ShieldAlert },
];

/** Lấy sâu hơn 100 đơn mặc định để mấy ô tiền không chỉ tính đợt gần nhất. */
const ORDER_SCAN_LIMIT = 300;

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Không tải được dữ liệu.");
  return data;
}

const fetchListings = (status: ListingStatus) =>
  getJson<{ listings: ShopListing[] }>(`/api/shop/listings?status=${status}&limit=100`).then(
    (d) => d.listings ?? [],
  );

export function ShopAdminPanel({ canReview }: { canReview: boolean }) {
  const [tab, setTab] = useState<TabKey>(canReview ? "sellers" : "orders");
  const queryClient = useQueryClient();

  const sellers = useQuery({
    queryKey: ["admin-shop", "sellers"],
    queryFn: () => getJson<{ sellers: AdminSellerRow[] }>("/api/shop/sellers").then((d) => d.sellers ?? []),
    refetchInterval: 60_000,
    enabled: canReview,
  });
  // Hàng chờ duyệt: giữ ở đây cho con số trên tab và ô số liệu. Tab tin đăng tự
  // hỏi theo bộ lọc của nó, và khi bộ lọc là "pending" thì trùng khoá nên React
  // Query dùng lại chính kết quả này chứ không gọi thêm lượt nào.
  const pendingListings = useQuery({
    queryKey: ["admin-shop", "listings", "pending"],
    queryFn: () => fetchListings("pending"),
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
    queryFn: () =>
      getJson<OrdersPayload>(`/api/shop/orders?scope=all&limit=${ORDER_SCAN_LIMIT}`).then((d) => ({
        orders: d.orders ?? [],
        unread: d.unread ?? {},
      })),
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

  const orderRows = orders.data?.orders;
  const stats = useMemo(() => summarize(orderRows ?? []), [orderRows]);
  const pendingSellers = (sellers.data ?? []).filter((s) => s.status === "pending").length;
  const approvedSellers = (sellers.data ?? []).filter((s) => s.status === "approved").length;
  const openDisputes = (disputes.data ?? []).filter((d) => ["open", "resolving"].includes(d.status)).length;

  const counts: Record<TabKey, number> = {
    sellers: pendingSellers,
    listings: pendingListings.data?.length ?? 0,
    featured: featureRequests.data?.length ?? 0,
    orders: stats.stale > 0 ? stats.stale : stats.active,
    agents: 0,
    disputes: openDisputes,
    access: 0,
  };

  const lastSync = orders.dataUpdatedAt ? timeAgo(new Date(orders.dataUpdatedAt).toISOString()) : "";

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
          <RefreshCw className={cn("size-3.5", orders.isFetching && "animate-spin")} />
          Làm mới{lastSync ? ` · ${lastSync}` : ""}
        </button>
      </div>

      {/* Việc cần xử lý — chỉ những con số bấm vào là có người phải làm gì đó */}
      {canReview && (
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <Stat
            label="Hồ sơ chờ duyệt" icon={Users} value={pendingSellers}
            tone={pendingSellers > 0 ? "warn" : "muted"} onClick={() => setTab("sellers")}
          />
          <Stat
            label="Tin chờ duyệt" icon={Tag} value={pendingListings.data?.length ?? 0}
            tone={(pendingListings.data?.length ?? 0) > 0 ? "warn" : "muted"} onClick={() => setTab("listings")}
          />
          <Stat
            label="Xin nổi bật" icon={Sparkles} value={featureRequests.data?.length ?? 0}
            tone={(featureRequests.data?.length ?? 0) > 0 ? "warn" : "muted"} onClick={() => setTab("featured")}
          />
          <Stat
            label="Tranh chấp mở" icon={AlertTriangle} value={openDisputes}
            tone={openDisputes > 0 ? "danger" : "muted"} onClick={() => setTab("disputes")}
          />
          <Stat
            label="Đơn treo" icon={TimerReset} value={stats.stale}
            hint="Đứng yên quá lâu ở bước hiện tại"
            tone={stats.stale > 0 ? "danger" : "muted"} onClick={() => setTab("orders")}
          />
        </div>
      )}

      {/* Dòng tiền — đọc từ chính danh sách đơn, nên ghi rõ phạm vi mẫu */}
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
        <Stat
          label="Tiền đang giữ" icon={Wallet} value={formatVnd(stats.holding)}
          hint={`${stats.holdingCount} đơn chưa trả tiền người bán`} tone="info"
        />
        <Stat
          label="Đơn đang chạy" icon={Clock} value={stats.active}
          hint={`${stats.total} đơn trong tầm nhìn`} tone="muted" onClick={() => setTab("orders")}
        />
        <Stat
          label="Đã qua chợ" icon={BadgeCheck} value={formatVndShort(stats.gmv)}
          hint={`${stats.completed} đơn hoàn tất${stats.total > 0 ? ` · ${Math.round((stats.completed / stats.total) * 100)}% số đơn` : ""}`}
          tone="ok"
        />
        <Stat
          label="Phí thu về" icon={Store} value={formatVndShort(stats.fee)}
          hint={canReview ? `${approvedSellers} người bán đang hoạt động` : "Từ các đơn đã hoàn tất"}
          tone="ok"
        />
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
      {tab === "listings" && <ListingsTab onDone={refresh} />}
      {tab === "featured" && <FeatureRequestsTab query={featureRequests} onDone={refresh} />}
      {tab === "orders" && <OrdersTab query={orders} canPing={canReview} />}
      {tab === "agents" && <AgentsTab />}
      {tab === "disputes" && <DisputesTab query={disputes} />}
      {tab === "access" && <AccessLogTab query={accessLogs} />}
    </section>
  );
}

/** Gộp danh sách đơn thành các con số ở đầu bàn làm việc. */
function summarize(orders: ShopOrder[]) {
  const holdingStatuses: OrderStatus[] = ["holding", "delivering", "payout", "disputed"];
  let holding = 0, holdingCount = 0, gmv = 0, fee = 0, completed = 0, active = 0, stale = 0;

  for (const o of orders) {
    if (holdingStatuses.includes(o.status)) {
      holding += o.amount;
      holdingCount++;
    }
    if (o.status === "completed") {
      completed++;
      gmv += o.amount;
      fee += o.fee;
    }
    if (!["completed", "cancelled"].includes(o.status)) {
      active++;
      if (isOrderStale(o)) stale++;
    }
  }
  return { holding, holdingCount, gmv, fee, completed, active, stale, total: orders.length };
}

// ── Nhật ký truy cập dữ liệu nhạy cảm ───────────────────────────────────────
function AccessLogTab({ query }: { query: ReturnType<typeof useQuery<AccessLogRow[]>> }) {
  const [kind, setKind] = useState<AccessLogRow["kind"] | "all">("all");
  const [q, setQ] = useState("");

  if (query.isLoading) return <LoadingSpinner className="py-10" />;
  if (query.error) return <ErrorBox message={(query.error as Error).message} />;

  const all = query.data ?? [];
  const rows = all.filter(
    (r) =>
      (kind === "all" || r.kind === kind) &&
      (!q.trim() ||
        [r.actor_name, r.actor_id, r.target, r.ip].some((v) =>
          (v ?? "").toLowerCase().includes(q.trim().toLowerCase()),
        )),
  );

  if (all.length === 0) {
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
      <FilterRow
        options={[
          ["all", "Tất cả"],
          ...(Object.keys(ACCESS_KIND_LABEL) as AccessLogRow["kind"][]).map(
            (k) => [k, ACCESS_KIND_LABEL[k]] as [string, string],
          ),
        ]}
        value={kind}
        onChange={(v) => setKind(v as typeof kind)}
        counts={Object.fromEntries(
          (Object.keys(ACCESS_KIND_LABEL) as AccessLogRow["kind"][]).map((k) => [
            k,
            all.filter((r) => r.kind === k).length,
          ]),
        )}
      />
      <SearchBox value={q} onChange={setQ} placeholder="Lọc theo người xem, mục tiêu hoặc IP…" />

      <p className="text-[11px] text-muted-foreground">
        200 lượt gần nhất — đang hiện {rows.length}. Bảng này chỉ ghi thêm, không ai sửa hay xoá được,
        kể cả super admin.
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
      {rows.length === 0 && (
        <p className="rounded-xl border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
          Không có lượt nào khớp bộ lọc.
        </p>
      )}
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
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  if (query.isLoading) return <LoadingSpinner className="py-10" />;
  if (query.error) return <ErrorBox message={(query.error as Error).message} />;

  const all = query.data ?? [];
  const term = q.trim().toLowerCase();
  const rows = all
    .filter((s) => filter === "all" || s.status === filter)
    .filter(
      (s) =>
        !term ||
        [s.display_name, s.real_name, s.bank_holder, s.bank_name, s.phone].some((v) =>
          (v ?? "").toLowerCase().includes(term),
        ),
    );

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
      <SearchBox value={q} onChange={setQ} placeholder="Tìm theo tên gian hàng, tên thật, chủ tài khoản…" />

      {rows.length === 0 ? (
        <EmptyState icon={Users} title="Không có hồ sơ nào" description="Hàng chờ duyệt người bán đang trống." />
      ) : (
        <div className="space-y-2">
          {rows.map((s) => {
            const rating = s.rating_count > 0 ? Math.round((s.rating_sum / s.rating_count) * 10) / 10 : null;
            return (
              <div key={s.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">
                      {s.display_name}
                      <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                        {SELLER_STATUS_LABEL[s.status]}
                      </span>
                    </p>
                    <p className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                      <span>Nộp {timeAgo(s.created_at)}</span>
                      <span>· {s.orders_done} đơn thành công</span>
                      {rating != null && (
                        <span className="flex items-center gap-0.5 text-amber-500">
                          · <Star className="size-3 fill-current" /> {rating} ({s.rating_count})
                        </span>
                      )}
                      {s.approved_at && <span>· duyệt {timeAgo(s.approved_at)}</span>}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {s.status === "approved" && (
                      <Link
                        href={`/shop/nguoi-ban/${s.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                      >
                        <Store className="size-3.5" /> Gian hàng
                      </Link>
                    )}
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
            );
          })}
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

// ── Tin đăng ────────────────────────────────────────────────────────────────
/**
 * Trước đây tab này chỉ có tin chờ duyệt, nên tin đã duyệt rồi thì admin không
 * còn đường nào chạm tới: gỡ một tin lừa đảo đang bán phải vào tận trang công
 * khai của nó. Giờ lọc được cả sáu trạng thái.
 */
const LISTING_TAB_STATUSES: ListingStatus[] = [
  "pending", "active", "reserved", "sold", "rejected", "hidden",
];

function ListingsTab({ onDone }: { onDone: () => void }) {
  const [status, setStatus] = useState<ListingStatus>("pending");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["admin-shop", "listings", status],
    queryFn: () => fetchListings(status),
    refetchInterval: 60_000,
  });

  const review = async (id: string, next: "active" | "rejected" | "hidden") => {
    const reason = next === "rejected" ? window.prompt("Lý do từ chối (người bán sẽ đọc được):") ?? "" : "";
    if (next === "rejected" && !reason.trim()) return;

    setBusy(id);
    try {
      const res = await fetch(`/api/shop/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next, reason }),
      });
      const d = (await res.json()) as { error?: string };
      if (!res.ok) { toast.error(d.error ?? "Không cập nhật được."); return; }
      toast.success(`Tin đã chuyển sang "${LISTING_STATUS_LABEL[next]}".`);
      onDone();
    } catch {
      toast.error("Lỗi mạng, thử lại.");
    } finally {
      setBusy(null);
    }
  };

  const feature = async (id: string, days: number) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/shop/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "feature", days }),
      });
      const d = (await res.json()) as { error?: string };
      if (!res.ok) { toast.error(d.error ?? "Không cập nhật được."); return; }
      toast.success(days > 0 ? `Đã ghim nổi bật ${days} ngày.` : "Đã gỡ nhãn nổi bật.");
      onDone();
    } catch {
      toast.error("Lỗi mạng, thử lại.");
    } finally {
      setBusy(null);
    }
  };

  const term = q.trim().toLowerCase();
  const rows = (query.data ?? []).filter(
    (l) =>
      !term ||
      [l.title, l.description, l.seller?.display_name, l.game_uid].some((v) =>
        (v ?? "").toLowerCase().includes(term),
      ),
  );

  return (
    <div className="space-y-3">
      <FilterRow
        options={LISTING_TAB_STATUSES.map((s) => [s, LISTING_STATUS_LABEL[s]] as [string, string])}
        value={status}
        onChange={(v) => setStatus(v as ListingStatus)}
        counts={{ [status]: query.data?.length ?? 0 }}
      />
      <SearchBox value={q} onChange={setQ} placeholder="Tìm theo tiêu đề, mô tả, người bán, UID…" />

      {query.isLoading ? (
        <LoadingSpinner className="py-10" />
      ) : query.error ? (
        <ErrorBox message={(query.error as Error).message} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={`Không có tin nào ở "${LISTING_STATUS_LABEL[status]}"`}
          description={term ? "Thử bỏ bớt từ khoá tìm kiếm." : "Hàng chờ này đang trống."}
        />
      ) : (
        <div className="space-y-2">
          {rows.map((l) => {
            const featuredLeft = timeLeft(l.featured_until);
            const details = Object.entries(l.details ?? {});
            return (
              <div key={l.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex gap-3">
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {l.images[0] && <Image src={l.images[0]} alt="" fill sizes="80px" className="object-cover" unoptimized />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-bold text-foreground">{l.title}</p>
                    <p className="font-heading text-base font-black text-primary">
                      {formatVnd(l.price)}
                      {l.negotiable && (
                        <span className="ml-1.5 text-[10px] font-semibold text-muted-foreground">có thương lượng</span>
                      )}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground">
                      <span className="rounded bg-muted px-1.5 py-0.5 font-bold">{LISTING_KIND_LABEL[l.kind]}</span>
                      <span>{l.seller?.display_name ?? "—"}</span>
                      {l.seller && <span>· {l.seller.orders_done} đơn xong</span>}
                      <span>· đăng {timeAgo(l.created_at)}</span>
                      {l.bumped_at && <span>· đẩy {timeAgo(l.bumped_at)}</span>}
                      <span className="flex items-center gap-0.5">· <Eye className="size-3" /> {l.views}</span>
                      {l.game_uid && <span>· UID {l.game_uid}</span>}
                      {featuredLeft && (
                        <span className="flex items-center gap-0.5 font-bold text-amber-500">
                          · <Flame className="size-3" /> nổi bật {featuredLeft}
                        </span>
                      )}
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

                {details.length > 0 && (
                  <dl className="mt-2 grid gap-x-4 border-t border-border pt-2 text-[11px] sm:grid-cols-2">
                    {details.map(([k, v]) => (
                      <Field key={k} label={k} value={String(v)} />
                    ))}
                  </dl>
                )}

                {l.reject_reason && (
                  <p className="mt-2 rounded-lg border border-red-500/30 bg-red-500/5 px-2.5 py-1.5 text-[11px] text-red-500">
                    Lý do từ chối đã gửi người bán: {l.reject_reason}
                  </p>
                )}

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
                  {l.status !== "active" && l.status !== "sold" && l.status !== "reserved" && (
                    <ActionBtn tone="ok" disabled={busy === l.id} onClick={() => void review(l.id, "active")}>
                      <Check className="size-3.5" /> {l.status === "pending" ? "Duyệt lên sàn" : "Cho bán lại"}
                    </ActionBtn>
                  )}
                  {l.status === "pending" && (
                    <ActionBtn tone="bad" disabled={busy === l.id} onClick={() => void review(l.id, "rejected")}>
                      <X className="size-3.5" /> Từ chối
                    </ActionBtn>
                  )}
                  {l.status !== "hidden" && (
                    <ActionBtn tone="mute" disabled={busy === l.id} onClick={() => void review(l.id, "hidden")}>
                      <Ban className="size-3.5" /> Gỡ khỏi sàn
                    </ActionBtn>
                  )}
                  {l.status === "active" && !featuredLeft && (
                    <ActionBtn tone="mute" disabled={busy === l.id} onClick={() => void feature(l.id, 7)}>
                      <Sparkles className="size-3.5" /> Ghim nổi bật 7 ngày
                    </ActionBtn>
                  )}
                  {featuredLeft && (
                    <ActionBtn tone="mute" disabled={busy === l.id} onClick={() => void feature(l.id, 0)}>
                      <X className="size-3.5" /> Gỡ nhãn nổi bật
                    </ActionBtn>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Hàng chờ xin đẩy nổi bật ────────────────────────────────────────────────
/**
 * Khác tab "Tin đăng": ở đó tin có thể chưa lên sàn, còn ở đây tin đã bán bình
 * thường rồi — từ chối cũng không ảnh hưởng gì tới nó, chỉ là không được ghim.
 * Nên không hỏi lý do như lúc từ chối tin.
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
                {l.seller?.rating != null ? ` · ${l.seller.rating}★` : ""}
                {` · ${l.views} lượt xem · đăng ${timeAgo(l.created_at)}`}
                {l.featured_requested_at ? ` · xin ${timeAgo(l.featured_requested_at)}` : ""}
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
type OrderFilterKey = "active" | "stale" | "all" | OrderStatus;

function OrdersTab({
  query,
  canPing,
}: {
  query: ReturnType<typeof useQuery<OrdersPayload>>;
  canPing: boolean;
}) {
  const [filter, setFilter] = useState<OrderFilterKey>("active");
  const [q, setQ] = useState("");

  if (query.isLoading) return <LoadingSpinner className="py-10" />;
  if (query.error) return <ErrorBox message={(query.error as Error).message} />;

  const all = query.data?.orders ?? [];
  const unread = query.data?.unread ?? {};

  if (all.length === 0) {
    return <EmptyState icon={Store} title="Chưa có đơn nào" description="Chợ chưa phát sinh giao dịch." />;
  }

  const isActive = (o: ShopOrder) => !["completed", "cancelled"].includes(o.status);
  const byFilter = (o: ShopOrder) => {
    if (filter === "all") return true;
    if (filter === "active") return isActive(o);
    if (filter === "stale") return isActive(o) && isOrderStale(o);
    return o.status === filter;
  };

  const term = q.trim().toLowerCase();
  const rows = all
    .filter(byFilter)
    .filter(
      (o) =>
        !term ||
        [o.code, o.buyer_name, o.seller?.display_name, o.listing?.title].some((v) =>
          (v ?? "").toLowerCase().includes(term),
        ),
    );

  // Chỉ dựng chip cho trạng thái thực sự có đơn — bàn làm việc không cần hàng
  // chip rỗng nhắc rằng chợ có 9 trạng thái.
  const present = (Object.keys(ORDER_STATUS_LABEL) as OrderStatus[]).filter((s) =>
    all.some((o) => o.status === s),
  );
  const staleCount = all.filter((o) => isActive(o) && isOrderStale(o)).length;

  return (
    <div className="space-y-3">
      <FilterRow
        options={[
          ["active", "Đang chạy"],
          ...(staleCount > 0 ? ([["stale", "Đơn treo"]] as [string, string][]) : []),
          ...present.map((s) => [s, ORDER_STATUS_LABEL[s]] as [string, string]),
          ["all", "Tất cả"],
        ]}
        value={filter}
        onChange={(v) => setFilter(v as OrderFilterKey)}
        counts={{
          active: all.filter(isActive).length,
          stale: staleCount,
          all: all.length,
          ...Object.fromEntries(present.map((s) => [s, all.filter((o) => o.status === s).length])),
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[14rem] flex-1">
          <SearchBox value={q} onChange={setQ} placeholder="Tìm theo mã đơn, người mua, người bán, tin…" />
        </div>
        {canPing && staleCount > 0 && <PingStaleButton count={staleCount} />}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border py-10 text-center text-xs text-muted-foreground">
          Không có đơn nào khớp bộ lọc.
        </p>
      ) : (
        rows.map((o) => <OrderRow key={o.id} order={o} unread={unread[o.id] ?? 0} />)
      )}
    </div>
  );
}

/**
 * Chạy tay đúng cái cron vẫn quét mỗi 3 tiếng.
 *
 * Route tự chống lặp: đơn nhắc rồi thì trong 12 giờ sau bấm bao nhiêu lần cũng
 * không gửi lại, nên nút này an toàn để bấm khi đang sốt ruột.
 */
function PingStaleButton({ count }: { count: number }) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/cron/shop-stale-orders", { cache: "no-store" });
      const d = (await res.json()) as { pinged?: number; stale?: number; error?: string };
      if (!res.ok) { toast.error(d.error ?? "Không quét được."); return; }
      toast.success(
        d.pinged
          ? `Đã nhắc ${d.pinged}/${d.stale} đơn treo tới người phụ trách.`
          : "Không có đơn nào tới lượt nhắc — tất cả đều vừa được nhắc gần đây.",
      );
    } catch {
      toast.error("Lỗi mạng, thử lại.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={() => void run()}
      disabled={busy}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/5 px-3 py-1.5 text-xs font-bold text-red-500 transition hover:bg-red-500/10 disabled:opacity-60"
    >
      {busy ? <RefreshCw className="size-3.5 animate-spin" /> : <BellRing className="size-3.5" />}
      Nhắc {count} đơn treo
    </button>
  );
}

function OrderRow({ order: o, unread }: { order: ShopOrder; unread: number }) {
  const stale = isOrderStale(o);
  const idle = hoursSince(orderLastMoved(o));
  const step = orderStep(o.status);
  const limit = STALE_ORDER_HOURS[o.status];

  return (
    <Link
      href={`/shop/don-hang/${o.code}`}
      className={cn(
        "block rounded-2xl border bg-card p-3 transition hover:border-primary/40",
        stale ? "border-red-500/40 bg-red-500/[0.03]" : "border-border",
      )}
    >
      <div className="flex gap-3">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
          {o.listing?.images?.[0] && (
            <Image src={o.listing.images[0]} alt="" fill sizes="56px" className="object-cover" unoptimized />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[11px] font-black text-foreground">{o.code}</span>
            <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", ORDER_STATUS_COLOR[o.status])}>
              {ORDER_STATUS_LABEL[o.status]}
            </span>
            {unread > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-black text-white">
                <MessageSquare className="size-2.5" /> {unread}
              </span>
            )}
            {!o.agent_id && o.status === "pending_agent" && (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                chưa ai nhận
              </span>
            )}
          </div>

          <p className="line-clamp-1 text-xs font-bold text-foreground">{o.listing?.title ?? "Tin đã xoá"}</p>

          {step != null && <ProgressDots step={step} />}

          <p className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
            <span>Mua: <b className="text-foreground/80">{o.buyer_name}</b></span>
            <span>· Bán: <b className="text-foreground/80">{o.seller?.display_name ?? "—"}</b></span>
            <span>· tạo {timeAgo(o.created_at)}</span>
          </p>

          <p className={cn("text-[11px]", stale ? "font-bold text-red-500" : "text-muted-foreground")}>
            {["completed", "cancelled"].includes(o.status)
              ? ORDER_STATUS_HINT[o.status]
              : `Đang chờ ${ORDER_WAITING_ON[o.status]} · đứng yên ${formatHours(idle)}${
                  limit ? ` / ngưỡng ${limit}h` : ""
                }`}
          </p>
        </div>

        <div className="shrink-0 space-y-0.5 text-right">
          <p className="font-heading text-sm font-black text-primary">{formatVnd(o.amount)}</p>
          <p className="text-[10px] text-muted-foreground">phí {formatVndShort(o.fee)}</p>
          <p className="text-[10px] text-muted-foreground">bán nhận {formatVndShort(o.payout_amount)}</p>
        </div>
      </div>
    </Link>
  );
}

/** Thanh tiến độ 7 bước của một đơn — nhìn là biết đơn đã đi được bao xa. */
function ProgressDots({ step }: { step: number }) {
  return (
    <span className="flex items-center gap-1" aria-label={`Bước ${step}/${ORDER_STEPS.length}`}>
      {ORDER_STEPS.map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-1 flex-1 rounded-full",
            i < step ? "bg-primary" : "bg-muted",
          )}
        />
      ))}
    </span>
  );
}

function formatHours(h: number): string {
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} phút`;
  if (h < 48) return `${Math.round(h)} giờ`;
  return `${Math.round(h / 24)} ngày`;
}

// ── Bảng công giao dịch viên ────────────────────────────────────────────────
type AgentStat = {
  agentId: string;
  name: string;
  role: string;
  active: number;
  stale: number;
  claimed: number;
  completed: number;
  cancelled: number;
  disputed: number;
  gmv: number;
  fee: number;
  avgClaimHours: number | null;
  avgCompleteHours: number | null;
  lastActiveAt: string | null;
};

type AgentDeskReport = {
  days: number;
  agents: AgentStat[];
  unclaimed: number;
  unclaimedStale: number;
  totalOrders: number;
};

const WINDOW_CHOICES = [7, 30, 90];

function AgentsTab() {
  const [days, setDays] = useState(30);
  const query = useQuery({
    queryKey: ["admin-shop", "agents", days],
    queryFn: () => getJson<AgentDeskReport>(`/api/shop/agents?days=${days}`),
    refetchInterval: 120_000,
  });

  const data = query.data;

  return (
    <div className="space-y-3">
      <FilterRow
        options={WINDOW_CHOICES.map((d) => [String(d), `${d} ngày`] as [string, string])}
        value={String(days)}
        onChange={(v) => setDays(Number(v))}
        counts={{}}
      />

      {query.isLoading ? (
        <LoadingSpinner className="py-10" />
      ) : query.error ? (
        <ErrorBox message={(query.error as Error).message} />
      ) : !data || data.agents.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="Chưa có ai nhận đơn"
          description={`Không có đơn nào được giao dịch viên nhận trong ${days} ngày qua.`}
        />
      ) : (
        <>
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
            <Stat label="Giao dịch viên có việc" icon={HandCoins} value={data.agents.length} tone="muted" />
            <Stat label="Đơn trong kỳ" icon={Store} value={data.totalOrders} tone="muted" />
            <Stat
              label="Chưa ai nhận" icon={Inbox} value={data.unclaimed}
              hint={data.unclaimedStale > 0 ? `${data.unclaimedStale} đơn đã quá ngưỡng chờ` : "Hàng chờ đang thông"}
              tone={data.unclaimedStale > 0 ? "danger" : "muted"}
            />
            <Stat
              label="Đơn treo đang ôm" icon={TimerReset}
              value={data.agents.reduce((s, a) => s + a.stale, 0)}
              tone={data.agents.some((a) => a.stale > 0) ? "warn" : "muted"}
            />
          </div>

          <div className="space-y-2">
            {data.agents.map((a) => {
              // Tỉ lệ tranh chấp tính trên số đơn đã nhận, không phải số đơn đã
              // xong: đơn đang chạy vẫn có thể đang tranh chấp.
              const disputeRate = a.claimed > 0 ? Math.round((a.disputed / a.claimed) * 100) : 0;
              return (
                <div
                  key={a.agentId}
                  className={cn(
                    "rounded-2xl border bg-card p-4",
                    a.stale > 0 ? "border-amber-500/40" : "border-border",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-foreground">
                      {a.name}
                      <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                        {a.role}
                      </span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {a.lastActiveAt ? `Chạm đơn lần cuối ${timeAgo(a.lastActiveAt)}` : "Chưa có hoạt động"}
                    </p>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-2 sm:grid-cols-4">
                    <Metric
                      label="Đang ôm" value={a.active}
                      sub={a.stale > 0 ? `${a.stale} đơn treo` : "không đơn nào treo"}
                      alert={a.stale > 0}
                    />
                    <Metric
                      label="Hoàn tất" value={a.completed}
                      sub={`${a.claimed} đơn đã nhận · huỷ ${a.cancelled}`}
                    />
                    <Metric
                      label="Nhận sau"
                      value={a.avgClaimHours != null ? `${a.avgClaimHours}h` : "—"}
                      sub="trung bình từ lúc đơn tạo"
                      alert={a.avgClaimHours != null && a.avgClaimHours > 2}
                    />
                    <Metric
                      label="Xong sau"
                      value={a.avgCompleteHours != null ? `${a.avgCompleteHours}h` : "—"}
                      sub="trung bình từ lúc nhận đơn"
                    />
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-2 text-[11px] text-muted-foreground">
                    <span>
                      Tiền đã chạy qua tay: <b className="text-foreground">{formatVnd(a.gmv)}</b>
                    </span>
                    <span>· phí thu <b className="text-foreground">{formatVnd(a.fee)}</b></span>
                    <span className={cn(a.disputed > 0 && disputeRate >= 20 && "font-bold text-red-500")}>
                      · tranh chấp <b className={a.disputed > 0 ? "text-red-500" : "text-foreground"}>{a.disputed}</b>
                      {a.claimed > 0 ? ` (${disputeRate}% số đơn nhận)` : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Trung bình tính trên các đơn <b>tạo trong {days} ngày qua</b>. &quot;Nhận sau&quot; là khoảng
            trống người mua phải ngồi đợi sau khi bấm đặt — đây là con số ảnh hưởng tới tỉ lệ bỏ đơn
            nhiều nhất.
          </p>
        </>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  alert,
}: {
  label: string;
  value: string | number;
  sub: string;
  alert?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("font-heading text-lg font-black", alert ? "text-amber-500" : "text-foreground")}>
        {value}
      </p>
      <p className="text-[10px] leading-tight text-muted-foreground">{sub}</p>
    </div>
  );
}

// ── Tranh chấp ──────────────────────────────────────────────────────────────
const DISPUTE_STATUS_LABEL: Record<string, string> = {
  open: "Mới mở",
  resolving: "Đang xử lý",
  refund_buyer: "Hoàn người mua",
  pay_seller: "Trả người bán",
  closed: "Đã đóng",
};

function DisputesTab({ query }: { query: ReturnType<typeof useQuery<DisputeRow[]>> }) {
  const [filter, setFilter] = useState<string>("open");

  if (query.isLoading) return <LoadingSpinner className="py-10" />;
  if (query.error) return <ErrorBox message={(query.error as Error).message} />;

  const all = query.data ?? [];
  if (all.length === 0) {
    return <EmptyState icon={AlertTriangle} title="Không có tranh chấp" description="Chưa ai khiếu nại đơn nào." />;
  }

  const rows =
    filter === "all"
      ? all
      : filter === "open"
        ? all.filter((d) => ["open", "resolving"].includes(d.status))
        : all.filter((d) => d.status === filter);

  return (
    <div className="space-y-2">
      <FilterRow
        options={[
          ["open", "Chưa xong"],
          ["refund_buyer", "Hoàn người mua"],
          ["pay_seller", "Trả người bán"],
          ["closed", "Đã đóng"],
          ["all", "Tất cả"],
        ]}
        value={filter}
        onChange={setFilter}
        counts={{
          open: all.filter((d) => ["open", "resolving"].includes(d.status)).length,
          refund_buyer: all.filter((d) => d.status === "refund_buyer").length,
          pay_seller: all.filter((d) => d.status === "pay_seller").length,
          closed: all.filter((d) => d.status === "closed").length,
          all: all.length,
        }}
      />

      {rows.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border py-10 text-center text-xs text-muted-foreground">
          Không có khiếu nại nào ở nhóm này.
        </p>
      )}

      {rows.map((d) => (
        <div key={d.id} className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-black text-red-500">
              {d.listing_title ?? "Đơn"} · {formatVnd(d.amount)}
              {d.order_code && <span className="ml-1.5 font-mono font-bold opacity-70">{d.order_code}</span>}
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
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
            <span>{PARTY_LABEL[d.opened_role]} mở {timeAgo(d.created_at)}</span>
            <span>· khiếu nại: <b>{DISPUTE_STATUS_LABEL[d.status] ?? d.status}</b></span>
            {d.order_status && (
              <span>· đơn: <b>{ORDER_STATUS_LABEL[d.order_status as OrderStatus] ?? d.order_status}</b></span>
            )}
            {d.resolved_at && <span>· xong {timeAgo(d.resolved_at)}</span>}
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

function Stat({
  label,
  value,
  hint,
  tone,
  icon: Icon,
  onClick,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone: "warn" | "info" | "danger" | "muted" | "ok";
  icon?: typeof Users;
  onClick?: () => void;
}) {
  const tones = {
    warn: "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400",
    info: "border-sky-500/30 bg-sky-500/5 text-sky-600 dark:text-sky-400",
    danger: "border-red-500/30 bg-red-500/5 text-red-500",
    ok: "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    muted: "border-border bg-card text-foreground",
  };
  const body = (
    <>
      <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide opacity-70">
        {Icon && <Icon className="size-3" />} {label}
      </p>
      <p className="font-heading text-xl font-black">{value}</p>
      {hint && <p className="text-[10px] leading-tight opacity-60">{hint}</p>}
    </>
  );
  const shell = cn("rounded-2xl border p-3 text-left", tones[tone]);

  // Ô nào bấm được thì phải là <button> thật, để bàn phím và trình đọc màn hình
  // dùng được — chứ không phải một cái <div> có onClick.
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(shell, "transition hover:border-primary/40 hover:shadow-sm")}>
      {body}
    </button>
  ) : (
    <div className={shell}>{body}</div>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-background py-1.5 pl-8 pr-8 text-xs outline-none focus:border-primary/50"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          aria-label="Xoá tìm kiếm"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      )}
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
