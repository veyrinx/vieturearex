"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, BookOpen } from "lucide-react";

const WIKI_CATEGORIES = [
  "Tổng quan",
  "Nhân vật",
  "Vũ khí & Trang bị",
  "Bản đồ & Khu vực",
  "Chế độ chơi",
  "Sự kiện",
  "Chiến thuật",
  "Lịch sử & Lore",
  "Khác",
];

const inputCls =
  "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

type InitialData = {
  slug: string;
  title: string;
  content: string;
  excerpt?: string;
  category?: string;
  cover_url?: string;
};

type WikiEditorProps = {
  initialData?: InitialData;
  onSuccess: (slug: string) => void;
};

export function WikiEditor({ initialData, onSuccess }: WikiEditorProps) {
  const isEditing = !!initialData;

  const [title,    setTitle]    = useState(initialData?.title    ?? "");
  const [slug,     setSlug]     = useState(initialData?.slug     ?? "");
  const [category, setCategory] = useState(initialData?.category ?? "Tổng quan");
  const [excerpt,  setExcerpt]  = useState(initialData?.excerpt  ?? "");
  const [coverUrl, setCoverUrl] = useState(initialData?.cover_url ?? "");
  const [content,  setContent]  = useState(initialData?.content  ?? "");
  const [summary,  setSummary]  = useState("");
  const [slugManual, setSlugManual] = useState(isEditing);
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManual && title) {
      setSlug(slugify(title));
    }
  }, [title, slugManual]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !slug.trim()) {
      toast.error("Vui lòng điền đầy đủ tiêu đề, slug và nội dung.");
      return;
    }
    if (!/^[a-z0-9-]{3,80}$/.test(slug)) {
      toast.error("Slug chỉ gồm chữ thường, số và dấu gạch ngang (3-80 ký tự).");
      return;
    }
    if (content.length < 20) {
      toast.error("Nội dung phải có ít nhất 20 ký tự.");
      return;
    }

    setLoading(true);
    try {
      const url     = isEditing ? `/api/wiki/${initialData!.slug}` : "/api/wiki";
      const method  = isEditing ? "PUT" : "POST";
      const payload = {
        slug,
        title,
        content,
        excerpt:   excerpt || undefined,
        category,
        cover_url: coverUrl || undefined,
        ...(isEditing && { summary }),
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Đã có lỗi xảy ra.");
        return;
      }

      setSuccess(true);
      toast.success(isEditing ? "Đã cập nhật bài wiki!" : "Đã đăng bài wiki thành công!");
      onSuccess(isEditing ? initialData!.slug : (data.slug as string));
    } catch {
      toast.error("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/8 p-8 text-center">
        <BookOpen className="mx-auto mb-3 size-10 text-emerald-500" />
        <p className="font-heading text-lg font-bold text-emerald-600 dark:text-emerald-400">
          {isEditing ? "Bài đã được cập nhật!" : "Bài wiki đã được đăng!"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">Đang chuyển hướng...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Tiêu đề <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ví dụ: Hướng dẫn sử dụng nhân vật Alok"
          className={inputCls}
          maxLength={200}
          required
        />
      </div>

      {/* Slug */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Slug (URL) <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={slug}
            onChange={(e) => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setSlugManual(true); }}
            placeholder="huong-dan-su-dung-alok"
            className={inputCls}
            maxLength={80}
            required
            disabled={isEditing}
          />
          {!isEditing && (
            <button
              type="button"
              onClick={() => { setSlug(slugify(title)); setSlugManual(false); }}
              className="shrink-0 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
            >
              Tự động
            </button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">
          URL sẽ là: <span className="font-mono text-foreground">/wiki/{slug || "..."}</span>
        </p>
      </div>

      {/* Category + Cover URL */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Danh mục
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputCls}
          >
            {WIKI_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ảnh bìa (URL)
          </label>
          <input
            type="url"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="https://example.com/cover.jpg"
            className={inputCls}
          />
        </div>
      </div>

      {/* Excerpt */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Mô tả ngắn (tối đa 300 ký tự)
        </label>
        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Tóm tắt nội dung bài viết..."
          rows={2}
          maxLength={300}
          className={`${inputCls} resize-none`}
        />
      </div>

      {/* Content */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Nội dung <span className="text-red-500">*</span>
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={"Viết nội dung bài wiki...\n\nGợi ý: Bạn có thể dùng xuống dòng để phân đoạn.\n# Tiêu đề chính\n## Tiêu đề phụ\n**In đậm**, *in nghiêng*"}
          rows={10}
          className={`${inputCls} resize-y font-mono text-sm`}
          required
        />
        <p className="text-[10px] text-muted-foreground">
          Hỗ trợ định dạng Markdown cơ bản. Tối thiểu 20 ký tự.
        </p>
      </div>

      {/* Edit summary (only when editing) */}
      {isEditing && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tóm tắt chỉnh sửa
          </label>
          <input
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Mô tả ngắn về những gì bạn đã thay đổi..."
            className={inputCls}
            maxLength={300}
          />
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          {loading
            ? (isEditing ? "Đang lưu..." : "Đang đăng...")
            : (isEditing ? "Lưu thay đổi" : "Đăng bài Wiki")}
        </button>
      </div>
    </form>
  );
}
