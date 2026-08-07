import { useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  EyeOff,
  Flame,
  PackageSearch,
  ReceiptText,
  Store,
  X,
} from "lucide-react";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Field,
  Segmented,
  Sheet,
  Skeleton,
  Textarea,
} from "@/components/ui";
import { errorMessage, useToast } from "@/components/toast";
import {
  useFeatureListing,
  useModerateListing,
  useModerateSeller,
  useShopDisputes,
  useShopListings,
  useShopOrders,
  useShopSellers,
} from "@/lib/queries";
import { timeAgo, truncate } from "@/lib/format";
import { SHOP_ORDER_STATUS_LABEL } from "@/types";
import { env } from "@/env";

/**
 * Bàn làm việc của chợ Arex trong Hub.
 *
 * Bốn việc thật sự cần làm trên điện thoại: duyệt tin, ngó đơn đang chạy, xử
 * lý tranh chấp và duyệt hồ sơ người bán. Những thao tác cần đọc kỹ giấy tờ
 * hoặc chuyển tiền vẫn nên làm trên web — ở đây chỉ đưa nút mở web.
 */

type Area = "tin" | "don" | "tranh-chap" | "nguoi-ban";

function money(amount: number): string {
  return `${Math.round(amount).toLocaleString("vi-VN")}đ`;
}

export function ShopScreen() {
  const [area, setArea] = useState<Area>("tin");

  return (
    <div className="space-y-4">
      <Segmented
        value={area}
        onChange={setArea}
        options={[
          { value: "tin", label: "Tin đăng" },
          { value: "don", label: "Đơn hàng" },
          { value: "tranh-chap", label: "Tranh chấp" },
          { value: "nguoi-ban", label: "Người bán" },
        ]}
      />
      {area === "tin" && <ListingsPanel />}
      {area === "don" && <OrdersPanel />}
      {area === "tranh-chap" && <DisputesPanel />}
      {area === "nguoi-ban" && <SellersPanel />}
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  );
}

