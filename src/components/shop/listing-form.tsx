"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ImagePicker } from "@/components/shop/image-picker";
import { PriceGuide } from "@/components/shop/price-guide";
import {
  LISTING_KIND_LABEL,
  MAX_LISTING_IMAGES,
  MIN_PRICE,
  calcFee,
  calcPayout,
  formatVnd,
  type ListingKind,
} from "@/lib/constants/shop";
import { cn } from "@/lib/utils";

/**
 * Form đăng tin. Tin luôn qua duyệt trước khi lên chợ.
 *
 * `sellerId` cho biết đăng cho gian hàng nào — CTV có thể phụ nhiều shop, nên
 * không thể để server tự đoán. `shopName` chỉ có khi người đăng là CTV: cần
 * nhắc rõ tin này sẽ mang tên gian hàng nào, không phải tên họ.
 */
export function ListingForm({
  sellerId,
  shopName,
}: {
  sellerId?: string;
  shopName?: string | null;
} = {}) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [kind, setKind] = useState<ListingKind>("account");
  const [images, setImages] = useState<string[]>([]);
  const [form, setForm] = useState({ title: "", description: "", price: "", gameUid: "", negotiable: false });
  const [details, setDetails] = useState<{ k: string; v: string }[]>([
    { k: "Cấp độ", v: "" },
    { k: "Rank", v: "" },
  ]);

  const price = Number(form.price.replace(/\D/g, "")) || 0;

  const submit = async () => {
    if (form.title.trim().length < 8) return toast.error("Tiêu đề tối thiểu 8 ký tự.");
    if (form.description.trim().length < 20) return toast.error("Mô tả tối thiểu 20 ký tự.");
    if (price < MIN_PRICE) return toast.error(`Giá tối thiểu ${formatVnd(MIN_PRICE)}.`);
    if (images.length === 0) return toast.error("Cần ít nhất 1 ảnh chụp.");

    setSending(true);
    try {
      const res = await fetch("/api/shop/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerId,
          kind,
          title: form.title,
          description: form.description,
          price,
          negotiable: form.negotiable,
          gameUid: form.gameUid,
          images,
          details: Object.fromEntries(details.filter((d) => d.k.trim() && d.v.trim()).map((d) => [d.k, d.v])),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) return void toast.error(data.error ?? "Đăng tin thất bại.");
      toast.success("Đã gửi tin, chờ duyệt là lên chợ.");
      router.push(sellerId ? `/shop/tin-cua-toi?shop=${sellerId}` : "/shop/tin-cua-toi");
    } catch {
      toast.error("Lỗi mạng, thử lại.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {shopName && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5 text-[11px] text-amber-600 dark:text-amber-400">
          Bạn đang đăng với tư cách CTV của <b>{shopName}</b>. Tin lên chợ sẽ mang tên gian hàng
          này, và đơn phát sinh cũng thuộc về họ.
        </p>
      )}

      {/* Loại hàng */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-2 text-xs font-black uppercase tracking-wide text-foreground">Bán gì?</p>
        <div className="grid grid-cols-2 gap-2">
          {(["account", "item"] as ListingKind[]).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={cn(
                "rounded-xl border py-3 text-sm font-bold transition",
                kind === k
                  ? "border-primary/40 bg-primary/10 text-primary dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300"
                  : "border-border bg-muted/40 text-muted-foreground hover:border-primary/20",
              )}
            >
              {LISTING_KIND_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      {/* Nội dung tin */}
      <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Tiêu đề *</span>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Acc VIP 20 skin súng, rank Kim Cương"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Mô tả chi tiết *</span>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={6}
            placeholder="Ghi rõ: acc đã liên kết gì, đổi tên được chưa, có bao nhiêu skin/nhân vật, lý do bán…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Giá bán (VNĐ) *</span>
            <input
              inputMode="numeric"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value.replace(/\D/g, "") })}
              placeholder="500000"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">UID trong game</span>
            <input
              value={form.gameUid}
              onChange={(e) => setForm({ ...form, gameUid: e.target.value })}
              placeholder="123456789"
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

        <PriceGuide kind={kind} gameUid={form.gameUid} currentPrice={price} />

        {price >= MIN_PRICE && (
          <p className="rounded-xl border border-border bg-muted/30 p-2.5 text-[11px] text-muted-foreground">
            Người mua trả <b className="text-foreground">{formatVnd(price)}</b> · phí trung gian{" "}
            <b className="text-foreground">{formatVnd(calcFee(price))}</b> · bạn nhận{" "}
            <b className="text-emerald-600 dark:text-emerald-400">{formatVnd(calcPayout(price))}</b>
          </p>
        )}
      </div>

      {/* Ảnh */}
      <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-black uppercase tracking-wide text-foreground">Ảnh chụp *</p>
        <ImagePicker
          value={images}
          onChange={setImages}
          max={MAX_LISTING_IMAGES}
          required
          // Ảnh tin đăng phải xem được không cần đăng nhập → bucket công khai.
          bucket="shop"
          hint="Chụp màn hình trong game: kho đồ, nhân vật, rank, UID. Ảnh càng rõ càng nhanh được duyệt."
        />
      </div>

      {/* Thông số */}
      <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-black uppercase tracking-wide text-foreground">Thông số nhanh</p>
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
            onClick={() => setDetails([...details, { k: "", v: "" }])}
            className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
          >
            <Plus className="size-3" /> Thêm dòng
          </button>
        )}
      </div>

      <button
        onClick={submit}
        disabled={sending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-black uppercase text-white transition hover:opacity-90 disabled:opacity-60 dark:bg-amber-500"
      >
        {sending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        Đăng tin (chờ duyệt)
      </button>
    </div>
  );
}
