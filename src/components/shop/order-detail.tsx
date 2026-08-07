"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle, ArrowRight, Ban, CheckCircle2, Copy, Eye, EyeOff, KeyRound, Loader2,
  RefreshCw, ShieldCheck, Star, User,
} from "lucide-react";
import { toast } from "sonner";
import { ImagePicker } from "@/components/shop/image-picker";
import { OrderChat } from "@/components/shop/order-chat";
import {
  CANCELLABLE_STATUSES,
  DISPUTABLE_STATUSES,
  ORDER_EVENT_LABEL,
  ORDER_STATUS_COLOR,
  ORDER_STATUS_HINT,
  ORDER_STATUS_LABEL,
  actionsFor,
  formatVnd,
  type OrderAction,
} from "@/lib/constants/shop";
import type { ShopDispute, ShopOrder, ShopOrderEvent, ShopReview, ViewerParty } from "@/lib/types/shop";
import { cn } from "@/lib/utils";

/**
 * Dòng nhật ký như server gửi xuống: `secret` luôn rỗng, chỉ có cờ cho biết ở
 * đó có gì và mình có quyền mở không (xem src/lib/server/shop-privacy.ts).
 */
type RedactedEvent = Omit<ShopOrderEvent, "secret"> & {
  secret: null;
  has_secret: boolean;
  can_reveal: boolean;
};

type Payload = {
  order: ShopOrder;
  events: RedactedEvent[];
  dispute: ShopDispute | null;
  review: ShopReview | null;
  party: ViewerParty;
};

/**
 * Màn hình một đơn: tiến độ, nhật ký kèm ảnh, và đúng những nút mà vai của
 * người đang xem được bấm ở bước hiện tại.
 */
