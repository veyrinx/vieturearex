"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BarChart2, Plus, Trash2, Lock, Unlock, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PollOption = { id: string; label: string; display_order: number };
type Poll = {
  id: string;
  question: string;
  entity_type: string | null;
  entity_id: string | null;
  status: "active" | "closed";
  ends_at: string | null;
  created_at: string;
  poll_options: PollOption[];
};

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

type CreateFormData = {
  question: string;
  options: string[];
  entity_type: "event" | "news" | "global";
  entity_id: string;
  ends_at: string;
};

function CreatePollForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateFormData>({
    question: "",
    options: ["", ""],
    entity_type: "global",
    entity_id: "",
    ends_at: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const addOption = () => {
    if (form.options.length >= 8) return;
    setForm((f) => ({ ...f, options: [...f.options, ""] }));
  };

  const removeOption = (i: number) => {
    if (form.options.length <= 2) return;
    setForm((f) => ({ ...f, options: f.options.filter((_, idx) => idx !== i) }));
  };

  const updateOption = (i: number, val: string) => {
    setForm((f) => {
      const opts = [...f.options];
      opts[i] = val;
      return { ...f, options: opts };
    });
  };

  const submit = async () => {
    const validOpts = form.options.map((o) => o.trim()).filter(Boolean);
    if (!form.question.trim() || validOpts.length < 2) {
      toast.error("Nhập câu hỏi và ít nhất 2 lựa chọn.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          question: form.question.trim(),
          options: validOpts,
          entity_type: form.entity_type,
          entity_id: form.entity_id.trim() || undefined,
          ends_at: form.ends_at || undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { toast.error(json.error ?? "Không thể tạo poll."); return; }
      toast.success("Đã tạo poll thành công.");
      setOpen(false);
      setForm({ question: "", options: ["", ""], entity_type: "global", entity_id: "", ends_at: "" });
      onCreated();
    } catch {
      toast.error("Lỗi mạng.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="gap-1.5 rounded-xl">
        <Plus className="size-4" /> Tạo Poll Mới
      </Button>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-sm font-bold uppercase tracking-widest">Tạo Poll Mới</h3>
        <button type="button" onClick={() => setOpen(false)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
          <X className="size-4" />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Câu hỏi *</label>
          <Input
            value={form.question}
            onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
            placeholder="VD: MVP tuần này là ai?"
            maxLength={200}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Loại</label>
            <select
              value={form.entity_type}
              onChange={(e) => setForm((f) => ({ ...f, entity_type: e.target.value as CreateFormData["entity_type"] }))}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
            >
              <option value="global">Toàn trang</option>
              <option value="event">Sự kiện</option>
              <option value="news">Tin tức</option>
            </select>
          </div>
          {form.entity_type !== "global" && (
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                {form.entity_type === "event" ? "Event ID" : "News ID"}
              </label>
              <Input
                value={form.entity_id}
                onChange={(e) => setForm((f) => ({ ...f, entity_id: e.target.value }))}
                placeholder="UUID..."
                className="font-mono text-xs"
              />
            </div>
          )}
        </div>

        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Ngày kết thúc (tùy chọn)</label>
          <Input
            type="datetime-local"
            value={form.ends_at}
            onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-muted-foreground block">Lựa chọn *</label>
          {form.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder={`Lựa chọn ${i + 1}`}
                maxLength={100}
              />
              {form.options.length > 2 && (
                <button type="button" onClick={() => removeOption(i)} className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 transition-colors">
                  <X className="size-4" />
                </button>
              )}
            </div>
          ))}
          {form.options.length < 8 && (
            <button type="button" onClick={addOption} className="text-xs text-primary dark:text-amber-400 hover:underline flex items-center gap-1">
              <Plus className="size-3" /> Thêm lựa chọn
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Hủy</Button>
        <Button onClick={submit} disabled={submitting} className="rounded-xl gap-1.5">
          <Plus className="size-4" />
          {submitting ? "Đang tạo..." : "Tạo Poll"}
        </Button>
      </div>
    </div>
  );
}

export function PollsAdminPanel() {
  const qc = useQueryClient();
  const [showAll, setShowAll] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-polls", showAll],
    queryFn: async () => {
      const url = showAll ? "/api/polls?active=false" : "/api/polls";
      const res = await fetch(url, { credentials: "same-origin" });
      if (!res.ok) return { polls: [] as Poll[] };
      return res.json() as Promise<{ polls: Poll[] }>;
    },
  });

  const polls = data?.polls ?? [];

  const toggleStatus = async (poll: Poll) => {
    const newStatus = poll.status === "active" ? "closed" : "active";
    try {
      const res = await fetch(`/api/polls/${poll.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) { toast.error("Không thể cập nhật."); return; }
      toast.success(newStatus === "active" ? "Đã mở lại poll." : "Đã đóng poll.");
      void qc.invalidateQueries({ queryKey: ["admin-polls"] });
    } catch { toast.error("Lỗi mạng."); }
  };

  const deletePoll = async (pollId: string) => {
    if (!confirm("Xác nhận xóa poll này?")) return;
    try {
      const res = await fetch(`/api/polls/${pollId}`, { method: "DELETE", credentials: "same-origin" });
      if (!res.ok) { toast.error("Không thể xóa."); return; }
      toast.success("Đã xóa poll.");
      void qc.invalidateQueries({ queryKey: ["admin-polls"] });
    } catch { toast.error("Lỗi mạng."); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <CreatePollForm onCreated={() => void qc.invalidateQueries({ queryKey: ["admin-polls"] })} />
        <Button variant="outline" onClick={() => void refetch()} className="gap-1.5 rounded-xl">
          <RefreshCw className="size-4" /> Làm mới
        </Button>
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAll ? "Chỉ hiện active" : "Hiện tất cả"}
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 w-full animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : polls.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
          <BarChart2 className="size-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Chưa có poll nào.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {polls.map((poll) => (
            <div key={poll.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm leading-snug">{poll.question}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border",
                      poll.status === "active"
                        ? "bg-green-500/10 border-green-500/30 text-green-500"
                        : "bg-muted border-border text-muted-foreground",
                    )}>
                      {poll.status === "active" ? "Active" : "Closed"}
                    </span>
                    {poll.entity_type && poll.entity_type !== "global" && (
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {poll.entity_type}: {poll.entity_id?.slice(0, 8)}...
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">{timeAgo(poll.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => void toggleStatus(poll)}
                    className={cn(
                      "flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
                      poll.status === "active"
                        ? "border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                        : "border-green-500/30 text-green-500 hover:bg-green-500/10",
                    )}
                    title={poll.status === "active" ? "Đóng poll" : "Mở lại"}
                  >
                    {poll.status === "active" ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => void deletePoll(poll.id)}
                    className="flex items-center gap-1 rounded-lg border border-rose-500/30 px-2.5 py-1.5 text-[11px] font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors"
                    title="Xóa poll"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {poll.poll_options
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((opt) => (
                    <span key={opt.id} className="inline-flex items-center rounded-lg border border-border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
                      {opt.label}
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
