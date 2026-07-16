"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Brain, Plus, Trash2, Save, Loader2, Check } from "lucide-react";
import type { QuizQuestion } from "@/lib/constants/quiz";

type Row = QuizQuestion & { _id: string };
const uid = () => Math.random().toString(36).slice(2);
const emptyRow = (): Row => ({ _id: uid(), q: "", opts: ["", "", "", ""], ans: 0 });

export function QuizPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/quiz")
      .then((r) => (r.ok ? r.json() : { questions: [] }))
      .then((d) => setRows((d.questions ?? []).map((q: QuizQuestion) => ({ ...q, _id: uid() }))))
      .catch(() => toast.error("Không tải được câu hỏi."))
      .finally(() => setLoading(false));
  }, []);

  const patch = (id: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r._id === id ? { ...r, ...p } : r)));
  const setOpt = (id: string, i: number, val: string) =>
    setRows((rs) => rs.map((r) => (r._id === id ? { ...r, opts: r.opts.map((o, k) => (k === i ? val : o)) } : r)));

  async function save() {
    const questions = rows
      .map((r) => ({ q: r.q.trim(), opts: r.opts.map((o) => o.trim()).filter(Boolean), ans: r.ans }))
      .filter((r) => r.q && r.opts.length >= 2)
      .map((r) => ({ ...r, ans: Math.min(r.ans, r.opts.length - 1) }));

    setSaving(true);
    try {
      const res = await fetch("/api/admin/quiz", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(json.error ?? "Lưu thất bại.");
      setRows((json.questions ?? []).map((q: QuizQuestion) => ({ ...q, _id: uid() })));
      toast.success(`Đã lưu ${json.questions?.length ?? 0} câu. Có hiệu lực ngay.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-black text-foreground">
            <Brain className="size-6 text-pink-500" /> Quiz Free Fire
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Câu hỏi hiển thị trong Mini App (<b>/tg/quiz</b>). Bấm ô tròn để chọn đáp án đúng.
            Để trống danh sách sẽ dùng bộ câu mặc định.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving || loading}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Lưu ({rows.length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Đang tải…
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r, qi) => (
            <div key={r._id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start gap-2">
                <span className="mt-2 text-xs font-black text-muted-foreground">{qi + 1}.</span>
                <textarea
                  value={r.q}
                  onChange={(e) => patch(r._id, { q: e.target.value })}
                  placeholder="Nội dung câu hỏi…"
                  rows={2}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <button
                  onClick={() => setRows((rs) => rs.filter((x) => x._id !== r._id))}
                  className="mt-1 inline-flex size-9 items-center justify-center rounded-lg border border-border text-rose-500 transition-colors hover:bg-rose-500/10"
                  title="Xóa câu"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              <div className="mt-3 grid gap-2 pl-6 sm:grid-cols-2">
                {r.opts.map((opt, i) => {
                  const correct = r.ans === i;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <button
                        onClick={() => patch(r._id, { ans: i })}
                        title="Đánh dấu đáp án đúng"
                        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors"
                        style={{
                          borderColor: correct ? "#10b981" : "var(--border)",
                          backgroundColor: correct ? "#10b98122" : "transparent",
                        }}
                      >
                        {correct && <Check className="size-3.5 text-emerald-500" />}
                      </button>
                      <input
                        value={opt}
                        onChange={(e) => setOpt(r._id, i, e.target.value)}
                        placeholder={`Đáp án ${i + 1}`}
                        className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setRows((rs) => [...rs, emptyRow()])}
        disabled={loading}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-dashed border-border bg-card px-5 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
      >
        <Plus className="size-4" /> Thêm câu hỏi
      </button>
    </div>
  );
}
