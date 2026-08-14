"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Plus, Save, TicketPercent, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ImagePicker } from "@/components/shop/image-picker";
import {
  LISTING_STATUS_LABEL,
  MAX_DISCOUNT_PERCENT,
  MAX_LISTING_IMAGES,
  MIN_DISCOUNT_PERCENT,
  MIN_PRICE,
  calcFee,
  calcPayout,
  discountPercent,
  formatVnd,
  isSaleLive,
  priceAfterPercent,
  timeLeft,
} from "@/lib/constants/shop";
import type { ShopListing } from "@/lib/types/shop";
import { cn } from "@/lib/utils";

/**
 * Sửa một tin đã đăng — nội dung và đợt giảm giá.
 *
 * Hai nhóm thay đổi cố ý tách rời nhau vì hậu quả khác nhau: sửa nội dung đẩy
 * tin về hàng chờ duyệt lại (giá gốc, ảnh, mô tả là thứ admin đã xét), còn bật
 * / tắt giảm giá thì có hiệu lực ngay — nếu không thì mọi đợt giảm đều biến
 * mất khỏi chợ đúng lúc nó cần được nhìn thấy nhất.
 */

/** Mốc hạn bấm nhanh. 0 = không hẹn ngày kết thúc. */
const SALE_DAY_PRESETS = [0, 3, 7, 14, 30];