export function OrderDetail({ initial }: { initial: Payload }) {
  const [data, setData] = useState(initial);
  const [pending, setPending] = useState<OrderAction | "cancel" | "dispute" | "resolve" | null>(null);
  const [message, setMessage] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [secret, setSecret] = useState({ username: "", password: "", note: "" });
  const [sending, setSending] = useState(false);

  const { order, events, dispute, review, party } = data;
  const actions = useMemo(() => (party ? actionsFor(order.status, party) : []), [order.status, party]);

  // Đơn đang chạy thì tự làm mới để hai bên thấy nhau thao tác
  useEffect(() => {
    if (["completed", "cancelled"].includes(order.status)) return;
    const t = setInterval(() => void refresh(true), 20_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.status]);

  const refresh = async (quiet = false) => {
    try {
      const res = await fetch(`/api/shop/orders/${order.code}`);
      const d = (await res.json()) as Payload & { error?: string };
      if (res.ok) setData(d);
      else if (!quiet) toast.error(d.error ?? "Không tải được đơn.");
    } catch {
      if (!quiet) toast.error("Lỗi mạng.");
    }
  };

  const send = async (action: string, extra?: Record<string, unknown>) => {
    setSending(true);
    try {
      const res = await fetch(`/api/shop/orders/${order.code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, message, images, ...extra }),
      });
      const d = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(d.error ?? "Không thực hiện được.");
        return;
      }
      toast.success("Đã cập nhật đơn.");
      setPending(null);
      setMessage("");
      setImages([]);
      setSecret({ username: "", password: "", note: "" });
      await refresh(true);
    } catch {
      toast.error("Lỗi mạng, thử lại.");
    } finally {
      setSending(false);
    }
  };

  const canCancel = party && CANCELLABLE_STATUSES.includes(order.status);
  const canDispute = party && party !== "admin" && DISPUTABLE_STATUSES.includes(order.status);
  const canResolve = party === "admin" && order.status === "disputed";

  return (
    <div className="space-y-4">
      {/* Trạng thái */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={cn("rounded-full border px-3 py-1 text-xs font-black", ORDER_STATUS_COLOR[order.status])}>
            {ORDER_STATUS_LABEL[order.status]}
          </span>
          <button
            onClick={() => void refresh()}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground transition hover:text-primary"
          >
            <RefreshCw className="size-3" /> Làm mới
          </button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {ORDER_STATUS_HINT[order.status]}
        </p>

        {order.status === "holding" && (
          <p className="mt-2 flex items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/5 p-2.5 text-[11px] font-semibold text-sky-600 dark:text-sky-400">
            <ShieldCheck className="size-4 shrink-0" />
            Trung gian đang giữ {formatVnd(order.amount)}. Tiền chỉ ra khỏi ví khi người mua xác nhận.
          </p>
        )}
      </div>

      {/* Tóm tắt đơn */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
            {order.listing?.images?.[0] && (
              <Image src={order.listing.images[0]} alt="" fill sizes="64px" className="object-cover" unoptimized />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <Link href={`/shop/${order.listing_id}`} className="line-clamp-2 text-sm font-bold text-foreground hover:text-primary">
              {order.listing?.title ?? "Tin đã xoá"}
            </Link>
            <p className="font-heading text-lg font-black text-primary dark:text-amber-400">
              {formatVnd(order.amount)}
            </p>
          </div>
        </div>

        <dl className="mt-3 grid gap-x-4 gap-y-1 border-t border-border pt-3 text-[11px] sm:grid-cols-2">
          <Row label="Mã đơn" value={order.code} copy />
          <Row label="Ngày tạo" value={new Date(order.created_at).toLocaleString("vi-VN")} />
          <Row label="Phí trung gian" value={formatVnd(order.fee)} />
          <Row label="Người bán nhận" value={formatVnd(order.payout_amount)} />
        </dl>

        {/* Thông tin hai bên — chỉ người trong đơn nhìn thấy */}
        <div className="mt-3 grid gap-2 border-t border-border pt-3 sm:grid-cols-2">
          <div className="rounded-xl bg-muted/40 p-2.5">
            <p className="flex items-center gap-1 text-[10px] font-black uppercase text-muted-foreground">
              <User className="size-3" /> Người mua
            </p>
            <p className="text-xs font-bold text-foreground">{order.buyer_name}</p>
            <p className="text-[11px] text-muted-foreground">{order.buyer_phone}</p>
            <p className="break-all text-[11px] text-muted-foreground">{order.buyer_contact}</p>
            {order.buyer_bank && <p className="mt-1 break-all text-[10px] text-muted-foreground">STK hoàn tiền: {order.buyer_bank}</p>}
          </div>
          <div className="rounded-xl bg-muted/40 p-2.5">
            <p className="flex items-center gap-1 text-[10px] font-black uppercase text-muted-foreground">
              <User className="size-3" /> Người bán
            </p>
            <p className="text-xs font-bold text-foreground">{order.seller?.display_name ?? "—"}</p>
            <p className="break-all text-[11px] text-muted-foreground">{order.seller?.contact ?? ""}</p>
            <p className="text-[11px] text-muted-foreground">{order.seller?.orders_done ?? 0} đơn thành công</p>
          </div>
        </div>
      </div>

      {/* Tranh chấp */}
      {dispute && dispute.status !== "closed" && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
          <p className="flex items-center gap-1.5 text-xs font-black uppercase text-red-500">
            <AlertTriangle className="size-4" /> Tranh chấp đang mở
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{dispute.reason}</p>
          {dispute.resolution && (
            <p className="mt-1 text-xs font-semibold text-foreground">Kết luận: {dispute.resolution}</p>
          )}
        </div>
      )}

      {/* Nút hành động */}
      {party && (
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-black uppercase tracking-wide text-foreground">
            Việc của bạn ({PARTY_LABEL[party]})
          </p>

          {actions.length === 0 && !canCancel && !canDispute && !canResolve && (
            <p className="text-xs text-muted-foreground">Chờ bên kia thao tác, bạn chưa cần làm gì.</p>
          )}

          <div className="flex flex-wrap gap-2">
            {actions.map((a) => (
              <button
                key={a.key}
                onClick={() => { setPending(a); setMessage(""); setImages([]); }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white transition hover:opacity-90 dark:bg-amber-500"
              >
                <ArrowRight className="size-3.5" /> {a.label}
              </button>
            ))}
            {canDispute && (
              <button
                onClick={() => { setPending("dispute"); setMessage(""); setImages([]); }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/40 px-3.5 py-2 text-xs font-bold text-red-500 transition hover:bg-red-500/10"
              >
                <AlertTriangle className="size-3.5" /> Báo lỗi / tranh chấp
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => { setPending("cancel"); setMessage(""); setImages([]); }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-xs font-bold text-muted-foreground transition hover:border-red-500/40 hover:text-red-500"
              >
                <Ban className="size-3.5" /> Huỷ đơn
              </button>
            )}
            {canResolve && (
              <button
                onClick={() => { setPending("resolve"); setMessage(""); setImages([]); }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-500 px-3.5 py-2 text-xs font-bold text-white transition hover:opacity-90"
              >
                <CheckCircle2 className="size-3.5" /> Chốt tranh chấp
              </button>
            )}
          </div>

          {/* Form của bước đang chọn */}
          {pending && (
            <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3">
              <p className="text-xs font-bold text-foreground">
                {typeof pending === "string"
                  ? { cancel: "Huỷ đơn", dispute: "Mở tranh chấp", resolve: "Chốt tranh chấp" }[pending]
                  : pending.label}
              </p>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder={placeholderFor(pending)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
              />

              {typeof pending !== "string" && pending.key === "deliver" && (
                <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
                  <p className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                    <KeyRound className="size-3.5" /> Thông tin bàn giao (chỉ người mua & giao dịch viên xem được)
                  </p>
                  <input
                    value={secret.username}
                    onChange={(e) => setSecret({ ...secret, username: e.target.value })}
                    placeholder="Tài khoản / email đăng nhập"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary/50"
                  />
                  <input
                    value={secret.password}
                    onChange={(e) => setSecret({ ...secret, password: e.target.value })}
                    placeholder="Mật khẩu"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary/50"
                  />
                </div>
              )}

              {typeof pending !== "string" && pending.images > 0 && (
                <ImagePicker
                  value={images}
                  onChange={setImages}
                  max={6}
                  required
                  hint={proofHintFor(pending.key)}
                />
              )}
              {typeof pending === "string" && (
                <ImagePicker
                  value={images}
                  onChange={setImages}
                  max={6}
                  required={pending === "resolve"}
                  hint={
                    pending === "resolve"
                      ? "Bắt buộc: ảnh chuyển tiền / hoàn tiền khi chốt tranh chấp."
                      : "Ảnh chứng minh (nếu có) giúp xử lý nhanh hơn."
                  }
                />
              )}

              {pending === "resolve" ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => void send("resolve", { outcome: "refund_buyer" })}
                    disabled={sending}
                    className="rounded-xl border border-border py-2.5 text-xs font-bold text-foreground transition hover:border-primary/40 disabled:opacity-60"
                  >
                    Hoàn tiền người mua
                  </button>
                  <button
                    onClick={() => void send("resolve", { outcome: "pay_seller" })}
                    disabled={sending}
                    className="rounded-xl bg-primary py-2.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-60 dark:bg-amber-500"
                  >
                    Trả tiền người bán
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setPending(null)}
                    className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-muted-foreground"
                  >
                    Thôi
                  </button>
                  <button
                    onClick={() =>
                      void send(typeof pending === "string" ? pending : pending.key, {
                        secret: typeof pending !== "string" && pending.key === "deliver" ? secret : undefined,
                      })
                    }
                    disabled={sending}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-60 dark:bg-amber-500"
                  >
                    {sending ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                    Xác nhận
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Hộp thoại ba bên */}
      {party && (
        <OrderChat
          code={order.code}
          party={party}
          closed={["completed", "cancelled"].includes(order.status)}
        />
      )}

      {/* Đánh giá người bán — chỉ người mua, sau khi đơn xong */}
      {order.status === "completed" && party === "buyer" && (
        <ReviewBox
          code={order.code}
          sellerName={order.seller?.display_name ?? "người bán"}
          existing={review}
          onDone={() => void refresh(true)}
        />
      )}

      {/* Nhật ký */}
      <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-black uppercase tracking-wide text-foreground">Nhật ký giao dịch</p>
        {events.map((e) => (
          <div key={e.id} className="border-l-2 border-border pl-3">
            <p className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="font-bold text-foreground">{ORDER_EVENT_LABEL[e.type]}</span>
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">
                {PARTY_LABEL[e.actor_role]}
              </span>
              <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString("vi-VN")}</span>
            </p>
            {e.message && <p className="mt-0.5 whitespace-pre-wrap text-xs text-muted-foreground">{e.message}</p>}

            {e.has_secret && <SecretBox code={order.code} event={e} />}

            {e.images.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {e.images.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="relative size-16 overflow-hidden rounded-lg border border-border">
                    <Image src={url} alt="" fill sizes="64px" className="object-cover" unoptimized />
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Thông tin đăng nhập bàn giao. Server không gửi kèm khi tải đơn — phải bấm
 * mới lấy, và mỗi lần bấm đều để lại dấu trong nhật ký truy cập. Màn hình này
 * tự làm mới 20 giây/lần nên nếu trả sẵn thì mật khẩu sẽ nằm trong trình duyệt
 * suốt buổi.
 */
function SecretBox({ code, event }: { code: string; event: RedactedEvent }) {
  const [secret, setSecret] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);

  if (!event.can_reveal) {
    return (
      <p className="mt-1 flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 p-2 text-[11px] text-muted-foreground">
        <EyeOff className="size-3.5 shrink-0" />
        Có thông tin bàn giao ở bước này — bạn không có quyền xem.
      </p>
    );
  }

  const reveal = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/shop/orders/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reveal_secret", eventId: event.id }),
      });
      const d = (await res.json()) as { secret?: Record<string, string>; error?: string };
      if (!res.ok || !d.secret) {
        toast.error(d.error ?? "Không mở được thông tin.");
        return;
      }
      setSecret(d.secret);
    } catch {
      toast.error("Lỗi mạng, thử lại.");
    } finally {
      setLoading(false);
    }
  };

  if (!secret) {
    return (
      <button
        onClick={() => void reveal()}
        disabled={loading}
        className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/5 px-2.5 py-1.5 text-[11px] font-bold text-amber-600 transition hover:bg-amber-500/10 disabled:opacity-60 dark:text-amber-400"
      >
        {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />}
        Hiện thông tin đăng nhập
      </button>
    );
  }

  return (
    <div className="mt-1 space-y-0.5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-[11px]">
      <p className="flex items-center gap-1 text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">
        <KeyRound className="size-3" /> Lượt xem này đã được ghi lại
      </p>
      {Object.entries(secret).map(([k, v]) => (
        <p key={k} className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">{k}</span>
          <button
            onClick={() => { void navigator.clipboard.writeText(v); toast.success("Đã copy"); }}
            className="inline-flex items-center gap-1 break-all font-mono font-semibold text-foreground hover:text-primary"
          >
            {v} <Copy className="size-3" />
          </button>
        </p>
      ))}
    </div>
  );
}

/** Chấm điểm người bán — mỗi đơn một lần, chỉ mở khi đơn đã hoàn tất. */
function ReviewBox({
  code,
  sellerName,
  existing,
  onDone,
}: {
  code: string;
  sellerName: string;
  existing: ShopReview | null;
  onDone: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  if (existing) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
        <p className="flex items-center gap-1.5 text-xs font-black uppercase text-emerald-600 dark:text-emerald-400">
          <Star className="size-4 fill-current" /> Bạn đã đánh giá {existing.rating}/5 sao
        </p>
        {existing.comment && <p className="mt-1 text-xs text-muted-foreground">{existing.comment}</p>}
      </div>
    );
  }

  const submit = async () => {
    setSending(true);
    try {
      const res = await fetch(`/api/shop/orders/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "review", rating, message: comment }),
      });
      const d = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(d.error ?? "Không gửi được đánh giá.");
        return;
      }
      toast.success("Cảm ơn bạn đã đánh giá!");
      onDone();
    } catch {
      toast.error("Lỗi mạng, thử lại.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-black uppercase tracking-wide text-foreground">
        Đánh giá {sellerName}
      </p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)} aria-label={`${n} sao`}>
            <Star
              className={cn(
                "size-6 transition",
                n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30",
              )}
            />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder="Người bán giao nhanh không, đúng mô tả không…"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
      />
      <button
        onClick={() => void submit()}
        disabled={sending}
        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-60 dark:bg-amber-500"
      >
        {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Star className="size-3.5" />}
        Gửi đánh giá
      </button>
    </div>
  );
}

