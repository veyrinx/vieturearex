"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Send } from "lucide-react";

const FORMAT_OPTIONS = [
  { value: "battle_royale", label: "Battle Royale" },
  { value: "clash_squad", label: "Clash Squad" },
  { value: "lone_wolf", label: "Lone Wolf" },
  { value: "mixed", label: "Kết hợp" },
];

type Field = {
  name: string; format: string; estimated_date: string;
  max_teams: string; prize_pool: string;
  contact_name: string; contact_discord: string; contact_email: string;
  notes: string;
};

const EMPTY: Field = {
  name: "", format: "battle_royale", estimated_date: "",
  max_teams: "16", prize_pool: "",
  contact_name: "", contact_discord: "", contact_email: "",
  notes: "",
};

export function TournamentRequestForm() {
  const [fields, setFields] = useState<Field>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof Field) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const res = await fetch("/api/tournament-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...fields, max_teams: Number(fields.max_teams) }),
    });
    const json = await res.json() as { error?: string };
    setSubmitting(false);
    if (!res.ok) { toast.error(json.error ?? "Không thể gửi yêu cầu."); return; }
    setDone(true);
    toast.success("Đã gửi yêu cầu! Ban tổ chức sẽ liên hệ sớm.");
  };

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <CheckCircle2 className="size-12 text-emerald-500" />
        <p className="font-heading text-lg font-black text-foreground">Đã gửi yêu cầu thành công!</p>
        <p className="text-sm text-muted-foreground">Ban tổ chức Arex sẽ liên hệ với bạn qua Discord hoặc email trong vòng 24–48 giờ.</p>
        <button onClick={() => { setFields(EMPTY); setDone(false); }}
          className="rounded-xl border border-border px-5 py-2 text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-colors">
          Gửi yêu cầu khác
        </button>
      </div>
    );
  }

  const inputCls = "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/60 focus:outline-none transition-colors";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Tên giải đấu <span className="text-destructive">*</span></label>
          <input required value={fields.name} onChange={set("name")} placeholder="VD: Arex Open Cup #1" className={inputCls} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Thể thức <span className="text-destructive">*</span></label>
          <select required value={fields.format} onChange={set("format")} className={inputCls}>
            {FORMAT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Ngày dự kiến <span className="text-destructive">*</span></label>
          <input required type="date" value={fields.estimated_date} onChange={set("estimated_date")} className={inputCls} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Số team tối đa <span className="text-destructive">*</span></label>
          <select required value={fields.max_teams} onChange={set("max_teams")} className={inputCls}>
            {[8, 12, 16, 24, 32, 48, 64].map((n) => <option key={n} value={n}>{n} team</option>)}
          </select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-bold text-foreground">Giải thưởng (tùy chọn)</label>
          <input value={fields.prize_pool} onChange={set("prize_pool")} placeholder="VD: 500.000đ, skin, kim cương..." className={inputCls} />
        </div>
      </div>

      <div className="border-t border-border pt-4 space-y-1">
        <p className="text-xs font-bold text-foreground">Thông tin liên hệ</p>
        <p className="text-[11px] text-muted-foreground">Ban tổ chức sẽ liên hệ qua Discord hoặc email.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Tên của bạn <span className="text-destructive">*</span></label>
          <input required value={fields.contact_name} onChange={set("contact_name")} placeholder="Tên / Nick" className={inputCls} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Discord <span className="text-destructive">*</span></label>
          <input required value={fields.contact_discord} onChange={set("contact_discord")} placeholder="username#0000" className={inputCls} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Email</label>
          <input type="email" value={fields.contact_email} onChange={set("contact_email")} placeholder="email@example.com" className={inputCls} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-foreground">Ghi chú thêm</label>
        <textarea rows={3} value={fields.notes} onChange={set("notes")}
          placeholder="Thông tin bổ sung, yêu cầu đặc biệt, kinh nghiệm tổ chức..."
          className={`${inputCls} resize-none`} />
      </div>

      <button type="submit" disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity">
        {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        {submitting ? "Đang gửi..." : "Gửi yêu cầu tổ chức giải đấu"}
      </button>
    </form>
  );
}
