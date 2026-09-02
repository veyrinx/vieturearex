"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckSquare, Loader2, Mail, Search, Send, Square, Users, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Recipient = {
  email: string;
  name: string | null;
  role: string | null;
  source: "user" | "newsletter";
};

/** Trần một lần bấm gửi — khớp với MAX_RECIPIENTS bên /api/admin/mail/send. */
const MAX_RECIPIENTS = 500;

type Filter = "all" | "user" | "newsletter";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "user", label: "Tài khoản" },
  { id: "newsletter", label: "Đăng ký nhận tin" },
];

/**
 * Soạn & gửi email cho nhiều người.
 *
 * Trước đây khối này nằm lọt trong /admin/settings — một trang dài gần 4000
 * dòng toàn ô cấu hình — và chỉ có đúng một ô text để tự gõ địa chỉ. Gửi cho
 * cả danh sách người dùng nghĩa là đi chép tay từng email.
 */
export function MailBlastPanel() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const [extra, setExtra] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch("/api/admin/mail/recipients")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { recipients?: Recipient[] } | null) => setRecipients(d?.recipients ?? []))
      .catch(() => toast.error("Không tải được danh sách người nhận."))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recipients.filter((r) => {
      if (filter !== "all" && r.source !== filter) return false;
      if (!q) return true;
      return r.email.includes(q) || (r.name ?? "").toLowerCase().includes(q) || (r.role ?? "").includes(q);
    });
  }, [recipients, query, filter]);

  const allVisibleSelected = visible.length > 0 && visible.every((r) => selected.has(r.email));

  /** Chọn/bỏ chọn đúng những dòng ĐANG hiện — lọc rồi bấm là chọn cả nhóm đó. */
  const toggleAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visible.forEach((r) => next.delete(r.email));
      else visible.forEach((r) => next.add(r.email));
      return next;
    });
  };

  const toggleOne = (email: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const extraEmails = useMemo(
    () =>
      extra
        .split(/[,;\n]+/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => /.+@.+\..+/.test(s)),
    [extra],
  );

  const finalList = useMemo(
    () => Array.from(new Set([...selected, ...extraEmails])),
    [selected, extraEmails],
  );

  const send = async () => {
    if (finalList.length === 0) {
      toast.error("Chưa chọn người nhận nào.");
      return;
    }
    if (finalList.length > MAX_RECIPIENTS) {
      toast.error(`Tối đa ${MAX_RECIPIENTS} người nhận mỗi lần gửi.`);
      return;
    }
    if (!subject.trim() || !body.trim()) {
      toast.error("Nhập tiêu đề và nội dung.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/admin/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: finalList.join(","),
          subject: subject.trim(),
          body: body.trim(),
          ...(ctaLabel.trim() && ctaUrl.trim()
            ? { cta_label: ctaLabel.trim(), cta_url: ctaUrl.trim() }
            : {}),
        }),
      });
      const d = (await res.json().catch(() => ({}))) as {
        ok?: boolean; sent?: number; total?: number; error?: string; errors?: string[];
      };
      if (res.ok && d.ok) {
        toast.success(
          `Đã gửi ${d.sent}/${d.total} email.` +
            (d.errors?.length ? " Một vài lô lỗi — xem lại cấu hình SMTP." : ""),
        );
        setSubject(""); setBody(""); setCtaLabel(""); setCtaUrl("");
        setSelected(new Set()); setExtra("");
      } else {
        toast.error(d.error ?? d.errors?.[0] ?? "Gửi thất bại. Kiểm tra cấu hình SMTP.");
      }
    } catch {
      toast.error("Lỗi kết nối khi gửi email.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* ── Chọn người nhận ─────────────────────────────────────────────── */}
      <Card className="flex min-h-0 flex-col gap-3 p-5">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-primary dark:text-amber-400" />
          <h2 className="font-heading text-base font-black uppercase tracking-tight">Người nhận</h2>
          <span className="ml-auto text-xs font-semibold text-muted-foreground">
            {selected.size}/{recipients.length} đã chọn
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest transition ${
                filter === f.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
              {f.id !== "all" && (
                <span className="ml-1 opacity-70">
                  {recipients.filter((r) => r.source === f.id).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo email, tên hoặc vai trò…"
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={toggleAllVisible} disabled={visible.length === 0}>
            {allVisibleSelected ? <Square className="mr-1.5 size-3.5" /> : <CheckSquare className="mr-1.5 size-3.5" />}
            {allVisibleSelected ? "Bỏ chọn" : "Chọn tất cả"}
            <span className="ml-1 opacity-70">({visible.length})</span>
          </Button>
          {selected.size > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              <X className="mr-1.5 size-3.5" /> Xoá lựa chọn
            </Button>
          )}
        </div>

        <div className="max-h-[420px] min-h-[180px] overflow-y-auto rounded-xl border border-border">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" /> Đang tải…
            </div>
          ) : visible.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Không có người nhận nào khớp.</p>
          ) : (
            <ul className="divide-y divide-border">
              {visible.map((r) => {
                const on = selected.has(r.email);
                return (
                  <li key={r.email}>
                    <button
                      type="button"
                      onClick={() => toggleOne(r.email)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-secondary/50"
                    >
                      <input type="checkbox" checked={on} readOnly className="size-4 accent-primary" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{r.name ?? r.email}</span>
                        {r.name && <span className="block truncate text-xs text-muted-foreground">{r.email}</span>}
                      </span>
                      <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {r.source === "newsletter" ? "Nhận tin" : (r.role ?? "user")}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Thêm địa chỉ ngoài danh sách
          </label>
          <Textarea
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            rows={2}
            placeholder="a@vd.com, b@vd.com — cách nhau bởi dấu phẩy hoặc xuống dòng"
          />
        </div>
      </Card>

      {/* ── Soạn nội dung ───────────────────────────────────────────────── */}
      <Card className="space-y-3 p-5">
        <div className="flex items-center gap-2">
          <Mail className="size-4 text-primary dark:text-amber-400" />
          <h2 className="font-heading text-base font-black uppercase tracking-tight">Nội dung</h2>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Tiêu đề</label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} placeholder="Tiêu đề email" />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Nội dung</label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            maxLength={10000}
            placeholder="Nội dung email. Xuống dòng được giữ nguyên."
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Nút bấm (tuỳ chọn)</label>
            <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} maxLength={60} placeholder="Xem ngay" />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Liên kết nút</label>
            <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://…" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
          <p className="text-sm text-muted-foreground">
            Gửi tới <strong className="text-foreground">{finalList.length}</strong> người
            {finalList.length > MAX_RECIPIENTS && (
              <span className="text-red-500"> — vượt trần {MAX_RECIPIENTS}</span>
            )}
          </p>
          <Button
            type="button"
            className="ml-auto"
            onClick={send}
            disabled={sending || finalList.length === 0 || finalList.length > MAX_RECIPIENTS}
          >
            {sending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Send className="mr-1.5 size-4" />}
            {sending ? "Đang gửi…" : "Gửi email"}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Người nhận được giấu nhau (BCC), gửi theo lô 50 địa chỉ mỗi lượt SMTP.
          Cấu hình SMTP và email thử vẫn ở <strong>Cài đặt → Email</strong>.
        </p>
      </Card>
    </div>
  );
}
