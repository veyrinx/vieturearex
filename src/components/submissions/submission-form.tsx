"use client";

import { useState } from "react";
import { Send, CheckCircle, AlertCircle, Loader2, ChevronDown } from "lucide-react";

const CATEGORIES = [
  "Sự kiện",
  "Cộng đồng",
  "Esports",
  "Hướng dẫn",
  "Tin tức",
  "Giải đấu",
  "Nhân vật & Vũ khí",
  "Cập nhật game",
  "Khác",
];

type FormState = {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  cover_url: string;
  author_name: string;
  author_email: string;
  notes: string;
};

const EMPTY: FormState = {
  title: "", excerpt: "", content: "", category: "Cộng đồng",
  cover_url: "", author_name: "", author_email: "", notes: "",
};

export function SubmissionForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Có lỗi xảy ra.");
        setStatus("error");
        return;
      }
      setStatus("success");
      setForm(EMPTY);
    } catch {
      setErrorMsg("Không thể kết nối, vui lòng thử lại.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/8 p-10 text-center space-y-4">
        <CheckCircle className="mx-auto size-12 text-emerald-500" />
        <h2 className="font-heading text-xl font-black uppercase tracking-wide text-foreground">
          Bài viết đã được gửi!
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Cảm ơn bạn đã đóng góp cho cộng đồng Arex. Ban biên tập sẽ xem xét và liên hệ qua email trong vòng <strong className="text-foreground">2–5 ngày làm việc</strong>.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-2 inline-flex items-center rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          Gửi bài viết khác
        </button>
      </div>
    );
  }

  const inputCls = "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus:border-primary focus:outline-none dark:focus:border-amber-400";
  const labelCls = "block text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground mb-1.5";
  const required = <span className="text-destructive ml-0.5">*</span>;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tiêu đề */}
      <div>
        <label className={labelCls}>Tiêu đề bài viết {required}</label>
        <input
          type="text"
          value={form.title}
          onChange={set("title")}
          required
          minLength={10}
          maxLength={200}
          placeholder="Tiêu đề hấp dẫn, rõ ràng (tối thiểu 10 ký tự)"
          className={inputCls}
        />
      </div>

      {/* Danh mục */}
      <div>
        <label className={labelCls}>Danh mục {required}</label>
        <div className="relative">
          <select
            value={form.category}
            onChange={set("category")}
            required
            className={`${inputCls} appearance-none pr-10`}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      {/* Tóm tắt */}
      <div>
        <label className={labelCls}>Tóm tắt nội dung {required}</label>
        <textarea
          value={form.excerpt}
          onChange={set("excerpt")}
          required
          minLength={30}
          maxLength={500}
          rows={3}
          placeholder="Mô tả ngắn gọn nội dung bài viết (30–500 ký tự)"
          className={inputCls}
        />
        <p className="mt-1 text-[11px] text-muted-foreground/60">{form.excerpt.length}/500 ký tự</p>
      </div>

      {/* Nội dung */}
      <div>
        <label className={labelCls}>Nội dung bài viết {required}</label>
        <textarea
          value={form.content}
          onChange={set("content")}
          required
          minLength={100}
          rows={14}
          placeholder="Viết nội dung đầy đủ tại đây. Hỗ trợ định dạng HTML cơ bản: <b>, <i>, <ul>, <ol>, <li>, <a href='...'>, <img src='...'>"
          className={`${inputCls} font-mono text-xs`}
        />
        <p className="mt-1 text-[11px] text-muted-foreground/60">{form.content.length.toLocaleString()} ký tự (tối thiểu 100)</p>
      </div>

      {/* Ảnh bìa */}
      <div>
        <label className={labelCls}>URL ảnh bìa</label>
        <input
          type="url"
          value={form.cover_url}
          onChange={set("cover_url")}
          placeholder="https://example.com/image.jpg (không bắt buộc)"
          className={inputCls}
        />
      </div>

      {/* Tác giả */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Tên tác giả {required}</label>
          <input
            type="text"
            value={form.author_name}
            onChange={set("author_name")}
            required
            minLength={2}
            maxLength={100}
            placeholder="Tên hiển thị của bạn"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Email liên hệ {required}</label>
          <input
            type="email"
            value={form.author_email}
            onChange={set("author_email")}
            required
            placeholder="email@example.com"
            className={inputCls}
          />
          <p className="mt-1 text-[11px] text-muted-foreground/60">Chỉ dùng để liên hệ, không hiển thị công khai</p>
        </div>
      </div>

      {/* Ghi chú */}
      <div>
        <label className={labelCls}>Ghi chú cho ban biên tập</label>
        <textarea
          value={form.notes}
          onChange={set("notes")}
          rows={3}
          maxLength={1000}
          placeholder="Bất kỳ ghi chú nào bạn muốn chia sẻ với đội ngũ biên tập (không bắt buộc)"
          className={inputCls}
        />
      </div>

      {/* Error */}
      {status === "error" && (
        <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{errorMsg}</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground">
          {required} Bắt buộc. Bằng cách gửi bài, bạn đồng ý với{" "}
          <a href="/terms-of-use" className="underline hover:text-primary">Điều khoản sử dụng</a>.
        </p>
        <button
          type="submit"
          disabled={status === "loading"}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {status === "loading" ? (
            <><Loader2 className="size-4 animate-spin" /> Đang gửi...</>
          ) : (
            <><Send className="size-4" /> Gửi bài viết</>
          )}
        </button>
      </div>
    </form>
  );
}
