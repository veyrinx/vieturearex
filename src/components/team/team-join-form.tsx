"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Mail, Phone, User, Sparkles, MessageSquare, Facebook, Instagram, MessageCircle, ScrollText, AlertTriangle, Gamepad2, Plus, Trash2 } from "lucide-react";
import type { TeamJoinConfig } from "@/lib/utils/site-settings";
import { GAME_LIST } from "@/lib/constants/game-list";
import type { GameProfile } from "@/lib/types/content";

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
  const [games, setGames] = useState<GameProfile[]>([{ game: "free_fire", uid: "" }]);
  const [acceptTerms, setAcceptTerms] = useState(false);
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
    if (!acceptTerms) {
      toast.error("Bạn cần đồng ý với điều khoản team trước khi gửi.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/team-join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          ...form,
          email: form.email.trim().toLowerCase(),
          accept_terms: true,
          game_profiles: games
            .map((g) => ({
              game: g.game.trim(),
              custom_label: g.custom_label?.trim() || undefined,
              uid: g.uid.trim(),
              nickname: g.nickname?.trim() || undefined,
            }))
            .filter((g) => g.game && g.uid),
        }),
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
          <h1 className="font-heading text-xl font-black uppercase tracking-[0.06em]">Đã gửi yêu cầu</h1>
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
          <h1 className="font-heading text-2xl font-black uppercase tracking-[0.06em] md:text-3xl">{config.title}</h1>
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

          {/* Game đang chơi */}
          <fieldset className="space-y-3">
            <legend className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              <Gamepad2 className="size-3.5" /> ID game đang chơi (bắt buộc Free Fire — UID)
            </legend>
            <div className="space-y-2">
              {games.map((g, idx) => {
                const isOther = g.game === "other";
                const meta = GAME_LIST.find((x) => x.key === g.game);
                return (
                  <div key={idx} className="grid gap-2 rounded-xl border border-border bg-muted/30 p-2.5 sm:grid-cols-[140px_1fr_1fr_auto]">
                    <select
                      value={g.game}
                      onChange={(e) => {
                        const next = [...games];
                        next[idx] = { ...next[idx], game: e.target.value };
                        setGames(next);
                      }}
                      className="h-9 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {GAME_LIST.map((opt) => (
                        <option key={opt.key} value={opt.key}>{opt.label}</option>
                      ))}
                    </select>
                    {isOther ? (
                      <Input
                        value={g.custom_label ?? ""}
                        onChange={(e) => {
                          const next = [...games];
                          next[idx] = { ...next[idx], custom_label: e.target.value };
                          setGames(next);
                        }}
                        placeholder="Tên game"
                        maxLength={40}
                        className="h-9"
                      />
                    ) : (
                      <Input
                        value={g.nickname ?? ""}
                        onChange={(e) => {
                          const next = [...games];
                          next[idx] = { ...next[idx], nickname: e.target.value };
                          setGames(next);
                        }}
                        placeholder="Nickname trong game (tuỳ chọn)"
                        maxLength={60}
                        className="h-9"
                      />
                    )}
                    <Input
                      value={g.uid}
                      onChange={(e) => {
                        const next = [...games];
                        next[idx] = { ...next[idx], uid: e.target.value };
                        setGames(next);
                      }}
                      placeholder={meta?.hint ?? "ID / UID"}
                      maxLength={60}
                      className="h-9"
                    />
                    {games.length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setGames(games.filter((_, i) => i !== idx))}
                        className="h-9 gap-1 rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
              {games.length < 10 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setGames([...games, { game: "free_fire", uid: "" }])}
                  className="gap-1.5 rounded-xl text-xs"
                >
                  <Plus className="size-3.5" /> Thêm game khác
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Tối đa 10 game. ID này sẽ hiển thị trên hồ sơ team sau khi được duyệt.
            </p>
          </fieldset>

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

          {/* Điều khoản */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <div className="space-y-1.5">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                <ScrollText className="size-3.5" /> Điều khoản team
              </p>
              <p className="whitespace-pre-line text-xs leading-relaxed text-foreground/90">
                {config.termsText}
              </p>
            </div>
            <div className="space-y-1.5 rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-rose-500">
                <AlertTriangle className="size-3.5" /> Hậu quả nếu vi phạm
              </p>
              <p className="whitespace-pre-line text-xs leading-relaxed text-rose-700 dark:text-rose-300">
                {config.violationText}
              </p>
            </div>
            <label className="flex cursor-pointer items-start gap-2 pt-1">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5 size-4 cursor-pointer accent-primary"
              />
              <span className="text-xs leading-relaxed">
                Tôi đã đọc và đồng ý với toàn bộ điều khoản team Arex, hiểu rõ hậu quả nếu vi phạm
                và chịu trách nhiệm trước các hành vi của mình.
              </span>
            </label>
          </div>

          <Button
            type="submit"
            disabled={loading || !acceptTerms}
            className="h-11 w-full rounded-xl text-sm font-bold tracking-wide"
          >
            {loading ? "Đang gửi..." : "Gửi yêu cầu gia nhập"}
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            Yêu cầu sẽ qua 2 vòng: <span className="font-semibold">IT duyệt</span> → <span className="font-semibold">Admin duyệt cuối</span> → email kích hoạt gửi tới bạn.
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
