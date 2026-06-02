"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Loader2, BookOpen, Tag, FileText, Link2, ImageIcon,
  RefreshCw, CheckCircle2, X,
} from "lucide-react";
import { ForumEditor } from "@/components/forum/forum-editor";
import { ImageUploadButton } from "@/components/common/image-upload-button";

const WIKI_CATEGORIES = [
  "Tổng quan", "Nhân vật", "Vũ khí & Trang bị",
  "Bản đồ & Khu vực", "Chế độ chơi", "Sự kiện",
  "Chiến thuật", "Lịch sử & Lore", "Khác",
];

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

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
      {children}
      {required && <span className="text-red-500 normal-case tracking-normal">*</span>}
    </label>
  );
}

function SectionCard({ title, icon: Icon, children }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-3">
        <Icon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
          {title}
        </span>
      </div>
      <div className="p-5 space-y-4">
        {children}
      </div>
    </div>
  );
}

export function WikiEditor({ initialData, onSuccess }: WikiEditorProps) {
  const isEditing = !!initialData;

  const [title,      setTitle]      = useState(initialData?.title      ?? "");
  const [slug,       setSlug]       = useState(initialData?.slug       ?? "");
  const [category,   setCategory]   = useState(initialData?.category   ?? "Tổng quan");
  const [excerpt,    setExcerpt]    = useState(initialData?.excerpt     ?? "");
  const [coverUrl,   setCoverUrl]   = useState(initialData?.cover_url  ?? "");
  const [content,    setContent]    = useState(initialData?.content    ?? "");
  const [summary,    setSummary]    = useState("");
  const [slugManual, setSlugManual] = useState(isEditing);
  const [loading,    setLoading]    = useState(false);
  const [success,    setSuccess]    = useState(false);

  useEffect(() => {
    if (!slugManual && title) setSlug(slugify(title));
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
    const textContent = content.replace(/<[^>]*>/g, "").trim();
    if (textContent.length < 20) {
      toast.error("Nội dung phải có ít nhất 20 ký tự.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(isEditing ? `/api/wiki/${initialData!.slug}` : "/api/wiki", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug, title, content,
          excerpt: excerpt || undefined,
          category,
          cover_url: coverUrl || undefined,
          ...(isEditing && { summary }),
        }),
      });

      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Đã có lỗi xảy ra."); return; }

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
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/8 p-10 text-center space-y-3">
        <div className="flex size-16 mx-auto items-center justify-center rounded-full bg-emerald-500/15">
          <CheckCircle2 className="size-8 text-emerald-500" />
        </div>
        <p className="font-heading text-xl font-bold text-emerald-600 dark:text-emerald-400">
          {isEditing ? "Bài đã được cập nhật!" : "Bài wiki đã được đăng!"}
        </p>
        <p className="text-sm text-muted-foreground">Đang chuyển hướng...</p>
      </div>
    );
  }

  const contentLength = content.replace(/<[^>]*>/g, "").length;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Section 1: Thông tin cơ bản */}
      <SectionCard title="Thông tin cơ bản" icon={FileText}>
        {/* Title */}
        <div className="space-y-1.5">
          <FieldLabel required><FileText className="size-3.5" /> Tiêu đề</FieldLabel>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ví dụ: Hướng dẫn sử dụng nhân vật Alok"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium placeholder:text-muted-foreground/60 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
            maxLength={200}
            required
          />
          <p className="text-[10px] text-muted-foreground text-right">{title.length}/200</p>
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <FieldLabel><Tag className="size-3.5" /> Danh mục</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {WIKI_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={[
                  "rounded-full px-3.5 py-1.5 text-xs font-bold transition-all",
                  category === c
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "border border-border bg-muted/50 text-muted-foreground hover:border-emerald-500/40 hover:text-foreground",
                ].join(" ")}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Excerpt */}
        <div className="space-y-1.5">
          <FieldLabel><FileText className="size-3.5" /> Mô tả ngắn</FieldLabel>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value.slice(0, 300))}
            placeholder="Tóm tắt nội dung bài viết để người đọc biết bài viết nói về gì..."
            rows={2}
            className="w-full resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
          />
          <p className="text-[10px] text-muted-foreground text-right">{excerpt.length}/300</p>
        </div>
      </SectionCard>

      {/* Section 2: URL & Ảnh bìa */}
      <SectionCard title="URL & Ảnh bìa" icon={Link2}>
        {/* Slug */}
        <div className="space-y-1.5">
          <FieldLabel required><Link2 className="size-3.5" /> Slug (URL)</FieldLabel>
          <div className="flex gap-2">
            <div className="flex flex-1 items-center overflow-hidden rounded-xl border border-border bg-background focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
              <span className="shrink-0 px-3 text-xs text-muted-foreground font-mono select-none border-r border-border bg-muted/30 py-3">/wiki/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setSlugManual(true); }}
                placeholder="ten-bai-viet"
                className="flex-1 bg-transparent px-3 py-3 text-sm font-mono focus:outline-none"
                maxLength={80}
                required
                disabled={isEditing}
              />
            </div>
            {!isEditing && (
              <button
                type="button"
                onClick={() => { setSlug(slugify(title)); setSlugManual(false); }}
                title="Tạo tự động từ tiêu đề"
                className="flex items-center gap-1.5 rounded-xl border border-border bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground hover:border-emerald-500/40 hover:text-foreground transition-colors"
              >
                <RefreshCw className="size-3.5" /> Tự động
              </button>
            )}
          </div>
          {slug && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <span>URL: </span>
              <span className="font-mono text-foreground">/wiki/{slug}</span>
            </p>
          )}
        </div>

        {/* Cover image */}
        <div className="space-y-2">
          <FieldLabel><ImageIcon className="size-3.5" /> Ảnh bìa</FieldLabel>
          <div className="flex gap-2">
            <input
              type="url"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://example.com/cover.jpg"
              className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
            />
            <ImageUploadButton
              onUploaded={(url) => setCoverUrl(url)}
              bucket="wiki"
              label="Tải lên"
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            />
          </div>
          {coverUrl && (
            <div className="relative overflow-hidden rounded-xl border border-border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverUrl} alt="Cover preview" className="h-32 w-full object-cover" onError={() => setCoverUrl("")} />
              <button
                type="button"
                onClick={() => setCoverUrl("")}
                className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Section 3: Nội dung */}
      <SectionCard title="Nội dung bài viết" icon={BookOpen}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <FieldLabel required><BookOpen className="size-3.5" /> Nội dung</FieldLabel>
            <span className={`text-[10px] font-semibold ${contentLength < 20 ? "text-red-400" : "text-muted-foreground"}`}>
              {contentLength} ký tự{contentLength < 20 ? ` (cần thêm ${20 - contentLength})` : ""}
            </span>
          </div>
          <div className="rounded-xl border border-border overflow-hidden focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
            <ForumEditor
              value={content}
              onChange={setContent}
              placeholder="Viết nội dung bài wiki... Hỗ trợ in đậm, tiêu đề, danh sách, bảng, liên kết và ảnh."
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Hỗ trợ định dạng rich text — bold, italic, heading, list, table, link, image.
          </p>
        </div>
      </SectionCard>

      {/* Edit summary (only when editing) */}
      {isEditing && (
        <SectionCard title="Tóm tắt chỉnh sửa" icon={FileText}>
          <div className="space-y-1.5">
            <FieldLabel><FileText className="size-3.5" /> Mô tả thay đổi</FieldLabel>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Mô tả ngắn về những gì bạn đã thay đổi..."
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
              maxLength={300}
            />
          </div>
        </SectionCard>
      )}

      {/* Submit */}
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4">
        <p className="text-xs text-muted-foreground">
          {isEditing
            ? "Bài sẽ được kiểm duyệt sau khi chỉnh sửa."
            : "Bài sẽ được kiểm duyệt trước khi xuất bản. Bạn nhận +10đ sau khi duyệt."}
        </p>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
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
