"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ShieldCheck, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { calcFee, formatVnd } from "@/lib/constants/shop";
import type { ShopListing } from "@/lib/types/shop";

/**
 * Form đặt mua. Bắt buộc đủ thông tin liên hệ của người mua — giao dịch viên
 * cần gọi được cả hai bên khi có sự cố.
 */
export function BuyPanel({
  listing,
  signedIn,
  isOwnListing,
}: {
  listing: ShopListing;
  signedIn: boolean;
  isOwnListing: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", contact: "", bank: "" });

  const fee = calcFee(listing.price);

  if (isOwnListing) {
    return (
      <p className="rounded-2xl border border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground">
        Đây là tin của bạn.
      </p>
    );
  }

  if (listing.status !== "active") {
    return (
      <p className="rounded-2xl border border-border bg-muted/30 p-4 text-center text-xs font-semibold text-muted-foreground">
        {listing.status === "reserved" ? "Tin đang có người giao dịch." : "Tin này đã ngừng bán."}
      </p>
    );
  }

  if (!signedIn) {
    return (
      <Link
        href={`/login?next=/shop/${listing.id}`}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-black uppercase text-white transition hover:opacity-90 dark:bg-amber-500"
      >
        Đăng nhập để mua
      </Link>
    );
  }

  const submit = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.contact.trim()) {
      toast.error("Điền đủ họ tên, số điện thoại và kênh liên hệ.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/shop/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          buyerName: form.name,
          buyerPhone: form.phone,
          buyerContact: form.contact,
          buyerBank: form.bank,
        }),
      });
      const data = (await res.json()) as { code?: string; error?: string };
      if (!res.ok || !data.code) {
        toast.error(data.error ?? "Không tạo được đơn.");
        return;
      }
      toast.success("Đã tạo đơn! Giao dịch viên sẽ liên hệ ngay.");
      router.push(`/shop/don-hang/${data.code}`);
    } catch {
      toast.error("Lỗi mạng, thử lại.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-[11px] leading-relaxed text-muted-foreground">
        <p className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="size-4" /> Giao dịch có trung gian
        </p>
        <p className="mt-1">
          Bạn chuyển tiền cho <b>giao dịch viên Arex</b>, không chuyển thẳng cho người bán. Tiền chỉ
          được giải ngân sau khi bạn đăng nhập kiểm tra và bấm xác nhận.
        </p>
        <p className="mt-1">
          Phí trung gian <b>{formatVnd(fee)}</b> trừ vào tiền người bán nhận — bạn trả đúng{" "}
          <b>{formatVnd(listing.price)}</b>.
        </p>
      </div>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-black uppercase text-white transition hover:opacity-90 dark:bg-amber-500"
        >
          <ShoppingCart className="size-4" />
          Mua qua trung gian
        </button>
      ) : (
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-black uppercase tracking-wide text-foreground">
            Thông tin người mua
          </p>
          <Field label="Họ tên" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Nguyễn Văn A" />
          <Field label="Số điện thoại" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="09xxxxxxxx" />
          <Field label="Zalo / Facebook" value={form.contact} onChange={(v) => setForm({ ...form, contact: v })} placeholder="Link hoặc số Zalo" />
          <Field label="STK nhận hoàn tiền (nếu huỷ)" value={form.bank} onChange={(v) => setForm({ ...form, bank: v })} placeholder="Vietcombank - 001234... - NGUYEN VAN A" optional />

          <button
            onClick={submit}
            disabled={sending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-black uppercase text-white transition hover:opacity-90 disabled:opacity-60 dark:bg-amber-500"
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : <ShoppingCart className="size-4" />}
            Tạo đơn
          </button>
          <p className="text-center text-[10px] text-muted-foreground">
            Thông tin này chỉ hiện với giao dịch viên và người bán trong đơn.
          </p>
        </div>
      )}
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, optional,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; optional?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">
        {label} {!optional && <span className="text-red-500">*</span>}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary/50"
      />
    </label>
  );
}
