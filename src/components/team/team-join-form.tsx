"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Mail, Phone, User, Sparkles, MessageSquare, Facebook, Instagram, MessageCircle } from "lucide-react";
import type { TeamJoinConfig } from "@/lib/utils/site-settings";

type Props = { token: string; config: TeamJoinConfig };

export function TeamJoinForm({ token, config }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    display_name: "",
    email: "",
    phone: "",
    applied_role: config.roleOptions[0] ?? "",
    application_note: "",
    facebook_url: "",
    instagram_url: "",
    tiktok_url: "",
    discord_url: "",
    zalo_url: "",
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.display_name.trim() || !form.email.trim()) {
      toast.error("Vui lòng nhập tên và email.");
      return;
    }
    if (config.requirePhone && !form.phone.trim()) {
      toast.error("Vui lòng nhập số điện thoại.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/team-join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...form, email: form.email.trim().toLowerCase() }),
      });
      const data = (await res.json()) as { error?: string; status?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Không thể gửi yêu cầu.");
        return;
      }
      setDone(true);
    } catch {
      toast.error("Lỗi mạng.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <section className="w-full max-w-md rounded-3xl border border-border bg-card p-10 text-center shadow-xl">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-500/10">
            <ShieldCheck className="size-7 text-emerald-500" />
          </div>
          <h1 className="font-heading text-xl font-bold uppercase tracking-[0.06em]">Đã gửi yêu cầu</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{config.successMessage}</p>
          <p className="mt-3 text-sm font-semibold text-foreground">{form.email}</p>
          <Button onClick={() => router.push("/")} className="mt-6 rounded-xl">Về trang chủ</Button>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-start justify-center px-4 py-10">
      <section className="w-full max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-xl md:p-8">
        <header className="mb-6 text-center">
          <h1 className="font-heading text-2xl font-bold uppercase tracking-[0.06em] md:text-3xl">{config.title}</h1>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground md:text-sm">{config.subtitle}</p>
        </header>

        <form onSubmit={onSubmit} className="space-y-5">
          <fieldset className="space-y-3">
            <legend className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              <User className="size-3.5" /> Thông tin cơ bản
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tên hiển thị *">
                <Input value={form.display_name} onChange={(e) => set("display_name", e.target.value)} maxLength={80} className="h-10" />
              </Field>
              <Field label="Email liên hệ *" icon={<Mail className="size-3.5" />}>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} maxLength={120} className="h-10" />
              </Field>
              <Field label={`Số điện thoại${config.requirePhone ? " *" : ""}`} icon={<Phone className="size-3.5" />}>
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={20} placeholder="0xxxxxxxxx" className="h-10" />
              </Field>
              <Field label="Vị trí muốn ứng tuyển" icon={<Sparkles className="size-3.5" />}>
                <select
                  value={form.applied_role}
                  onChange={(e) => set("applied_role", e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {config.roleOptions.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </Field>
            </div>
          </fieldset>

          <Field label="Giới thiệu về bạn (kinh nghiệm, kỹ năng, lý do…)" icon={<MessageSquare className="size-3.5" />}>
            <textarea
              value={form.application_note}
              onChange={(e) => set("application_note", e.target.value.slice(0, config.noteMaxLength))}
              placeholder="Viết vài dòng để team biết thêm về bạn..."
              rows={4}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="mt-1 text-right text-[10px] text-muted-foreground">
              {form.application_note.length}/{config.noteMaxLength}
            </p>
          </Field>

          {config.showSocials && (
            <fieldset className="space-y-3">
              <legend className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                <Facebook className="size-3.5" /> Mạng xã hội (tuỳ chọn — giúp xác minh nhanh hơn)
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Facebook" icon={<Facebook className="size-3.5" />}>
                  <Input value={form.facebook_url} onChange={(e) => set("facebook_url", e.target.value)} placeholder="https://facebook.com/..." className="h-10" />
                </Field>
                <Field label="Instagram" icon={<Instagram className="size-3.5" />}>
                  <Input value={form.instagram_url} onChange={(e) => set("instagram_url", e.target.value)} placeholder="https://instagram.com/..." className="h-10" />
                </Field>
                <Field label="TikTok">
                  <Input value={form.tiktok_url} onChange={(e) => set("tiktok_url", e.target.value)} placeholder="https://tiktok.com/@..." className="h-10" />
                </Field>
                <Field label="Discord" icon={<MessageCircle className="size-3.5" />}>
                  <Input value={form.discord_url} onChange={(e) => set("discord_url", e.target.value)} placeholder="username hoặc invite link" className="h-10" />
                </Field>
                <Field label="Zalo">
                  <Input value={form.zalo_url} onChange={(e) => set("zalo_url", e.target.value)} placeholder="https://zalo.me/..." className="h-10" />
                </Field>
              </div>
            </fieldset>
          )}

          <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl text-sm font-bold tracking-wide">
            {loading ? "Đang gửi..." : "Gửi yêu cầu gia nhập"}
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            Bằng cách gửi, bạn đồng ý cho Arex liên hệ qua email/MXH bạn cung cấp.
          </p>
        </form>
      </section>
    </main>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}
