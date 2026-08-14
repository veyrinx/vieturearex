"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { ImagePicker } from "@/components/shop/image-picker";
import type { ShopSeller } from "@/lib/types/shop";

/**
 * Sửa thông tin một gian hàng.
 *
 * Dùng chung cho hai chỗ: chủ shop sửa gian hàng của mình (/shop/gian-hang) và
 * admin sửa hộ trong bàn quản lý chợ. Khác nhau đúng một điểm — tên thật gắn
 * với ảnh giấy tờ đã đối chiếu lúc duyệt, nên chỉ admin đổi được.
 *
 * Số tài khoản nhận tiền sửa được, nhưng mỗi lần đổi để lại một dòng trong
 * nhật ký truy cập: tiền của mọi đơn sau đó chảy về đấy.
 */
export function ShopProfileForm({
  seller,
  isAdmin = false,
  onSaved,
}: {
  seller: ShopSeller;
  isAdmin?: boolean;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [avatar, setAvatar] = useState<string[]>(seller.avatar_url ? [seller.avatar_url] : []);
  const [form, setForm] = useState({
    displayName: seller.display_name,
    realName: seller.real_name,
    phone: seller.phone,
    contact: seller.contact,
    bankName: seller.bank_name,
    bankAccount: seller.bank_account,
    bankHolder: seller.bank_holder,
    bio: seller.bio ?? "",
    note: seller.note ?? "",
  });

  const bankChanged =
    form.bankName !== seller.bank_name ||
    form.bankAccount !== seller.bank_account ||
    form.bankHolder !== seller.bank_holder;

  const submit = async () => {
    const required: [string, string][] = [
      ["Tên gian hàng", form.displayName],
      ["Số điện thoại", form.phone],
      ["Kênh liên hệ", form.contact],
      ["Ngân hàng", form.bankName],
      ["Số tài khoản", form.bankAccount],
      ["Chủ tài khoản", form.bankHolder],
    ];
    const empty = required.find(([, v]) => !v.trim());
    if (empty) return toast.error(`Thiếu ${empty[0].toLowerCase()}.`);

    setSaving(true);
    try {
      const res = await fetch(`/api/shop/sellers/${seller.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          realName: isAdmin ? form.realName : undefined,
          avatarUrl: avatar[0] ?? "",
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Không lưu được.");
        return;
      }
      toast.success("Đã lưu thông tin gian hàng.");
      onSaved?.();
      router.refresh();
    } catch {
      toast.error("Lỗi mạng, thử lại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-black uppercase tracking-wide text-foreground">
          Gian hàng công khai
        </p>

        <Field
          label="Tên gian hàng"
          value={form.displayName}
          onChange={(v) => setForm({ ...form, displayName: v })}
          placeholder="Shop Acc VIP"
        />

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">
            Giới thiệu gian hàng
          </span>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={4}
            placeholder="Bán acc từ 2022, giao dịch qua trung gian Arex, hỗ trợ đổi trả trong 24h…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
          />
          <span className="mt-1 block text-[10px] text-muted-foreground">
            Hiện trên trang gian hàng cho người mua đọc. Đừng để số điện thoại hay Zalo ở đây —
            giao dịch ngoài đơn thì Arex không xử lý được.
          </span>
        </label>

        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground">Ảnh đại diện gian hàng</p>
          <ImagePicker value={avatar} onChange={setAvatar} max={1} bucket="shop" label="Ảnh" />
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-black uppercase tracking-wide text-foreground">
          Thông tin liên hệ & nhận tiền
        </p>
        <p className="text-[11px] text-muted-foreground">
          Phần này chỉ giao dịch viên và admin nhìn thấy — không bao giờ hiện trên chợ.
        </p>

        {isAdmin ? (
          <Field
            label="Họ tên thật"
            value={form.realName}
            onChange={(v) => setForm({ ...form, realName: v })}
          />
        ) : (
          <div className="rounded-xl border border-border bg-muted/30 p-2.5 text-[11px] text-muted-foreground">
            Họ tên thật: <b className="text-foreground">{seller.real_name}</b> — khớp với giấy tờ đã
            duyệt nên không sửa ở đây được. Cần đổi thì nhắn admin.
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Số điện thoại" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Field
            label="Zalo / Facebook / Telegram"
            value={form.contact}
            onChange={(v) => setForm({ ...form, contact: v })}
          />
          <Field label="Ngân hàng" value={form.bankName} onChange={(v) => setForm({ ...form, bankName: v })} />
          <Field
            label="Số tài khoản"
            value={form.bankAccount}
            onChange={(v) => setForm({ ...form, bankAccount: v })}
          />
          <Field
            label="Chủ tài khoản"
            value={form.bankHolder}
            onChange={(v) => setForm({ ...form, bankHolder: v })}
          />
        </div>

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">
            Ghi chú cho admin
          </span>
          <textarea
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
          />
        </label>

        {bankChanged && (
          <p className="flex items-start gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5 text-[11px] text-amber-600 dark:text-amber-400">
            <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
            Bạn đang đổi tài khoản nhận tiền. Mọi đơn hoàn tất sau đây sẽ trả về tài khoản mới, và
            lần đổi này được ghi vào nhật ký của chợ.
          </p>
        )}
      </div>

      <button
        onClick={() => void submit()}
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-black uppercase text-white transition hover:opacity-90 disabled:opacity-60 dark:bg-amber-500"
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        Lưu thông tin gian hàng
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
      />
    </label>
  );
}