export function ListingEditForm({
  listing,
  isAdmin = false,
}: {
  listing: ShopListing;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState<null | "content" | "sale" | "status">(null);

  const [images, setImages] = useState<string[]>(listing.images ?? []);
  const [form, setForm] = useState({
    title: listing.title,
    description: listing.description,
    price: String(listing.price),
    gameUid: listing.game_uid ?? "",
    negotiable: listing.negotiable,
  });
  const [details, setDetails] = useState<{ k: string; v: string }[]>(
    Object.entries(listing.details ?? {}).map(([k, v]) => ({ k, v: String(v) })),
  );

  const liveSale = isSaleLive(listing);
  const [saleOn, setSaleOn] = useState(liveSale);
  const [percent, setPercent] = useState(liveSale ? discountPercent(listing) : 10);
  const [saleDays, setSaleDays] = useState(0);

  const price = Number(form.price.replace(/\D/g, "")) || 0;
  const salePrice = priceAfterPercent(price, percent);

  const send = async (body: Record<string, unknown>, kind: "content" | "sale" | "status") => {
    setSaving(kind);
    try {
      const res = await fetch(`/api/shop/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Không lưu được.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      toast.error("Lỗi mạng, thử lại.");
      return false;
    } finally {
      setSaving(null);
    }
  };

  const saveContent = async () => {
    if (form.title.trim().length < 8) return toast.error("Tiêu đề tối thiểu 8 ký tự.");
    if (form.description.trim().length < 20) return toast.error("Mô tả tối thiểu 20 ký tự.");
    if (price < MIN_PRICE) return toast.error(`Giá tối thiểu ${formatVnd(MIN_PRICE)}.`);
    if (images.length === 0) return toast.error("Cần ít nhất 1 ảnh chụp.");

    const ok = await send(
      {
        title: form.title,
        description: form.description,
        price,
        gameUid: form.gameUid,
        negotiable: form.negotiable,
        images,
        details: Object.fromEntries(
          details.filter((d) => d.k.trim() && d.v.trim()).map((d) => [d.k, d.v]),
        ),
      },
      "content",
    );
    if (ok) {
      toast.success(
        isAdmin ? "Đã lưu tin." : "Đã lưu. Tin quay lại hàng chờ duyệt trước khi lên chợ lại.",
      );
    }
  };

  const saveSale = async () => {
    if (!saleOn) {
      if (await send({ salePrice: null }, "sale")) toast.success("Đã tắt giảm giá.");
      return;
    }
    if (price < MIN_PRICE) return toast.error("Đặt giá gốc hợp lệ trước đã.");
    // Mức giảm tính trên giá gốc đang nằm trong ô nhập; server thì đối chiếu với
    // giá đã lưu. Chưa lưu mà áp luôn thì hai bên lệch nhau.
    if (price !== listing.price) {
      return toast.error("Bạn vừa sửa giá gốc — bấm “Lưu nội dung” trước rồi hãy đặt giảm giá.");
    }
    const ok = await send({ salePrice, saleDays }, "sale");
    if (ok) {
      toast.success(
        saleDays > 0
          ? `Đang giảm ${percent}% trong ${saleDays} ngày.`
          : `Đang giảm ${percent}% tới khi bạn tắt.`,
      );
    }
  };

  const setStatus = async (status: "hidden" | "pending") => {
    const ok = await send({ status }, "status");
    if (ok) toast.success(status === "hidden" ? "Đã ẩn tin." : "Đã gửi tin duyệt lại.");
  };

  const remove = async () => {
    if (!window.confirm("Xoá hẳn tin này? Không khôi phục được.")) return;
    setSaving("status");
    try {
      const res = await fetch(`/api/shop/listings/${listing.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Không xoá được.");
        return;
      }
      toast.success("Đã xoá tin.");
      router.push("/shop/tin-cua-toi");
    } catch {
      toast.error("Lỗi mạng, thử lại.");
    } finally {
      setSaving(null);
    }
  };

  const busy = saving !== null;

  return (
    <div className="space-y-4">
      {/* Giảm giá — để trên cùng vì đây là thứ chủ shop mở trang này để làm
          nhiều nhất, và là thay đổi duy nhất có hiệu lực ngay. */}
      <div className="space-y-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-foreground">
            <TicketPercent className="size-4 text-red-500" /> Giảm giá
          </p>
          <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <input
              type="checkbox"
              checked={saleOn}
              onChange={(e) => setSaleOn(e.target.checked)}
              className="size-4 accent-red-500"
            />
            Đang giảm giá
          </label>
        </div>

        {liveSale && (
          <p className="text-[11px] text-muted-foreground">
            Hiện đang giảm <b className="text-red-500">{discountPercent(listing)}%</b> — còn{" "}
            <b className="text-foreground">{formatVnd(listing.sale_price ?? listing.price)}</b>
            {listing.sale_until ? ` · ${timeLeft(listing.sale_until) || "đã hết hạn"}` : " · không hẹn ngày kết thúc"}
          </p>
        )}

        {saleOn && (
          <>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                Mức giảm: <b className="text-red-500">{percent}%</b>
              </span>
              <input
                type="range"
                min={MIN_DISCOUNT_PERCENT}
                max={MAX_DISCOUNT_PERCENT}
                value={percent}
                onChange={(e) => setPercent(Number(e.target.value))}
                className="w-full accent-red-500"
              />
            </label>

            <div className="flex flex-wrap gap-1.5">
              {SALE_DAY_PRESETS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSaleDays(d)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                    saleDays === d
                      ? "border-red-500/50 bg-red-500/10 text-red-500"
                      : "border-border text-muted-foreground hover:border-red-500/40",
                  )}
                >
                  {d === 0 ? "Không hạn" : `${d} ngày`}
                </button>
              ))}
            </div>

            <p className="rounded-xl border border-border bg-background p-2.5 text-[11px] text-muted-foreground">
              Người mua trả{" "}
              <b className="text-red-500">{formatVnd(salePrice)}</b>{" "}
              <span className="line-through">{formatVnd(price)}</span> · phí trung gian{" "}
              <b className="text-foreground">{formatVnd(calcFee(salePrice))}</b> · bạn nhận{" "}
              <b className="text-emerald-600 dark:text-emerald-400">{formatVnd(calcPayout(salePrice))}</b>
            </p>
          </>
        )}

        <button
          onClick={() => void saveSale()}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 py-2.5 text-xs font-black uppercase text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {saving === "sale" ? <Loader2 className="size-4 animate-spin" /> : <TicketPercent className="size-4" />}
          {saleOn ? "Áp dụng giảm giá" : "Tắt giảm giá"}
        </button>
      </div>

      {/* Nội dung tin */}
      <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-black uppercase tracking-wide text-foreground">Nội dung tin</p>
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
            {LISTING_STATUS_LABEL[listing.status]}
          </span>
        </div>

        {!isAdmin && (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5 text-[11px] text-amber-600 dark:text-amber-400">
            Sửa nội dung sẽ đưa tin về hàng chờ duyệt lại. Muốn đổi giá bán tạm thời thì dùng ô
            giảm giá bên trên — tin vẫn đứng nguyên trên chợ.
          </p>
        )}

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Tiêu đề *</span>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Mô tả *</span>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={6}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Giá gốc (VNĐ) *</span>
            <input
              inputMode="numeric"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value.replace(/\D/g, "") })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">UID trong game</span>
            <input
              value={form.gameUid}
              onChange={(e) => setForm({ ...form, gameUid: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <input
            type="checkbox"
            checked={form.negotiable}
            onChange={(e) => setForm({ ...form, negotiable: e.target.checked })}
            className="size-4 accent-primary"
          />
          Có thể thương lượng giá
        </label>

        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground">Ảnh chụp *</p>
          <ImagePicker
            value={images}
            onChange={setImages}
            max={MAX_LISTING_IMAGES}
            required
            bucket="shop"
          />
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground">Thông số nhanh</p>
          {details.map((d, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={d.k}
                onChange={(e) => setDetails(details.map((x, j) => (j === i ? { ...x, k: e.target.value } : x)))}
                placeholder="Tên mục"
                className="w-2/5 rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary/50"
              />
              <input
                value={d.v}
                onChange={(e) => setDetails(details.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)))}
                placeholder="Giá trị"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary/50"
              />
              <button
                type="button"
                onClick={() => setDetails(details.filter((_, j) => j !== i))}
                className="rounded-lg border border-border px-2 text-muted-foreground transition hover:border-red-500/40 hover:text-red-500"
                aria-label="Xoá dòng"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
          {details.length < 12 && (
            <button
              type="button"
              onClick={() => setDetails([...details, { k: "", v: "" }])}
              className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
            >
              <Plus className="size-3" /> Thêm dòng
            </button>
          )}
        </div>

        <button
          onClick={() => void saveContent()}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-black uppercase text-white transition hover:opacity-90 disabled:opacity-60 dark:bg-amber-500"
        >
          {saving === "content" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Lưu nội dung
        </button>
      </div>

      {/* Ẩn / mở lại / xoá */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-4">
        {listing.status !== "hidden" ? (
          <button
            onClick={() => void setStatus("hidden")}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition hover:border-amber-500/40 hover:text-amber-500 disabled:opacity-60"
          >
            <EyeOff className="size-3.5" /> Ẩn tin
          </button>
        ) : (
          <button
            onClick={() => void setStatus("pending")}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition hover:border-emerald-500/40 hover:text-emerald-500 disabled:opacity-60"
          >
            <Eye className="size-3.5" /> Mở bán lại (chờ duyệt)
          </button>
        )}
        <button
          onClick={() => void remove()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition hover:border-red-500/40 hover:text-red-500 disabled:opacity-60"
        >
          <Trash2 className="size-3.5" /> Xoá tin
        </button>
      </div>
    </div>
  );
}