// ── Tin đăng ────────────────────────────────────────────────────────────────
function ListingsPanel() {
  const toast = useToast();
  const [status, setStatus] = useState("pending");
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const listings = useShopListings(status);
  const moderate = useModerateListing();
  const feature = useFeatureListing();

  async function decide(id: string, next: "active" | "hidden") {
    try {
      await moderate.mutateAsync({ id, status: next });
      toast.success(next === "active" ? "Đã duyệt tin, tin lên chợ." : "Đã gỡ tin.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function confirmReject() {
    if (!rejecting) return;
    if (reason.trim().length < 5) return toast.error("Ghi lý do để người bán còn sửa.");
    try {
      await moderate.mutateAsync({ id: rejecting, status: "rejected", reason: reason.trim() });
      toast.success("Đã từ chối tin.");
      setRejecting(null);
      setReason("");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  const items = listings.data ?? [];

  return (
    <div className="space-y-3">
      <Segmented
        value={status}
        onChange={setStatus}
        options={[
          { value: "pending", label: "Chờ duyệt", count: status === "pending" ? items.length : undefined },
          { value: "active", label: "Đang bán" },
          { value: "rejected", label: "Từ chối" },
          { value: "hidden", label: "Đã ẩn" },
        ]}
      />

      {listings.isPending ? (
        <LoadingRows />
      ) : listings.isError ? (
        <ErrorState message={errorMessage(listings.error)} onRetry={() => void listings.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={PackageSearch} title="Không có tin nào" description="Hàng chờ đang trống." />
      ) : (
        items.map((l) => (
          <Card key={l.id} className="space-y-2.5">
            <div className="flex gap-3">
              {l.images[0] && (
                // Ảnh tin nằm ở bucket công khai nên hiện thẳng được.
                <img
                  src={l.images[0]}
                  alt=""
                  className="size-16 shrink-0 rounded-xl object-cover"
                  loading="lazy"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-mist-100">{truncate(l.title, 70)}</p>
                <p className="text-[13px] font-semibold text-cyan-glow">{money(l.price)}</p>
                <p className="mt-0.5 text-[12px] text-mist-500">
                  {l.seller?.display_name ?? "Người bán"} · {timeAgo(l.created_at)}
                </p>
              </div>
            </div>

            <p className="text-[12px] leading-relaxed text-mist-500">
              {truncate(l.description, 160)}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <Chip tone={l.kind === "account" ? "info" : "neutral"}>
                {l.kind === "account" ? "Tài khoản" : "Vật phẩm"}
              </Chip>
              {l.reject_reason && <Chip tone="danger">{truncate(l.reject_reason, 40)}</Chip>}
            </div>

            <div className="flex flex-wrap gap-2">
              {status !== "active" && (
                <Button size="sm" icon={Check} onClick={() => void decide(l.id, "active")}>
                  Duyệt
                </Button>
              )}
              {status === "pending" && (
                <Button
                  size="sm"
                  variant="outline"
                  icon={X}
                  onClick={() => { setRejecting(l.id); setReason(""); }}
                >
                  Từ chối
                </Button>
              )}
              {status === "active" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Flame}
                    onClick={async () => {
                      try {
                        await feature.mutateAsync({ id: l.id, days: 7 });
                        toast.success("Đã ghim nổi bật 7 ngày.");
                      } catch (error) {
                        toast.error(errorMessage(error));
                      }
                    }}
                  >
                    Nổi bật 7 ngày
                  </Button>
                  <Button size="sm" variant="outline" icon={EyeOff} onClick={() => void decide(l.id, "hidden")}>
                    Gỡ
                  </Button>
                </>
              )}
              <a
                href={`${env.apiBaseUrl}/shop/${l.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center rounded-xl border border-ink-700 px-3 text-[13px] text-mist-300"
              >
                Mở web
              </a>
            </div>
          </Card>
        ))
      )}

      <Sheet
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title="Từ chối tin đăng"
        footer={
          <Button block loading={moderate.isPending} onClick={() => void confirmReject()}>
            Gửi từ chối
          </Button>
        }
      >
        <Field label="Lý do" hint="Người bán đọc được dòng này để sửa và đăng lại." required>
          <Textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ảnh mờ không đọc được UID, mô tả thiếu thông tin liên kết…"
          />
        </Field>
      </Sheet>
    </div>
  );
}

// ── Đơn hàng ────────────────────────────────────────────────────────────────
const ORDER_TONE: Record<string, "neutral" | "ok" | "warn" | "danger" | "info"> = {
  pending_agent: "neutral",
  awaiting_payment: "warn",
  payment_review: "warn",
  holding: "info",
  delivering: "info",
  payout: "info",
  completed: "ok",
  disputed: "danger",
  cancelled: "neutral",
};

function OrdersPanel() {
  const [status, setStatus] = useState("all");
  const orders = useShopOrders(status);
  const items = orders.data ?? [];

  return (
    <div className="space-y-3">
      <Segmented
        value={status}
        onChange={setStatus}
        options={[
          { value: "all", label: "Tất cả" },
          { value: "pending_agent", label: "Chờ nhận" },
          { value: "holding", label: "Giữ tiền" },
          { value: "disputed", label: "Tranh chấp" },
        ]}
      />

      {orders.isPending ? (
        <LoadingRows />
      ) : orders.isError ? (
        <ErrorState message={errorMessage(orders.error)} onRetry={() => void orders.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={ReceiptText} title="Chưa có đơn nào" />
      ) : (
        items.map((o) => (
          <Card key={o.id} className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-mist-100">
                  {truncate(o.listing?.title ?? "Tin đã xoá", 60)}
                </p>
                <p className="text-[12px] text-mist-500">
                  {o.code} · {timeAgo(o.created_at)}
                </p>
              </div>
              <p className="shrink-0 text-[13px] font-semibold text-cyan-glow">{money(o.amount)}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Chip tone={ORDER_TONE[o.status] ?? "neutral"}>
                {SHOP_ORDER_STATUS_LABEL[o.status] ?? o.status}
              </Chip>
              <Chip>Phí {money(o.fee)}</Chip>
              {o.seller?.display_name && <Chip>{truncate(o.seller.display_name, 20)}</Chip>}
            </div>

            <a
              href={`${env.apiBaseUrl}/shop/don-hang/${o.code}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center rounded-xl border border-ink-700 px-3 text-[13px] text-mist-300"
            >
              Mở đơn trên web
            </a>
          </Card>
        ))
      )}
    </div>
  );
}

// ── Tranh chấp ──────────────────────────────────────────────────────────────
function DisputesPanel() {
  const [status, setStatus] = useState("open");
  const disputes = useShopDisputes(status);
  const items = disputes.data ?? [];

  return (
    <div className="space-y-3">
      <Segmented
        value={status}
        onChange={setStatus}
        options={[
          { value: "open", label: "Đang mở" },
          { value: "resolving", label: "Đang xử lý" },
          { value: "all", label: "Tất cả" },
        ]}
      />

      {disputes.isPending ? (
        <LoadingRows />
      ) : disputes.isError ? (
        <ErrorState message={errorMessage(disputes.error)} onRetry={() => void disputes.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="Không có tranh chấp nào" description="Chợ đang yên." />
      ) : (
        items.map((d) => (
          <Card key={d.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <Chip tone="danger">
                {d.opened_role === "buyer" ? "Người mua mở" : d.opened_role === "seller" ? "Người bán mở" : "GDV mở"}
              </Chip>
              {d.order_code && <Chip>{d.order_code}</Chip>}
              <span className="text-[12px] text-mist-500">{timeAgo(d.created_at)}</span>
            </div>
            <p className="text-[13px] leading-relaxed text-mist-300">{truncate(d.reason, 220)}</p>
            {d.order_code && (
              <a
                href={`${env.apiBaseUrl}/shop/don-hang/${d.order_code}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center rounded-xl border border-ink-700 px-3 text-[13px] text-mist-300"
              >
                Vào xử lý trên web
              </a>
            )}
          </Card>
        ))
      )}

      <p className="px-1 text-[12px] leading-relaxed text-mist-500">
        Chốt tranh chấp bắt buộc kèm ảnh chuyển/hoàn tiền nên chỉ làm được trên web — ở đây chỉ để
        nắm tình hình và vào nhanh.
      </p>
    </div>
  );
}

// ── Người bán ───────────────────────────────────────────────────────────────
function SellersPanel() {
  const toast = useToast();
  const [status, setStatus] = useState("pending");
  const sellers = useShopSellers(status);
  const moderate = useModerateSeller();
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  async function approve(id: string) {
    try {
      await moderate.mutateAsync({ id, status: "approved" });
      toast.success("Đã duyệt người bán.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function confirmReject() {
    if (!rejecting) return;
    if (reason.trim().length < 5) return toast.error("Ghi lý do giúp người ta biết đường sửa.");
    try {
      await moderate.mutateAsync({ id: rejecting, status: "rejected", reason: reason.trim() });
      toast.success("Đã từ chối hồ sơ.");
      setRejecting(null);
      setReason("");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  const items = sellers.data ?? [];

  return (
    <div className="space-y-3">
      <Segmented
        value={status}
        onChange={setStatus}
        options={[
          { value: "pending", label: "Chờ duyệt" },
          { value: "approved", label: "Đã duyệt" },
          { value: "suspended", label: "Tạm khoá" },
        ]}
      />

      {sellers.isPending ? (
        <LoadingRows />
      ) : sellers.isError ? (
        <ErrorState message={errorMessage(sellers.error)} onRetry={() => void sellers.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={Store} title="Không có hồ sơ nào" />
      ) : (
        items.map((s) => (
          <Card key={s.id} className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-medium text-mist-100">
                  {s.display_name}
                  {s.status === "approved" && <BadgeCheck className="size-3.5 text-ok" />}
                </p>
                <p className="text-[12px] text-mist-500">
                  {s.real_name} · {s.phone}
                </p>
              </div>
              <Chip tone={s.status === "approved" ? "ok" : s.status === "pending" ? "warn" : "danger"}>
                {s.status === "approved" ? "Đã duyệt" : s.status === "pending" ? "Chờ duyệt" : "Khoá"}
              </Chip>
            </div>

            <p className="text-[12px] text-mist-500">
              {s.bank_name} · {s.bank_account} · {s.orders_done} đơn thành công
            </p>

            <div className="flex flex-wrap gap-2">
              {s.status !== "approved" && (
                <Button size="sm" icon={Check} onClick={() => void approve(s.id)}>
                  Duyệt
                </Button>
              )}
              {s.status === "pending" && (
                <Button
                  size="sm"
                  variant="outline"
                  icon={X}
                  onClick={() => { setRejecting(s.id); setReason(""); }}
                >
                  Từ chối
                </Button>
              )}
              {s.status === "approved" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setRejecting(s.id); setReason(""); }}
                >
                  Tạm khoá
                </Button>
              )}
            </div>

            <p className="text-[11px] text-mist-500">
              Ảnh giấy tờ chỉ mở được trên web và mỗi lần mở đều bị ghi nhật ký.
            </p>
          </Card>
        ))
      )}

      <Sheet
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title={status === "approved" ? "Tạm khoá người bán" : "Từ chối hồ sơ"}
        footer={
          <Button
            block
            loading={moderate.isPending}
            onClick={() =>
              status === "approved"
                ? void (async () => {
                    if (!rejecting) return;
                    try {
                      await moderate.mutateAsync({
                        id: rejecting,
                        status: "suspended",
                        reason: reason.trim(),
                      });
                      toast.success("Đã tạm khoá.");
                      setRejecting(null);
                      setReason("");
                    } catch (error) {
                      toast.error(errorMessage(error));
                    }
                  })()
                : void confirmReject()
            }
          >
            Xác nhận
          </Button>
        }
      >
        <Field label="Lý do" required>
          <Textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ảnh giấy tờ không rõ, số tài khoản không khớp tên…"
          />
        </Field>
      </Sheet>
    </div>
  );
}