const PARTY_LABEL: Record<string, string> = {
  buyer: "Người mua",
  seller: "Người bán",
  agent: "Giao dịch viên",
  admin: "Admin",
  system: "Hệ thống",
};

function placeholderFor(p: OrderAction | string): string {
  if (p === "cancel") return "Lý do huỷ đơn…";
  if (p === "dispute") return "Mô tả vấn đề: nhận thiếu gì, sai gì, bên kia làm gì…";
  if (p === "resolve") return "Kết luận xử lý…";
  switch ((p as OrderAction).key) {
    case "claim": return "Số tài khoản trung gian + nội dung chuyển khoản để người mua chuyển đúng.";
    case "pay": return "Ghi chú thêm (nếu có).";
    case "confirm_payment": return "Đã nhận đủ tiền lúc mấy giờ, tài khoản nào.";
    case "deliver": return "Hướng dẫn đăng nhập, lưu ý khi đổi mật khẩu…";
    case "received": return "Xác nhận đã đăng nhập được, đủ đồ như mô tả.";
    case "payout": return "Đã chuyển tiền cho người bán, mã giao dịch…";
    default: return "";
  }
}

function proofHintFor(key: string): string {
  switch (key) {
    case "pay": return "Bắt buộc: ảnh chụp màn hình chuyển khoản thành công (rõ số tiền + nội dung).";
    case "confirm_payment": return "Bắt buộc: ảnh biến động số dư chứng minh tiền đã vào.";
    case "deliver": return "Bắt buộc: ảnh chụp acc/vật phẩm lúc bàn giao (kho đồ, thông tin liên kết).";
    case "received": return "Bắt buộc: ảnh chụp bạn đã đăng nhập được / đã nhận vật phẩm trong game.";
    case "payout": return "Bắt buộc: ảnh chụp chuyển tiền cho người bán.";
    default: return "Đính kèm ảnh làm bằng chứng.";
  }
}

function Row({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-border/40 py-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold text-foreground">
        {copy ? (
          <button
            onClick={() => { void navigator.clipboard.writeText(value); toast.success("Đã copy mã đơn"); }}
            className="inline-flex items-center gap-1 hover:text-primary"
          >
            {value} <Copy className="size-3" />
          </button>
        ) : value}
      </dd>
    </div>
  );
}
