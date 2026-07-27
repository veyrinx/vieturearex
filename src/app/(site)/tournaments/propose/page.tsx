"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Trophy, Send, CheckCircle2, Loader2, Info } from "lucide-react";
import { toast } from "sonner";

const FORMAT_OPTIONS = ["Single Elimination", "Double Elimination", "Round Robin", "Swiss"];
const MODE_OPTIONS = ["1v1", "2v2", "4v4", "Squad (Squad)"];
const SERVER_OPTIONS = ["VN", "SG/SEA", "Global"];

export default function ProposeTournamentPage() {
  const [form, setForm] = useState({
    name: "", description: "", format: "", mode: "", server: "VN",
    prize_pool: "", expected_teams: "", contact: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.description.trim()) {
      toast.error("Vui lòng điền tên và mô tả giải đấu.");
      return;
    }

    setLoading(true);
    try {
      // Post proposal as forum post
      const content = `
<h2>Đề xuất giải đấu: ${form.name}</h2>
<p><strong>Mô tả:</strong> ${form.description}</p>
<p><strong>Server:</strong> ${form.server}</p>
<p><strong>Thể thức:</strong> ${form.format || "Chưa xác định"}</p>
<p><strong>Chế độ:</strong> ${form.mode || "Chưa xác định"}</p>
<p><strong>Số đội dự kiến:</strong> ${form.expected_teams || "Chưa xác định"}</p>
${form.prize_pool ? `<p><strong>Giải thưởng:</strong> ${form.prize_pool}</p>` : ""}
${form.contact ? `<p><strong>Liên hệ:</strong> ${form.contact}</p>` : ""}
      `.trim();

      const res = await fetch("/api/forum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `[Đề xuất] ${form.name}`,
          content,
          category: "Sự kiện & Giải đấu",
        }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        toast.error(data.error ?? "Không thể gửi đề xuất. Vui lòng đăng nhập.");
        return;
      }
      setSubmitted(true);
    } catch {
      toast.error("Lỗi kết nối.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors";

  return (
    <div className="mx-auto max-w-2xl py-8 md:py-12 space-y-6">
      {/* Back */}
      <Link href="/tournaments"
        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
        <ArrowLeft className="size-3.5" /> Giải đấu
      </Link>

      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-7">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/8 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
        <div className="relative flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15">
            <Trophy className="size-6 text-amber-500" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">TMS</p>
            <h1 className="font-heading text-2xl font-black uppercase tracking-tight text-foreground md:text-3xl">
              Đề Xuất Giải Đấu
            </h1>
            <p className="text-sm text-muted-foreground">Gửi ý tưởng giải đấu đến ban tổ chức</p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="flex gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/8 p-4">
        <Info className="mt-0.5 size-4 shrink-0 text-blue-500" />
        <div className="text-sm text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">Lưu ý khi đề xuất</p>
          <ul className="list-disc pl-4 text-xs space-y-0.5">
            <li>Đề xuất sẽ được đăng lên diễn đàn để cộng đồng thảo luận</li>
            <li>Ban tổ chức sẽ xem xét và liên hệ qua forum hoặc thông tin bạn cung cấp</li>
            <li>Giải đấu cần tối thiểu 4 đội tham gia để được xét duyệt</li>
          </ul>
        </div>
      </div>

      {submitted ? (
        <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/8 p-10 text-center space-y-4">
          <div className="flex size-16 mx-auto items-center justify-center rounded-full bg-emerald-500/15">
            <CheckCircle2 className="size-8 text-emerald-500" />
          </div>
          <div>
            <p className="font-heading text-xl font-bold text-emerald-600 dark:text-emerald-400">Đề xuất đã được gửi!</p>
            <p className="mt-1 text-sm text-muted-foreground">Bài đề xuất đã được đăng lên diễn đàn. Ban tổ chức sẽ xem xét sớm nhất có thể.</p>
          </div>
          <div className="flex justify-center gap-3">
            <Link href="/community?category=Sự kiện & Giải đấu"
              className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition-colors">
              Xem trên diễn đàn
            </Link>
            <Link href="/tournaments"
              className="rounded-xl border border-border px-5 py-2 text-sm font-semibold hover:bg-muted transition-colors">
              Về giải đấu
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl border border-border bg-card p-6 md:p-8">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Tên giải đấu <span className="text-red-500">*</span>
            </label>
            <input type="text" value={form.name} onChange={set("name")}
              placeholder="VD: Arex Cup Season 1" className={inputCls} maxLength={100} required />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Mô tả / Ý tưởng <span className="text-red-500">*</span>
            </label>
            <textarea value={form.description} onChange={set("description")}
              placeholder="Mô tả ngắn về giải đấu, mục tiêu, đối tượng tham gia..." rows={4}
              className={`${inputCls} resize-none`} required />
          </div>

          {/* Server + Mode */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Server</label>
              <select value={form.server} onChange={set("server")} className={inputCls}>
                {SERVER_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Chế độ</label>
              <select value={form.mode} onChange={set("mode")} className={inputCls}>
                <option value="">Chưa xác định</option>
                {MODE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Thể thức</label>
              <select value={form.format} onChange={set("format")} className={inputCls}>
                <option value="">Chưa xác định</option>
                {FORMAT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          {/* Prize + Teams */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Giải thưởng (nếu có)</label>
              <input type="text" value={form.prize_pool} onChange={set("prize_pool")}
                placeholder="VD: 500K VND, skin..." className={inputCls} maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Số đội dự kiến</label>
              <input type="text" value={form.expected_teams} onChange={set("expected_teams")}
                placeholder="VD: 8, 16, 32..." className={inputCls} maxLength={20} />
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Thông tin liên hệ</label>
            <input type="text" value={form.contact} onChange={set("contact")}
              placeholder="Discord, Zalo, Facebook..." className={inputCls} maxLength={200} />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">Đề xuất sẽ được đăng lên diễn đàn công khai</p>
            <button type="submit" disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-amber-600 hover:shadow-lg hover:shadow-amber-500/20 disabled:opacity-60">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {loading ? "Đang gửi..." : "Gửi đề xuất"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
