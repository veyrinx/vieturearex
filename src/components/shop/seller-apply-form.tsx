"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { ImagePicker } from "@/components/shop/image-picker";
import { SELLER_STATUS_LABEL } from "@/lib/constants/shop";
import type { ShopSeller } from "@/lib/types/shop";

/**
 * Đơn xin bán trên chợ. Thông tin thật + số tài khoản là bắt buộc: khi có
 * tranh chấp, đây là thứ duy nhất để đối chiếu và hoàn/giải ngân tiền.
 */
export function SellerApplyForm({ existing }: { existing: ShopSeller | null }) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [idImages, setIdImages] = useState<string[]>(existing?.id_images ?? []);
  const [form, setForm] = useState({
    displayName: existing?.display_name ?? "",
    realName: existing?.real_name ?? "",
    phone: existing?.phone ?? "",
    contact: existing?.contact ?? "",
    bankName: existing?.bank_name ?? "",
    bankAccount: existing?.bank_account ?? "",
    bankHolder: existing?.bank_holder ?? "",
    note: existing?.note ?? "",
  });

  // Đã có hồ sơ và không phải bị từ chối → chỉ hiện trạng thái
  if (existing && existing.status !== "rejected") {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-center">
        <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
          Trạng thái hồ sơ
        </p>
        <p className="mt-1 font-heading text-xl font-black text-primary dark:text-amber-400">
          {SELLER_STATUS_LABEL[existing.status]}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {existing.status === "pending" && "Admin đang xem hồ sơ của bạn. Thường trong vòng 24 giờ."}
          {existing.status === "approved" && "Bạn đã được duyệt — có thể đăng tin bán ngay."}
          {existing.status === "suspended" && `Hồ sơ đang bị tạm khoá. ${existing.reject_reason ?? ""}`}
        </p>
      </div>
    );
  }

  const submit = async () => {
    const required = ["displayName", "realName", "phone", "contact", "bankName", "bankAccount", "bankHolder"] as const;
    if (required.some((k) => !form[k].trim())) {
      toast.error("Điền đủ các ô có dấu *.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/shop/sellers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, idImages }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Gửi hồ sơ thất bại.");
        return;
      }
      toast.success("Đã gửi hồ sơ. Chờ admin duyệt nhé!");
      router.refresh();
    } catch {
      toast.error("Lỗi mạng, thử lại.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {existing?.status === "rejected" && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-500">
          Hồ sơ trước bị từ chối: {existing.reject_reason || "không nêu lý do"}. Bạn có thể sửa và gửi lại.
        </p>
      )}

      <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-black uppercase tracking-wide text-foreground">Thông tin người bán</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tên hiển thị trên chợ" value={form.displayName} onChange={(v) => setForm({ ...form, displayName: v })} placeholder="Shop Acc Uy Tín" />
          <Field label="Họ tên thật" value={form.realName} onChange={(v) => setForm({ ...form, realName: v })} placeholder="Nguyễn Văn A" />
          <Field label="Số điện thoại" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="09xxxxxxxx" />
          <Field label="Zalo / Facebook" value={form.contact} onChange={(v) => setForm({ ...form, contact: v })} placeholder="Link hoặc số Zalo" />
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-black uppercase tracking-wide text-foreground">
          Tài khoản nhận tiền
        </p>
        <p className="text-[11px] text-muted-foreground">
          Trung gian chuyển tiền về đúng tài khoản này sau khi đơn hoàn tất. Tên chủ tài khoản phải
          trùng họ tên thật ở trên.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Ngân hàng" value={form.bankName} onChange={(v) => setForm({ ...form, bankName: v })} placeholder="Vietcombank" />
          <Field label="Số tài khoản" value={form.bankAccount} onChange={(v) => setForm({ ...form, bankAccount: v })} placeholder="00123456789" />
          <Field label="Chủ tài khoản" value={form.bankHolder} onChange={(v) => setForm({ ...form, bankHolder: v })} placeholder="NGUYEN VAN A" />
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-black uppercase tracking-wide text-foreground">Ảnh xác minh</p>
        <ImagePicker
          value={idImages}
          onChange={setIdImages}
          max={4}
          label="Tải ảnh"
          // bucket mặc định là "shop-private" — giấy tờ không được nằm ở link công khai.
          hint="Ảnh CCCD/giấy tờ hoặc ảnh chụp lịch sử giao dịch cũ. Lưu ở kho riêng, chỉ admin mở được và mỗi lượt xem đều bị ghi log."
        />
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Giới thiệu thêm</span>
          <textarea
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            rows={3}
            placeholder="Bạn bán loại hàng gì, đã bán bao lâu, kênh nào…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary/50"
          />
        </label>
      </div>

      <button
        onClick={submit}
        disabled={sending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-black uppercase text-white transition hover:opacity-90 disabled:opacity-60 dark:bg-amber-500"
      >
        {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Gửi hồ sơ xin bán
      </button>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">
        {label} <span className="text-red-500">*</span>
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
